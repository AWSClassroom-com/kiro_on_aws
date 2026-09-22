import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import {
  BedrockRuntimeClient,
  ConverseCommand,
  type ContentBlock,
  type Message,
  type Tool,
} from "@aws-sdk/client-bedrock-runtime";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

/**
 * MealRecommendationAgent, running on Amazon Bedrock AgentCore Runtime.
 *
 * AgentCore Runtime hosts any HTTP server that implements two endpoints:
 *   GET  /ping         a health check
 *   POST /invocations  one turn of conversation
 *
 * Everything else in this file is the agent itself: a tool-calling loop over
 * the Bedrock Converse API. It replaces the Bedrock Agents Classic service,
 * which ran the same loop for us but is in maintenance mode and rejects
 * CreateAgent for accounts without prior usage.
 *
 * Two files define the agent's behaviour, and they are the same two files the
 * Classic agent used. You edit them in Lab 3; this code only reads them.
 *   agent-instructions.md  the system prompt
 *   openapi.json           the tools, one per operation
 */

const PORT = 8080;
const MODEL_ID = "global.anthropic.claude-sonnet-4-6";

/** How many times the model may call tools before we stop and answer anyway. */
const MAX_TOOL_ROUNDS = 6;

/** Messages kept per session. Older turns fall off the front. */
const MAX_HISTORY = 20;

const bedrock = new BedrockRuntimeClient();
const lambda = new LambdaClient();

const TOOLS_FUNCTION_NAME = process.env.TOOLS_FUNCTION_NAME;
const ACTION_GROUP_NAME = process.env.ACTION_GROUP_NAME ?? "FoodEntryTools";

// The construct copies both authoring files into the deployment package next
// to this file, so they are read from disk at startup rather than inlined at
// build time. Editing either one and redeploying changes the agent.
const systemPrompt = readFileSync(join(__dirname, "agent-instructions.md"), "utf-8").trim();
const openApiSpec = JSON.parse(readFileSync(join(__dirname, "openapi.json"), "utf-8"));

// ---------------------------------------------------------------------------
// Tools, derived from openapi.json
// ---------------------------------------------------------------------------

interface OpenApiParameter {
  name: string;
  required?: boolean;
  description?: string;
  schema?: { type?: string; default?: unknown; minimum?: number };
}

interface OpenApiOperation {
  operationId: string;
  summary?: string;
  description?: string;
  parameters?: OpenApiParameter[];
}

/**
 * One property of a tool's input schema.
 *
 * Declared as a type alias rather than an interface on purpose: the Converse
 * API types the schema as a Smithy document, and TypeScript only infers the
 * implicit index signature that document requires for type aliases.
 */
type SchemaProperty = { type: string; description: string };

/** One tool, plus the routing information the tools Lambda needs. */
interface ToolBinding {
  spec: Tool;
  apiPath: string;
  httpMethod: string;
  parameterTypes: Record<string, string>;
}

/**
 * Convert the OpenAPI document into Converse tool specifications.
 *
 * Bedrock Agents Classic accepted the OpenAPI document directly. The Converse
 * API wants a JSON Schema per tool, so the shapes are translated here. The
 * operationId becomes the tool name, which is why Lab 3 requires the two
 * operation IDs to stay as they are.
 */
function buildToolBindings(): ToolBinding[] {
  const bindings: ToolBinding[] = [];

  for (const [apiPath, pathItem] of Object.entries(openApiSpec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem as Record<string, OpenApiOperation>)) {
      const properties: Record<string, SchemaProperty> = {};
      const required: string[] = [];
      const parameterTypes: Record<string, string> = {};

      for (const parameter of operation.parameters ?? []) {
        const type = parameter.schema?.type ?? "string";
        properties[parameter.name] = { type, description: parameter.description ?? "" };
        parameterTypes[parameter.name] = type;
        if (parameter.required) required.push(parameter.name);
      }

      bindings.push({
        spec: {
          toolSpec: {
            name: operation.operationId,
            description: operation.description ?? operation.summary,
            inputSchema: { json: { type: "object", properties, required } },
          },
        },
        apiPath,
        httpMethod: method.toUpperCase(),
        parameterTypes,
      });
    }
  }

  return bindings;
}

const toolBindings = buildToolBindings();
const toolsByName = new Map(toolBindings.map((b) => [b.spec.toolSpec?.name ?? "", b]));

/**
 * Call the tools Lambda.
 *
 * The Lambda is unchanged from the Classic design, so it still expects the
 * Bedrock action-group event shape and still echoes actionGroup, apiPath and
 * httpMethod back. Building that event here is what keeps the migration
 * confined to the agent.
 */
async function callTool(binding: ToolBinding, input: Record<string, unknown>): Promise<string> {
  if (!TOOLS_FUNCTION_NAME) {
    return JSON.stringify({ error: "TOOLS_FUNCTION_NAME is not configured" });
  }

  const parameters = Object.entries(input ?? {}).map(([name, value]) => ({
    name,
    value: String(value),
    type: binding.parameterTypes[name] ?? "string",
  }));

  const event = {
    messageVersion: "1.0",
    actionGroup: ACTION_GROUP_NAME,
    apiPath: binding.apiPath,
    httpMethod: binding.httpMethod,
    parameters,
    sessionAttributes: {},
    promptSessionAttributes: {},
  };

  const invocation = await lambda.send(
    new InvokeCommand({
      FunctionName: TOOLS_FUNCTION_NAME,
      Payload: Buffer.from(JSON.stringify(event)),
    }),
  );

  if (!invocation.Payload) return JSON.stringify({ error: "Tool returned no payload" });

  const parsed = JSON.parse(Buffer.from(invocation.Payload).toString("utf-8"));
  const body = parsed?.response?.responseBody?.["application/json"]?.body;
  return typeof body === "string" ? body : JSON.stringify(parsed);
}

// ---------------------------------------------------------------------------
// The agent loop
// ---------------------------------------------------------------------------

/** Conversation history per session, so follow-up questions have context. */
const sessions = new Map<string, Message[]>();

function textOf(content: ContentBlock[] | undefined): string {
  return (content ?? [])
    .map((block) => ("text" in block ? block.text : ""))
    .filter(Boolean)
    .join("\n")
    .trim();
}

/**
 * Run one turn: send the conversation to the model, execute any tools it asks
 * for, and repeat until it answers in prose or hits MAX_TOOL_ROUNDS.
 */
async function runTurn(prompt: string, sessionId: string): Promise<string> {
  const history = sessions.get(sessionId) ?? [];
  const messages: Message[] = [...history, { role: "user", content: [{ text: prompt }] }];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: systemPrompt }],
        messages,
        toolConfig: { tools: toolBindings.map((b) => b.spec) },
      }),
    );

    const reply = response.output?.message;
    if (!reply) break;
    messages.push(reply);

    if (response.stopReason !== "tool_use") {
      const answer = textOf(reply.content);
      sessions.set(sessionId, messages.slice(-MAX_HISTORY));
      return answer;
    }

    // The model asked for one or more tools. Run them and hand back the results.
    const toolResults: ContentBlock[] = [];

    for (const block of reply.content ?? []) {
      if (!("toolUse" in block) || !block.toolUse) continue;

      const { toolUseId, name, input } = block.toolUse;
      const binding = name ? toolsByName.get(name) : undefined;

      const result = binding
        ? await callTool(binding, (input ?? {}) as Record<string, unknown>)
        : JSON.stringify({ error: `Unknown tool: ${name}` });

      toolResults.push({
        toolResult: {
          toolUseId,
          content: [{ text: result }],
          status: binding ? "success" : "error",
        },
      });
    }

    messages.push({ role: "user", content: toolResults });
  }

  sessions.set(sessionId, messages.slice(-MAX_HISTORY));
  return "I could not finish working that out. Please try asking again.";
}

// ---------------------------------------------------------------------------
// The AgentCore Runtime service contract
// ---------------------------------------------------------------------------

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/ping") {
    sendJson(res, 200, { status: "Healthy" });
    return;
  }

  if (req.method === "POST" && req.url === "/invocations") {
    try {
      const raw = await readBody(req);
      const input = raw ? JSON.parse(raw) : {};

      // AgentCore passes the caller's session id as a header. The body is a
      // fallback so the agent can be run and tested locally on port 8080.
      const sessionId =
        (req.headers["x-amzn-bedrock-agentcore-runtime-session-id"] as string | undefined) ??
        input.sessionId ??
        "local";

      const prompt = input.prompt;
      if (typeof prompt !== "string" || prompt.trim() === "") {
        sendJson(res, 400, { error: "A non-empty prompt is required" });
        return;
      }

      const completion = await runTurn(prompt, sessionId);
      sendJson(res, 200, { sessionId, completion });
    } catch (error) {
      console.error("Invocation failed:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      sendJson(res, 500, { error: message });
    }
    return;
  }

  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`MealRecommendationAgent listening on ${PORT} with ${toolBindings.length} tools`);
});

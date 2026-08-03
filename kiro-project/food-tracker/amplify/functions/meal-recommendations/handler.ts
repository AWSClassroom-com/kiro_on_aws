import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// The Lambda execution role supplies credentials via the SDK's default chain.
const docClient = DynamoDBDocumentClient.from(new DynamoDBClient());

/** Bedrock Agent action-group invocation event (the subset this handler uses). */
interface BedrockAgentEvent {
  messageVersion: string;
  actionGroup: string;
  apiPath: string;
  httpMethod: string;
  parameters?: { name: string; value: string; type: string }[];
  sessionAttributes?: Record<string, string>;
  promptSessionAttributes?: Record<string, string>;
}

interface BedrockAgentResponse {
  messageVersion: string;
  response: {
    actionGroup: string;
    apiPath: string;
    httpMethod: string;
    httpStatusCode: number;
    responseBody: { "application/json": { body: string } };
  };
  sessionAttributes: Record<string, string>;
  promptSessionAttributes: Record<string, string>;
}

/**
 * Every response must ECHO actionGroup, apiPath, and httpMethod from the
 * incoming event; Bedrock rejects mismatches with a DependencyFailedException.
 */
function buildResponse(
  event: BedrockAgentEvent,
  httpStatusCode: number,
  body: unknown,
): BedrockAgentResponse {
  return {
    messageVersion: event.messageVersion ?? "1.0",
    response: {
      actionGroup: event.actionGroup,
      apiPath: event.apiPath,
      httpMethod: event.httpMethod,
      httpStatusCode,
      responseBody: { "application/json": { body: JSON.stringify(body) } },
    },
    sessionAttributes: event.sessionAttributes ?? {},
    promptSessionAttributes: event.promptSessionAttributes ?? {},
  };
}

/** Read a positive integer "days" parameter from the agent event, with a fallback. */
function getDaysParameter(event: BedrockAgentEvent, fallback: number): number {
  const parameter = event.parameters?.find((p) => p.name === "days");
  const value = parameter ? Number(parameter.value) : Number.NaN;
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export const handler = async (event: BedrockAgentEvent): Promise<BedrockAgentResponse> => {
  const tableName = process.env.FOOD_ITEM_TABLE_NAME;
  if (!tableName) {
    return buildResponse(event, 500, { error: "FOOD_ITEM_TABLE_NAME is not configured" });
  }

  try {
    if (event.apiPath === "/getRecentEntries") {
      const days = getDaysParameter(event, 7);
      const cutoff = new Date(Date.now() - days * DAY_MS).toISOString();
      const result = await docClient.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: "addedAt >= :cutoff",
          ExpressionAttributeValues: { ":cutoff": cutoff },
        }),
      );
      return buildResponse(event, 200, { days, entries: result.Items ?? [] });
    }

    if (event.apiPath === "/findExpiringSoon") {
      const days = getDaysParameter(event, 3);
      const now = new Date().toISOString();
      const cutoff = new Date(Date.now() + days * DAY_MS).toISOString();
      const result = await docClient.send(
        new ScanCommand({
          TableName: tableName,
          FilterExpression: "expirationDate BETWEEN :now AND :cutoff",
          ExpressionAttributeValues: { ":now": now, ":cutoff": cutoff },
        }),
      );
      return buildResponse(event, 200, { days, entries: result.Items ?? [] });
    }

    return buildResponse(event, 404, { error: `Unknown apiPath: ${event.apiPath}` });
  } catch (error) {
    console.error("meal-recommendations handler failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return buildResponse(event, 500, { error: message });
  }
};

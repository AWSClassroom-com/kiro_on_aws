/**
 * Bedrock connectivity smoke test.
 *
 * Verifies your AWS credentials can invoke the class's Claude model
 * before you build anything on top of it (Lab 2 prerequisite).
 *
 * Run:                 npx tsx scripts/test-bedrock.ts
 * Different model ID:  npx tsx scripts/test-bedrock.ts <model-or-inference-profile-id>
 */
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

const modelId = process.argv[2] ?? "global.anthropic.claude-sonnet-4-5-20250929-v1:0";

// The AWS SDK default credential chain picks up your aws login session.
const client = new BedrockRuntimeClient();

const response = await client.send(
  new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    body: JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: 100,
      messages: [{ role: "user", content: "Say hello in one short sentence." }],
    }),
  }),
);

console.log(JSON.parse(new TextDecoder().decode(response.body)).content[0].text);

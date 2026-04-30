import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { CfnOutput, Stack } from "aws-cdk-lib";

import { data } from "./data/resource";
import { nutritionSummaryFunction } from "./functions/nutrition-summary/resource";
import { mealRecommendationsFunction } from "./functions/meal-recommendations/resource";
import { invokeMealAgentFunction } from "./functions/invoke-meal-agent/resource";

const backend = defineBackend({
	data,
	nutritionSummaryFunction,
	mealRecommendations: mealRecommendationsFunction,
	invokeMealAgent: invokeMealAgentFunction,
});

// ---------------------------------------------------------------------------
// nutritionSummaryFunction — Bedrock model access
// ---------------------------------------------------------------------------

backend.nutritionSummaryFunction.resources.lambda.addToRolePolicy(
	new PolicyStatement({
		actions: ["bedrock:InvokeModel"],
		resources: [
			"arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
			"arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
		],
	}),
);

// ---------------------------------------------------------------------------
// mealRecommendations — DynamoDB access + Bedrock Agent invocation permission
// ---------------------------------------------------------------------------

// Look up the FoodItem table created by the data resource
const foodItemTable = backend.data.resources.tables["FoodItem"];

// Pass the table name into the Lambda as an environment variable
backend.mealRecommendations.addEnvironment(
	"FOOD_ITEM_TABLE_NAME",
	foodItemTable.tableName,
);

// Grant the Lambda read access to the FoodItem table
foodItemTable.grantReadData(backend.mealRecommendations.resources.lambda);

// Allow the Bedrock service to invoke this Lambda (required for Bedrock Agent action groups)
backend.mealRecommendations.resources.lambda.addPermission(
	"AllowBedrockInvoke",
	{
		principal: new ServicePrincipal("bedrock.amazonaws.com"),
		action: "lambda:InvokeFunction",
	},
);

// Output the ARN so students can easily find their own function
new CfnOutput(
	backend.mealRecommendations.resources.lambda.stack,
	"MealRecommendationsLambdaArn",
	{
		value: backend.mealRecommendations.resources.lambda.functionArn,
		description: "ARN of the meal-recommendations Lambda function",
		exportName: `${backend.mealRecommendations.resources.lambda.stack.stackName}-MealRecommendationsArn`,
	},
);

// ---------------------------------------------------------------------------
// invokeMealAgent — Bedrock Agent invocation
// ---------------------------------------------------------------------------

const agentId = "0PFG4K6M5I";
const aliasId = "VBFPV7MGRM";

// Set environment variables so the Lambda handler can read them at runtime
backend.invokeMealAgent.addEnvironment("AGENT_ID", agentId);
backend.invokeMealAgent.addEnvironment("AGENT_ALIAS_ID", aliasId);

// Construct the agent alias ARN at synth time — no hardcoded account or region
const { region, account } = Stack.of(
	backend.invokeMealAgent.resources.lambda,
);
const agentAliasArn = `arn:aws:bedrock:${region}:${account}:agent-alias/${agentId}/${aliasId}`;

// Grant the Lambda permission to invoke the Bedrock Agent
backend.invokeMealAgent.resources.lambda.addToRolePolicy(
	new PolicyStatement({
		actions: ["bedrock:InvokeAgent"],
		resources: [agentAliasArn],
	}),
);

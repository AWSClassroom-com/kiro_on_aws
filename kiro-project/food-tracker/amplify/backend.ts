import { defineBackend } from "@aws-amplify/backend";
import { PolicyStatement } from "aws-cdk-lib/aws-iam";

import { data } from "./data/resource";
import { nutritionSummaryFunction } from "./functions/nutrition-summary/resource";

const backend = defineBackend({
	data,
	nutritionSummaryFunction,
});

backend.nutritionSummaryFunction.resources.lambda.addToRolePolicy(
	new PolicyStatement({
		actions: ["bedrock:InvokeModel"],
		resources: [
			"arn:aws:bedrock:*::foundation-model/anthropic.claude-sonnet-4-5-20250929-v1:0",
			"arn:aws:bedrock:*:*:inference-profile/us.anthropic.claude-sonnet-4-5-20250929-v1:0",
		],
	}),
);

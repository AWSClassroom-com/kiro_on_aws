import { defineFunction } from "@aws-amplify/backend";

export const invokeMealAgentFunction = defineFunction({
	name: "invoke-meal-agent",
	entry: "./handler.ts",
	timeoutSeconds: 60,
	resourceGroupName: "data",
});

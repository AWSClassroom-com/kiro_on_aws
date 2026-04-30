import { defineFunction } from "@aws-amplify/backend";

export const nutritionSummaryFunction = defineFunction({
	name: "nutrition-summary",
	entry: "./handler.ts",
	timeoutSeconds: 30,
});

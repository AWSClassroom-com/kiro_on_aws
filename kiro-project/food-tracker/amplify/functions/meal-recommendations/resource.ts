import { defineFunction } from "@aws-amplify/backend";

export const mealRecommendationsFunction = defineFunction({
	name: "meal-recommendations",
	entry: "./handler.ts",
	timeoutSeconds: 30,
	resourceGroupName: "data",
});

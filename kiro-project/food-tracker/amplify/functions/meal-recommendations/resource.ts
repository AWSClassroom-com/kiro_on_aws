import { defineFunction } from "@aws-amplify/backend";

export const mealRecommendations = defineFunction({
  name: "meal-recommendations",
  entry: "./handler.ts",
  timeoutSeconds: 30,
  // The function reads from the FoodItem table, so it belongs to the data stack.
  resourceGroupName: "data",
});

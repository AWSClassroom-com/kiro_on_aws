import { defineBackend } from "@aws-amplify/backend";
import { Stack } from "aws-cdk-lib";
import { auth } from "./auth/resource";
import { MealAgent } from "./custom/meal-agent";
import { data } from "./data/resource";
import { mealRecommendations } from "./functions/meal-recommendations/resource";

const backend = defineBackend({
  auth,
  data,
  mealRecommendations,
});

// Wire the meal-recommendations Lambda to the FoodItem table.
const foodItemTable = backend.data.resources.tables.FoodItem;
backend.mealRecommendations.addEnvironment("FOOD_ITEM_TABLE_NAME", foodItemTable.tableName);
foodItemTable.grantReadData(backend.mealRecommendations.resources.lambda);

// Deploy the MealRecommendationAgent (Bedrock Agent) from code, scoped into
// the data stack so every reference stays within one stack (a separate stack
// creates a circular cross-stack dependency once Lab 4 wires agent IDs into a
// data-schema Lambda). Lab 3 studies this construct; Lab 4 wires the chat to it.
const mealAgent = new MealAgent(
  Stack.of(backend.data.resources.graphqlApi),
  "MealAgent",
  { toolsFunction: backend.mealRecommendations.resources.lambda },
);
void mealAgent;

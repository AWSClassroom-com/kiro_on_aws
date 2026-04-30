import { type ClientSchema, a, defineData } from "@aws-amplify/backend";
import { invokeMealAgentFunction } from "../functions/invoke-meal-agent/resource";
import { nutritionSummaryFunction } from "../functions/nutrition-summary/resource";

const schema = a.schema({
	AgentResponse: a.customType({
		sessionId: a.string().required(),
		completion: a.string().required(),
	}),

	invokeMealAgent: a
		.query()
		.arguments({
			prompt: a.string().required(),
			sessionId: a.string().required(),
		})
		.returns(a.ref("AgentResponse").required())
		.handler(a.handler.function(invokeMealAgentFunction))
		.authorization((allow) => [allow.publicApiKey()]),

	MacroBreakdown: a.customType({
		proteinPercent: a.float().required(),
		carbsPercent: a.float().required(),
		fatPercent: a.float().required(),
	}),

	NutritionSummary: a.customType({
		totalCalories: a.integer().required(),
		averageDailyCalories: a.integer().required(),
		macroBreakdown: a.ref("MacroBreakdown").required(),
		narrative: a.string().required(),
		suggestions: a.string().array().required(),
	}),

	GenerateSummaryResult: a.customType({
		status: a.string().required(),
		summary: a.ref("NutritionSummary"),
		message: a.string(),
	}),

	FoodEntryInput: a.customType({
		name: a.string().required(),
		calories: a.integer(),
		protein: a.float(),
		carbs: a.float(),
		fat: a.float(),
	}),

	generateWeeklySummary: a
		.query()
		.arguments({
			entries: a.ref("FoodEntryInput").array().required(),
		})
		.returns(a.ref("GenerateSummaryResult").required())
		.handler(a.handler.function(nutritionSummaryFunction))
		.authorization((allow) => [allow.publicApiKey()]),

	FoodItem: a
		.model({
			name: a.string().required(),
			description: a.string(),
			category: a.string(),
			quantity: a.integer(),
			unit: a.string(),
			calories: a.integer(),
			protein: a.float(),
			carbs: a.float(),
			fat: a.float(),
			expirationDate: a.datetime(),
			addedAt: a.datetime().required(),
		})
		.authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
	schema,
	authorizationModes: {
		defaultAuthorizationMode: "apiKey",
		apiKeyAuthorizationMode: { expiresInDays: 30 },
	},
});

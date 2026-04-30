import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a.schema({
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

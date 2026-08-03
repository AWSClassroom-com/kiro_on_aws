import { a, type ClientSchema, defineData } from "@aws-amplify/backend";

/**
 * The FoodItem model backs the food-tracker page. Each record is one
 * tracked food entry with nutrition facts and freshness dates.
 * @see https://docs.amplify.aws/react/build-a-backend/data
 */
const schema = a.schema({
  FoodItem: a
    .model({
      name: a.string().required(),
      category: a.string(),
      quantity: a.float(),
      unit: a.string(),
      calories: a.integer(),
      protein: a.float(),
      carbs: a.float(),
      fat: a.float(),
      expirationDate: a.datetime(),
      addedAt: a.datetime(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

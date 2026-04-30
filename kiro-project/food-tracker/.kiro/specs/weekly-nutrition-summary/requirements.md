# Requirements Document

## Introduction

The Weekly Nutrition Summary feature adds an AI-powered analysis panel to the Food Tracker page. When a user clicks "Generate Weekly Summary", the app filters the food entries already loaded in memory for the past 7 days and sends them to Amazon Bedrock (Claude Sonnet 4.5). Bedrock returns a structured summary — total and average daily calories, a macro percentage breakdown, a short narrative, and 2–3 actionable suggestions. The result is displayed in a card below the button and is never persisted to the database. If the user has fewer than 3 entries in the last 7 days, a friendly message is shown instead of calling Bedrock.

## Glossary

- **Food_Tracker_Page**: The `/food-tracker` route rendered by `src/routes/food-tracker.tsx`.
- **Weekly_Summary_Button**: The "Generate Weekly Summary" UI control on the Food_Tracker_Page.
- **Summary_Generator**: The client-side module responsible for filtering entries, invoking Bedrock, and returning a structured result.
- **Bedrock_Client**: The AWS SDK component that calls the Amazon Bedrock `InvokeModel` API using the `anthropic.claude-sonnet-4-5` model ID and `anthropic_version` `bedrock-2023-05-31`.
- **Weekly_Entries**: The subset of `FoodItem` records whose `addedAt` timestamp falls within the 7-day window ending at the current moment.
- **Nutrition_Summary**: The transient, in-memory object containing `totalCalories`, `averageDailyCalories`, `macroBreakdown`, `narrative`, and `suggestions`.
- **Macro_Breakdown**: An object with `proteinPercent`, `carbsPercent`, and `fatPercent` fields that together sum to 100.
- **Summary_Card**: The UI component that renders a Nutrition_Summary below the Weekly_Summary_Button.
- **Loading_State**: The visual indicator shown while the Bedrock_Client is awaiting a response.
- **Insufficient_Data_Message**: The friendly UI message shown when fewer than 3 Weekly_Entries exist.
- **FoodItem**: The existing DynamoDB-backed data model defined in `amplify/data/resource.ts`, with fields including `name`, `calories`, `protein`, `carbs`, `fat`, and `addedAt`.

---

## Requirements

### Requirement 1: Generate Weekly Summary Button

**User Story:** As a food tracker user, I want a "Generate Weekly Summary" button on the food tracker page, so that I can trigger an AI-powered analysis of my recent eating habits.

#### Acceptance Criteria

1. THE Food_Tracker_Page SHALL render a Weekly_Summary_Button labelled "Generate Weekly Summary" below the food entries list.
2. WHILE the Summary_Generator is processing, THE Weekly_Summary_Button SHALL be disabled and display a loading indicator.
3. WHEN the Weekly_Summary_Button is clicked and a Nutrition_Summary is already displayed, THE Summary_Generator SHALL replace the existing Nutrition_Summary with a newly generated one.

---

### Requirement 2: Filter Entries for the Last 7 Days

**User Story:** As a food tracker user, I want the summary to cover only the last 7 days of entries, so that the analysis reflects my recent eating patterns.

#### Acceptance Criteria

1. WHEN the Weekly_Summary_Button is clicked, THE Summary_Generator SHALL filter the in-memory `FoodItem` list to produce Weekly_Entries whose `addedAt` value is within the 7-day window ending at the current timestamp.
2. THE Summary_Generator SHALL NOT perform an additional network request to fetch food entries; it SHALL use the entries already loaded on the Food_Tracker_Page.
3. WHEN the filtered Weekly_Entries count is fewer than 3, THE Food_Tracker_Page SHALL display the Insufficient_Data_Message and SHALL NOT invoke the Bedrock_Client.

---

### Requirement 3: Insufficient Data Handling

**User Story:** As a food tracker user, I want a clear message when I don't have enough data, so that I understand why no summary was generated.

#### Acceptance Criteria

1. WHEN the Weekly_Entries count is fewer than 3, THE Food_Tracker_Page SHALL display the Insufficient_Data_Message: "Not enough data — add at least 3 food entries from the last 7 days to generate a summary."
2. WHEN the Insufficient_Data_Message is displayed, THE Food_Tracker_Page SHALL NOT render the Summary_Card.

---

### Requirement 4: Bedrock Invocation

**User Story:** As a food tracker user, I want the app to call Amazon Bedrock with my weekly entries, so that I receive an AI-generated nutritional analysis.

#### Acceptance Criteria

1. WHEN the Weekly_Entries count is 3 or more, THE Summary_Generator SHALL invoke the Bedrock_Client with a prompt containing the name, calories, protein, carbs, and fat values of each Weekly_Entry.
2. THE Bedrock_Client SHALL use model ID `anthropic.claude-sonnet-4-5` and `anthropic_version` `bedrock-2023-05-31`.
3. THE Bedrock_Client SHALL request a structured JSON response containing `totalCalories`, `averageDailyCalories`, `macroBreakdown`, `narrative`, and `suggestions`.
4. THE Summary_Generator SHALL parse the Bedrock_Client response into a Nutrition_Summary object validated against a Zod schema.
5. IF the Bedrock_Client returns a response that fails Zod validation, THEN THE Summary_Generator SHALL surface a user-visible error message: "The summary could not be parsed. Please try again."

---

### Requirement 5: Nutrition Summary Structure and Validation

**User Story:** As a food tracker user, I want the summary to contain accurate, well-structured nutritional data, so that I can trust the information displayed.

#### Acceptance Criteria

1. THE Nutrition_Summary SHALL contain a `totalCalories` field that is a non-negative integer equal to the sum of `calories` across all Weekly_Entries that have a non-null `calories` value.
2. THE Nutrition_Summary SHALL contain an `averageDailyCalories` field equal to `totalCalories` divided by 7, rounded to the nearest integer.
3. THE Nutrition_Summary SHALL contain a `macroBreakdown` object with `proteinPercent`, `carbsPercent`, and `fatPercent` fields, each a non-negative number, where the three values sum to 100 (±1 for rounding).
4. THE Nutrition_Summary SHALL contain a `narrative` field that is a string of 2–3 sentences describing the user's eating patterns.
5. THE Nutrition_Summary SHALL contain a `suggestions` field that is an array of 2–3 strings, each representing an actionable suggestion for the following week.
6. THE Summary_Generator SHALL validate the Nutrition_Summary using a Zod schema before rendering; IF validation fails, THEN THE Food_Tracker_Page SHALL display the error message defined in Requirement 4, Criterion 5.

---

### Requirement 6: Loading State

**User Story:** As a food tracker user, I want to see a loading indicator while the summary is being generated, so that I know the app is working and not frozen.

#### Acceptance Criteria

1. WHEN the Bedrock_Client invocation is in progress, THE Food_Tracker_Page SHALL display the Loading_State in place of the Summary_Card.
2. THE Loading_State SHALL remain visible for the entire duration of the Bedrock_Client call, which is typically 2–4 seconds.
3. WHEN the Bedrock_Client invocation completes (successfully or with an error), THE Food_Tracker_Page SHALL remove the Loading_State.

---

### Requirement 7: Summary Card Display

**User Story:** As a food tracker user, I want to see the AI-generated summary in a clear, readable card, so that I can quickly understand my weekly nutrition at a glance.

#### Acceptance Criteria

1. WHEN a valid Nutrition_Summary is available, THE Food_Tracker_Page SHALL render the Summary_Card below the Weekly_Summary_Button.
2. THE Summary_Card SHALL display `totalCalories` and `averageDailyCalories` as labelled numeric values.
3. THE Summary_Card SHALL display the Macro_Breakdown as three labelled percentage values: Protein, Carbs, and Fat.
4. THE Summary_Card SHALL display the `narrative` as a block of text.
5. THE Summary_Card SHALL display each item in `suggestions` as a distinct list entry.
6. THE Summary_Card SHALL be styled consistently with the existing dark slate theme used on the Food_Tracker_Page (slate-800/900 backgrounds, white/gray text, cyan accents).

---

### Requirement 8: No Persistence

**User Story:** As a food tracker user, I want the summary to be a transient view, so that my DynamoDB data is not modified by generating a summary.

#### Acceptance Criteria

1. THE Summary_Generator SHALL NOT write any data to DynamoDB or any other persistent store when generating or displaying a Nutrition_Summary.
2. WHEN the Food_Tracker_Page is navigated away from or refreshed, THE Nutrition_Summary SHALL no longer be available; no cached or stored version SHALL persist.

---

### Requirement 9: Error Handling

**User Story:** As a food tracker user, I want clear error feedback if the summary generation fails, so that I can understand what went wrong and try again.

#### Acceptance Criteria

1. IF the Bedrock_Client invocation throws a network or service error, THEN THE Food_Tracker_Page SHALL display a user-visible error message: "Failed to generate summary. Please check your connection and try again."
2. WHEN an error message is displayed, THE Food_Tracker_Page SHALL NOT render the Summary_Card.
3. WHEN an error message is displayed, THE Weekly_Summary_Button SHALL be re-enabled so the user can retry.

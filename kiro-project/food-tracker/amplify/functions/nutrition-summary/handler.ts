import {
	BedrockRuntimeClient,
	InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FoodEntryInput {
	name: string;
	calories: number | null;
	protein: number | null;
	carbs: number | null;
	fat: number | null;
}

export interface MacroBreakdown {
	proteinPercent: number;
	carbsPercent: number;
	fatPercent: number;
}

export interface NutritionSummary {
	totalCalories: number;
	averageDailyCalories: number;
	macroBreakdown: MacroBreakdown;
	narrative: string;
	suggestions: string[];
}

export type GenerateSummaryResult =
	| { status: "success"; summary: NutritionSummary }
	| { status: "error"; message: string }
	| { status: "insufficient-data" };

// ---------------------------------------------------------------------------
// Inline Zod schema — validates Bedrock's JSON output before returning
// ---------------------------------------------------------------------------

const nutritionSummarySchema = z.object({
	totalCalories: z.number().int().nonnegative(),
	averageDailyCalories: z.number().int().nonnegative(),
	macroBreakdown: z.object({
		proteinPercent: z.number().nonnegative(),
		carbsPercent: z.number().nonnegative(),
		fatPercent: z.number().nonnegative(),
	}),
	narrative: z.string().min(1),
	suggestions: z.array(z.string().min(1)).min(2).max(3),
});

// ---------------------------------------------------------------------------
// Bedrock client — credentials resolved from Lambda execution role via the
// SDK default credential chain. No credential env vars are read here.
// ---------------------------------------------------------------------------

const bedrock = new BedrockRuntimeClient({
	region: process.env.AWS_REGION,
});

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (event: {
	arguments: { entries: FoodEntryInput[] };
}): Promise<GenerateSummaryResult> => {
	const { entries } = event.arguments;

	const entryLines = entries
		.map(
			(e) =>
				`- ${e.name}: ${e.calories ?? "?"} kcal, protein ${e.protein ?? "?"}g, carbs ${e.carbs ?? "?"}g, fat ${e.fat ?? "?"}g`,
		)
		.join("\n");

	const prompt = `You are a nutrition analyst. Given the following food entries from the past 7 days, return ONLY a JSON object (no markdown, no explanation) with this exact shape:
{
  "totalCalories": <integer>,
  "averageDailyCalories": <integer — totalCalories divided by 7, rounded>,
  "macroBreakdown": {
    "proteinPercent": <number>,
    "carbsPercent": <number>,
    "fatPercent": <number>
  },
  "narrative": "<2–3 sentences describing eating patterns>",
  "suggestions": ["<suggestion 1>", "<suggestion 2>", "<optional suggestion 3>"]
}
The three macro percentages must sum to 100. Base them on total grams of protein, carbs, and fat (4 kcal/g for protein and carbs, 9 kcal/g for fat).

Food entries:
${entryLines}`;

	try {
		const command = new InvokeModelCommand({
			modelId: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
			contentType: "application/json",
			accept: "application/json",
			body: JSON.stringify({
				anthropic_version: "bedrock-2023-05-31",
				max_tokens: 1024,
				messages: [{ role: "user", content: prompt }],
			}),
		});

		const response = await bedrock.send(command);
		const raw = JSON.parse(new TextDecoder().decode(response.body)) as {
			content: { type: string; text: string }[];
		};
		const text = raw.content[0].text;

		// Strip accidental markdown fences before parsing
		const jsonText = text
			.replace(/^```(?:json)?\n?/, "")
			.replace(/\n?```$/, "")
			.trim();

		const parsed: unknown = JSON.parse(jsonText);
		const validated = nutritionSummarySchema.parse(parsed);

		return { status: "success", summary: validated };
	} catch (err) {
		if (err instanceof z.ZodError) {
			return {
				status: "error",
				message: "The summary could not be parsed. Please try again.",
			};
		}
		return {
			status: "error",
			message:
				"Failed to generate summary. Please check your connection and try again.",
		};
	}
};

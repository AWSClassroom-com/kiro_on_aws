import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BedrockAgentParameter {
	name: string;
	type: string;
	value: string;
}

interface BedrockAgentEvent {
	messageVersion: string;
	agent: {
		name: string;
		id: string;
		alias: string;
		version: string;
	};
	inputText: string;
	sessionId: string;
	actionGroup: string;
	apiPath: string;
	httpMethod: string;
	parameters?: BedrockAgentParameter[];
	requestBody?: {
		content?: {
			[contentType: string]: {
				properties?: BedrockAgentParameter[];
			};
		};
	};
	sessionAttributes: Record<string, string>;
	promptSessionAttributes: Record<string, string>;
}

interface FoodEntry {
	id: string;
	name: string;
	category?: string;
	quantity?: number;
	unit?: string;
	calories?: number;
	protein?: number;
	carbs?: number;
	fat?: number;
	expirationDate?: string;
	addedAt: string;
}

interface BedrockAgentResponse {
	messageVersion: string;
	response: {
		actionGroup: string;
		apiPath: string;
		httpMethod: string;
		httpStatusCode: number;
		responseBody: {
			"application/json": {
				body: string;
			};
		};
	};
	sessionAttributes: Record<string, string>;
	promptSessionAttributes: Record<string, string>;
}

// ---------------------------------------------------------------------------
// DynamoDB client — credentials resolved from Lambda execution role
// ---------------------------------------------------------------------------

const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(ddbClient);

const TABLE_NAME = process.env.FOOD_ITEM_TABLE_NAME ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Extract a named parameter value from the Bedrock Agent parameters array.
 * Returns undefined if the parameter is not present.
 */
function getParam(
	parameters: BedrockAgentParameter[] | undefined,
	name: string,
): string | undefined {
	return parameters?.find((p) => p.name === name)?.value;
}

/**
 * Build a well-formed Bedrock Agent response envelope.
 */
function buildResponse(
	event: BedrockAgentEvent,
	statusCode: number,
	body: unknown,
): BedrockAgentResponse {
	return {
		messageVersion: "1.0",
		response: {
			actionGroup: event.actionGroup,
			apiPath: event.apiPath,
			httpMethod: event.httpMethod,
			httpStatusCode: statusCode,
			responseBody: {
				"application/json": {
					body: JSON.stringify(body),
				},
			},
		},
		sessionAttributes: event.sessionAttributes ?? {},
		promptSessionAttributes: event.promptSessionAttributes ?? {},
	};
}

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

/**
 * getRecentEntries — returns food items added within the last `days` days.
 */
async function getRecentEntries(days: number): Promise<FoodEntry[]> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);
	const cutoffIso = cutoff.toISOString();

	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression: "addedAt >= :cutoff",
			ExpressionAttributeValues: {
				":cutoff": cutoffIso,
			},
		}),
	);

	return (result.Items ?? []) as FoodEntry[];
}

/**
 * findExpiringSoon — returns food items whose expirationDate is between now
 * and `days` days from now.
 */
async function findExpiringSoon(days: number): Promise<FoodEntry[]> {
	const now = new Date();
	const future = new Date();
	future.setDate(future.getDate() + days);

	const nowIso = now.toISOString();
	const futureIso = future.toISOString();

	const result = await docClient.send(
		new ScanCommand({
			TableName: TABLE_NAME,
			FilterExpression:
				"attribute_exists(expirationDate) AND expirationDate >= :now AND expirationDate <= :future",
			ExpressionAttributeValues: {
				":now": nowIso,
				":future": futureIso,
			},
		}),
	);

	return (result.Items ?? []) as FoodEntry[];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (
	event: BedrockAgentEvent,
): Promise<BedrockAgentResponse> => {
	const { apiPath, parameters } = event;

	try {
		if (apiPath === "/getRecentEntries") {
			const daysParam = getParam(parameters, "days");
			const days = daysParam ? Number.parseInt(daysParam, 10) : 7;

			if (Number.isNaN(days) || days < 1) {
				return buildResponse(event, 400, {
					error: "Parameter 'days' must be a positive integer.",
				});
			}

			const entries = await getRecentEntries(days);
			return buildResponse(event, 200, {
				entries,
				count: entries.length,
				daysSearched: days,
			});
		}

		if (apiPath === "/findExpiringSoon") {
			const daysParam = getParam(parameters, "days");
			const days = daysParam ? Number.parseInt(daysParam, 10) : 3;

			if (Number.isNaN(days) || days < 1) {
				return buildResponse(event, 400, {
					error: "Parameter 'days' must be a positive integer.",
				});
			}

			const entries = await findExpiringSoon(days);
			return buildResponse(event, 200, {
				entries,
				count: entries.length,
				daysAhead: days,
			});
		}

		// Unknown path
		return buildResponse(event, 404, {
			error: `Unknown operation: ${apiPath}`,
		});
	} catch (err) {
		const message =
			err instanceof Error ? err.message : "An unexpected error occurred.";
		return buildResponse(event, 500, { error: message });
	}
};

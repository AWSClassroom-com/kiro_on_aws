import {
	BedrockAgentRuntimeClient,
	InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface HandlerEvent {
	arguments: {
		prompt: string;
		sessionId: string;
	};
}

interface AgentResponse {
	sessionId: string;
	completion: string;
}

// ---------------------------------------------------------------------------
// Bedrock Agent Runtime client — credentials resolved from Lambda execution role
// ---------------------------------------------------------------------------

const client = new BedrockAgentRuntimeClient({ region: process.env.AWS_REGION });

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const handler = async (event: HandlerEvent): Promise<AgentResponse> => {
	const { prompt, sessionId } = event.arguments;

	const fallback: AgentResponse = {
		sessionId,
		completion: "Sorry, I couldn't get a response. Please try again.",
	};

	// Inline validation — guard against missing required arguments
	if (!prompt || !sessionId) {
		console.error("[invoke-meal-agent] Missing required arguments: prompt or sessionId");
		return fallback;
	}

	const agentId = process.env.AGENT_ID;
	const agentAliasId = process.env.AGENT_ALIAS_ID;

	if (!agentId || !agentAliasId) {
		console.error("[invoke-meal-agent] Missing required environment variables: AGENT_ID or AGENT_ALIAS_ID");
		return fallback;
	}

	try {
		const command = new InvokeAgentCommand({
			agentId,
			agentAliasId,
			sessionId,
			inputText: prompt,
		});

		const response = await client.send(command);

		const decoder = new TextDecoder();
		let completion = "";

		for await (const chunk of response.completion ?? []) {
			if (chunk.chunk?.bytes) {
				completion += decoder.decode(chunk.chunk.bytes);
			}
		}

		return { sessionId, completion };
	} catch (err) {
		console.error("[invoke-meal-agent] Bedrock call failed:", err);
		return fallback; // never throw — AppSync gets a valid response
	}
};

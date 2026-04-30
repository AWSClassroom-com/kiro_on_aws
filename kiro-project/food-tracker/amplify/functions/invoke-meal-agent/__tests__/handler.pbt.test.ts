// @vitest-environment node
// Feature: meal-agent-chat, Property 6: Lambda forwards prompt and sessionId unchanged
// Feature: meal-agent-chat, Property 7: Chunk concatenation round-trip

import * as fc from "fast-check";
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-bedrock-agent-runtime
// ---------------------------------------------------------------------------

const capturedCommandArgs: Record<string, unknown>[] = [];
const mockSend = vi.fn();

vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => {
	const InvokeAgentCommand = vi.fn((args: Record<string, unknown>) => {
		capturedCommandArgs.push({ ...args });
		return { __type: "InvokeAgentCommand", ...args };
	});

	const BedrockAgentRuntimeClient = vi.fn(() => ({
		send: mockSend,
	}));

	return { BedrockAgentRuntimeClient, InvokeAgentCommand };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCompletionStream(chunks: string[]) {
	const encoder = new TextEncoder();
	return (async function* () {
		for (const chunk of chunks) {
			yield { chunk: { bytes: encoder.encode(chunk) } };
		}
	})();
}

function makeEvent(prompt: string, sessionId: string) {
	return { arguments: { prompt, sessionId } };
}

async function importHandler() {
	vi.resetModules();
	vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => {
		const InvokeAgentCommand = vi.fn((args: Record<string, unknown>) => {
			capturedCommandArgs.push({ ...args });
			return { __type: "InvokeAgentCommand", ...args };
		});

		const BedrockAgentRuntimeClient = vi.fn(() => ({
			send: mockSend,
		}));

		return { BedrockAgentRuntimeClient, InvokeAgentCommand };
	});
	const mod = await import("../handler.js");
	return mod.handler;
}

// ---------------------------------------------------------------------------
// Property 6: Lambda forwards prompt and sessionId unchanged
// Validates: Requirements 6.2
// ---------------------------------------------------------------------------

describe("Property 6: Lambda forwards prompt and sessionId unchanged", () => {
	beforeEach(() => {
		capturedCommandArgs.length = 0;
		mockSend.mockReset();
		process.env.AGENT_ID = "0PFG4K6M5I";
		process.env.AGENT_ALIAS_ID = "VBFPV7MGRM";
		process.env.AWS_REGION = "us-east-1";
	});

	it("InvokeAgentCommand receives inputText === prompt and sessionId === sessionId for any inputs", async () => {
		const handler = await importHandler();

		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }),
				fc.uuid(),
				async (prompt, sessionId) => {
					capturedCommandArgs.length = 0;
					mockSend.mockResolvedValueOnce({
						completion: makeCompletionStream(["ok"]),
					});

					await handler(makeEvent(prompt, sessionId));

					expect(capturedCommandArgs.length).toBeGreaterThanOrEqual(1);
					const args = capturedCommandArgs[capturedCommandArgs.length - 1];
					expect(args.inputText).toBe(prompt);
					expect(args.sessionId).toBe(sessionId);
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 7: Chunk concatenation round-trip
// Validates: Requirements 6.3, 6.4, 6.5
// ---------------------------------------------------------------------------

describe("Property 7: Chunk concatenation round-trip", () => {
	beforeEach(() => {
		capturedCommandArgs.length = 0;
		mockSend.mockReset();
		process.env.AGENT_ID = "0PFG4K6M5I";
		process.env.AGENT_ALIAS_ID = "VBFPV7MGRM";
		process.env.AWS_REGION = "us-east-1";
	});

	it("completion equals the concatenation of all decoded chunk bytes for any sequence of chunks", async () => {
		const handler = await importHandler();

		await fc.assert(
			fc.asyncProperty(
				fc.array(fc.string(), { minLength: 1 }),
				async (chunks) => {
					capturedCommandArgs.length = 0;
					mockSend.mockResolvedValueOnce({
						completion: makeCompletionStream(chunks),
					});

					const result = await handler(makeEvent("test prompt", "session-round-trip"));

					const expected = chunks.join("");
					expect(result.completion).toBe(expected);
				},
			),
			{ numRuns: 100 },
		);
	});
});

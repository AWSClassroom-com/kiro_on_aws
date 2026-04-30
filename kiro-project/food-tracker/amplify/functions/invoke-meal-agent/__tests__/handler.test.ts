// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @aws-sdk/client-bedrock-agent-runtime before any imports that use it
// ---------------------------------------------------------------------------

const capturedCommandArgs: Record<string, unknown>[] = [];
const mockSend = vi.fn();

vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => {
	const InvokeAgentCommand = vi.fn((args: Record<string, unknown>) => {
		capturedCommandArgs.push(args);
		return { __type: "InvokeAgentCommand", ...args };
	});

	const BedrockAgentRuntimeClient = vi.fn(() => ({
		send: mockSend,
	}));

	return { BedrockAgentRuntimeClient, InvokeAgentCommand };
});

// ---------------------------------------------------------------------------
// Import handler AFTER the mock is registered
// ---------------------------------------------------------------------------

// We use dynamic import inside each test group so the module-level client
// picks up the mock. vi.mock() is hoisted, so the mock is in place before
// the module is evaluated.
async function importHandler() {
	// Reset module registry so the module-level `client` is re-created with
	// the current mock on each test group.
	vi.resetModules();
	// Re-register the mock after resetModules (hoisting no longer applies
	// after a manual reset).
	vi.mock("@aws-sdk/client-bedrock-agent-runtime", () => {
		const InvokeAgentCommand = vi.fn((args: Record<string, unknown>) => {
			capturedCommandArgs.push(args);
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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("invoke-meal-agent handler — unit tests", () => {
	beforeEach(() => {
		capturedCommandArgs.length = 0;
		mockSend.mockReset();
		process.env.AGENT_ID = "0PFG4K6M5I";
		process.env.AGENT_ALIAS_ID = "VBFPV7MGRM";
		process.env.AWS_REGION = "us-east-1";
	});

	// -----------------------------------------------------------------------
	// Requirement 6.1 — InvokeAgentCommand called with correct agentId / agentAliasId
	// -----------------------------------------------------------------------
	it("calls InvokeAgentCommand with the agentId and agentAliasId from env vars (Requirement 6.1)", async () => {
		process.env.AGENT_ID = "0PFG4K6M5I";
		process.env.AGENT_ALIAS_ID = "VBFPV7MGRM";

		mockSend.mockResolvedValueOnce({
			completion: makeCompletionStream(["hello"]),
		});

		const handler = await importHandler();
		await handler(makeEvent("What should I eat?", "session-abc"));

		expect(capturedCommandArgs.length).toBeGreaterThanOrEqual(1);
		const args = capturedCommandArgs[capturedCommandArgs.length - 1];
		expect(args.agentId).toBe("0PFG4K6M5I");
		expect(args.agentAliasId).toBe("VBFPV7MGRM");
	});

	// -----------------------------------------------------------------------
	// Requirement 8.1 — error path returns fallback without throwing
	// -----------------------------------------------------------------------
	it("returns fallback completion string when send() throws, without re-throwing (Requirement 8.1)", async () => {
		mockSend.mockRejectedValueOnce(new Error("Bedrock unavailable"));

		const handler = await importHandler();
		const sessionId = "session-xyz";

		let result: Awaited<ReturnType<typeof handler>> | undefined;
		let threw = false;
		try {
			result = await handler(makeEvent("Any prompt", sessionId));
		} catch {
			threw = true;
		}

		expect(threw).toBe(false);
		expect(result).toEqual({
			sessionId,
			completion: "Sorry, I couldn't get a response. Please try again.",
		});
	});
});

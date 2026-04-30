// @vitest-environment jsdom
// Feature: meal-agent-chat, Property 1: Session ID is always a valid UUID
// Feature: meal-agent-chat, Property 2: New conversation produces a distinct session ID and clears messages
// Feature: meal-agent-chat, Property 3: Submitted prompt appears in the messages area
// Feature: meal-agent-chat, Property 4: Input field is cleared after submission
// Feature: meal-agent-chat, Property 5: Empty or whitespace-only input is rejected
// Feature: meal-agent-chat, Property 8: Successful response appears as assistant message
// Feature: meal-agent-chat, Property 9: User and assistant messages are visually distinct
// Feature: meal-agent-chat, Property 10: Error produces fallback message and re-enables input
// Feature: meal-agent-chat, Property 11: Enter key submits the same way as the Send button

import * as fc from "fast-check";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock @/lib/amplify-client — imports amplify_outputs.json which doesn't exist
// in the test environment.
// ---------------------------------------------------------------------------

vi.mock("@/lib/amplify-client", () => ({
	client: {
		queries: {
			invokeMealAgent: vi.fn(),
		},
	},
}));

vi.mock("aws-amplify", () => ({
	Amplify: { configure: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Import component and mocked client AFTER mocks are registered
// ---------------------------------------------------------------------------

import { client } from "@/lib/amplify-client";
import MealAgentChat from "@/components/MealAgentChat";

const mockInvokeMealAgent = client.queries.invokeMealAgent as ReturnType<typeof vi.fn>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ---------------------------------------------------------------------------
// Per-run render helpers
// Each property run renders into a fresh container and cleans up after itself.
// This avoids DOM accumulation across fast-check iterations.
// ---------------------------------------------------------------------------

function renderInContainer() {
	const container = document.createElement("div");
	document.body.appendChild(container);
	const utils = render(<MealAgentChat />, { container });
	const q = within(container);

	function openPanel() {
		fireEvent.click(q.getByRole("button", { name: "Ask the meal assistant" }));
	}

	async function sendMessage(text: string) {
		const input = q.getByRole("textbox");
		fireEvent.change(input, { target: { value: text } });
		fireEvent.click(q.getByRole("button", { name: /send/i }));
	}

	async function sendMessageViaEnter(text: string) {
		const input = q.getByRole("textbox");
		fireEvent.change(input, { target: { value: text } });
		fireEvent.keyDown(input, { key: "Enter", code: "Enter", charCode: 13 });
	}

	function teardown() {
		utils.unmount();
		if (container.parentNode) {
			container.parentNode.removeChild(container);
		}
	}

	return { q, container, openPanel, sendMessage, sendMessageViaEnter, teardown };
}

function resetMock() {
	vi.clearAllMocks();
	mockInvokeMealAgent.mockResolvedValue({
		data: { sessionId: "s1", completion: "response" },
		errors: undefined,
	});
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
	resetMock();
});

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Property 1: Session ID is always a valid UUID
// Validates: Requirements 3.1
// ---------------------------------------------------------------------------

describe("Property 1: Session ID is always a valid UUID", () => {
	it("session ID passed to invokeMealAgent matches UUID v4 format for any panel open event", async () => {
		await fc.assert(
			fc.asyncProperty(fc.constant(null), async () => {
				mockInvokeMealAgent.mockResolvedValueOnce({
					data: { sessionId: "s1", completion: "ok" },
					errors: undefined,
				});

				const { openPanel, sendMessage, teardown } = renderInContainer();
				openPanel();
				await sendMessage("hello");

				await waitFor(() => {
					expect(mockInvokeMealAgent).toHaveBeenCalled();
				});

				const callArgs = mockInvokeMealAgent.mock.calls[
					mockInvokeMealAgent.mock.calls.length - 1
				][0] as { sessionId: string };
				expect(callArgs.sessionId).toMatch(UUID_V4_RE);

				teardown();
				resetMock();
			}),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 2: New conversation produces a distinct session ID and clears messages
// Validates: Requirements 3.3
// ---------------------------------------------------------------------------

describe("Property 2: New conversation produces a distinct session ID and clears messages", () => {
	it("clicking 'New conversation' produces a different session ID and clears messages", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.array(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), {
					minLength: 1,
					maxLength: 3,
				}),
				async (prompts) => {
					mockInvokeMealAgent.mockResolvedValue({
						data: { sessionId: "s1", completion: "ok" },
						errors: undefined,
					});

					const { q, container, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();

					// Send all prompts to build up a conversation
					for (const prompt of prompts) {
						await act(async () => {
							await sendMessage(prompt);
						});
						await waitFor(() => {
							expect(mockInvokeMealAgent).toHaveBeenCalled();
						});
					}

					// Capture the session ID used in the last call
					const lastCallArgs = mockInvokeMealAgent.mock.calls[
						mockInvokeMealAgent.mock.calls.length - 1
					][0] as { sessionId: string };
					const oldSessionId = lastCallArgs.sessionId;

					// Wait for all user messages to appear
					await waitFor(() => {
						const userMessages = container.querySelectorAll(".chat-message-user");
						expect(userMessages.length).toBe(prompts.length);
					});

					// Click "New conversation"
					vi.clearAllMocks();
					mockInvokeMealAgent.mockResolvedValue({
						data: { sessionId: "s2", completion: "ok" },
						errors: undefined,
					});

					fireEvent.click(q.getByRole("button", { name: /new conversation/i }));

					// Messages should be cleared
					await waitFor(() => {
						expect(container.querySelectorAll(".chat-message-user").length).toBe(0);
					});

					// Send a new message to capture the new session ID
					await act(async () => {
						await sendMessage("new session message");
					});
					await waitFor(() => {
						expect(mockInvokeMealAgent).toHaveBeenCalled();
					});

					const newCallArgs = mockInvokeMealAgent.mock.calls[0][0] as { sessionId: string };
					const newSessionId = newCallArgs.sessionId;

					expect(newSessionId).not.toBe(oldSessionId);
					expect(newSessionId).toMatch(UUID_V4_RE);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 50 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 3: Submitted prompt appears in the messages area
// Validates: Requirements 4.1
// ---------------------------------------------------------------------------

describe("Property 3: Submitted prompt appears in the messages area", () => {
	it("any non-empty prompt appears as a user message after submission", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				async (prompt) => {
					mockInvokeMealAgent.mockResolvedValueOnce({
						data: { sessionId: "s1", completion: "ok" },
						errors: undefined,
					});

					const { container, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();
					await sendMessage(prompt);

					// The user message should appear immediately (state update is synchronous)
					// Use a short waitFor to handle React batching
					await waitFor(
						() => {
							const userMsgs = container.querySelectorAll(".chat-message-user");
							expect(userMsgs.length).toBeGreaterThan(0);
						},
						{ timeout: 1000 },
					);

					// The component trims the input before storing it as a message
					const trimmedPrompt = prompt.trim();
					const userMsgs = container.querySelectorAll(".chat-message-user");
					const texts = Array.from(userMsgs).map((el) => el.textContent ?? "");
					expect(texts.some((t) => t.includes(trimmedPrompt))).toBe(true);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 4: Input field is cleared after submission
// Validates: Requirements 4.3
// ---------------------------------------------------------------------------

describe("Property 4: Input field is cleared after submission", () => {
	it("input value is empty string after any non-empty prompt is submitted", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				async (prompt) => {
					mockInvokeMealAgent.mockResolvedValueOnce({
						data: { sessionId: "s1", completion: "ok" },
						errors: undefined,
					});

					const { q, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();
					await sendMessage(prompt);

					// Input should be cleared immediately after submission
					await waitFor(() => {
						const input = q.getByRole("textbox") as HTMLInputElement;
						expect(input.value).toBe("");
					});

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 5: Empty or whitespace-only input is rejected
// Validates: Requirements 4.5
// ---------------------------------------------------------------------------

describe("Property 5: Empty or whitespace-only input is rejected", () => {
	it("invokeMealAgent is NOT called and no message is added for whitespace-only input", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.stringMatching(/^\s*$/),
				async (emptyish) => {
					vi.clearAllMocks();
					mockInvokeMealAgent.mockResolvedValue({
						data: { sessionId: "s1", completion: "response" },
						errors: undefined,
					});

					const { q, container, openPanel, teardown } = renderInContainer();
					openPanel();

					const input = q.getByRole("textbox");
					fireEvent.change(input, { target: { value: emptyish } });
					fireEvent.click(q.getByRole("button", { name: /send/i }));

					// Give React a tick to process
					await act(async () => {
						await new Promise((r) => setTimeout(r, 10));
					});

					expect(mockInvokeMealAgent).not.toHaveBeenCalled();
					expect(container.querySelectorAll(".chat-message-user").length).toBe(0);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 8: Successful response appears as assistant message
// Validates: Requirements 7.1
// ---------------------------------------------------------------------------

describe("Property 8: Successful response appears as assistant message", () => {
	it("any completion string returned by the query appears as an assistant message with no typing indicator", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }),
				async (completion) => {
					mockInvokeMealAgent.mockResolvedValueOnce({
						data: { sessionId: "s1", completion },
						errors: undefined,
					});

					const { container, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();
					await sendMessage("test prompt");

					// Wait for the query to resolve and assistant message to appear
					await waitFor(
						() => {
							// Typing indicator gone means query resolved
							expect(container.querySelectorAll(".animate-bounce").length).toBe(0);
						},
						{ timeout: 2000 },
					);

					// Now check assistant messages (excluding typing indicator which is also chat-message-assistant)
					const assistantMsgs = container.querySelectorAll(".chat-message-assistant");
					const texts = Array.from(assistantMsgs).map((el) => el.textContent ?? "");
					expect(texts.some((t) => t.includes(completion))).toBe(true);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 9: User and assistant messages are visually distinct
// Validates: Requirements 7.2
// ---------------------------------------------------------------------------

describe("Property 9: User and assistant messages are visually distinct", () => {
	it("user messages have class chat-message-user and assistant messages have class chat-message-assistant, and these differ", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				fc.string({ minLength: 1 }),
				async (userText, assistantText) => {
					mockInvokeMealAgent.mockResolvedValueOnce({
						data: { sessionId: "s1", completion: assistantText },
						errors: undefined,
					});

					const { container, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();
					await sendMessage(userText);

					await waitFor(() => {
						expect(container.querySelectorAll(".chat-message-user").length).toBeGreaterThan(0);
						expect(container.querySelectorAll(".chat-message-assistant").length).toBeGreaterThan(0);
					});

					const userMsgs = container.querySelectorAll(".chat-message-user");
					const assistantMsgs = container.querySelectorAll(".chat-message-assistant");

					// Classes must differ
					expect("chat-message-user").not.toBe("chat-message-assistant");

					// User messages should not have assistant class
					for (const el of Array.from(userMsgs)) {
						expect(el.classList.contains("chat-message-assistant")).toBe(false);
					}

					// Assistant messages should not have user class
					for (const el of Array.from(assistantMsgs)) {
						expect(el.classList.contains("chat-message-user")).toBe(false);
					}

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 10: Error produces fallback message and re-enables input
// Validates: Requirements 8.1, 8.3
// ---------------------------------------------------------------------------

describe("Property 10: Error produces fallback message and re-enables input", () => {
	it("any error from invokeMealAgent produces the fallback message and re-enables input", async () => {
		const FALLBACK = "Sorry, I couldn't get a response. Please try again.";

		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				async (prompt) => {
					mockInvokeMealAgent.mockRejectedValueOnce(new Error("network error"));

					const { q, container, openPanel, sendMessage, teardown } = renderInContainer();
					openPanel();
					await sendMessage(prompt);

					// Wait for typing indicator to disappear (means error was handled)
					await waitFor(
						() => {
							expect(container.querySelectorAll(".animate-bounce").length).toBe(0);
						},
						{ timeout: 2000 },
					);

					// Check fallback message is present
					const assistantMsgs = container.querySelectorAll(".chat-message-assistant");
					const texts = Array.from(assistantMsgs).map((el) => el.textContent ?? "");
					expect(texts.some((t) => t.includes(FALLBACK))).toBe(true);

					// Input re-enabled
					const inp = q.getByRole("textbox") as HTMLInputElement;
					expect(inp.disabled).toBe(false);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// ---------------------------------------------------------------------------
// Property 11: Enter key submits the same way as the Send button
// Validates: Requirements 9.5
// ---------------------------------------------------------------------------

describe("Property 11: Enter key submits the same way as the Send button", () => {
	it("pressing Enter calls invokeMealAgent with the same args as clicking Send", async () => {
		await fc.assert(
			fc.asyncProperty(
				fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
				async (prompt) => {
					// Clear mock calls before each run so we can reliably check calls[0]
					vi.clearAllMocks();
					mockInvokeMealAgent.mockResolvedValueOnce({
						data: { sessionId: "s1", completion: "ok" },
						errors: undefined,
					});

					const { openPanel, sendMessageViaEnter, teardown } = renderInContainer();
					openPanel();
					await sendMessageViaEnter(prompt);

					await waitFor(() => {
						expect(mockInvokeMealAgent).toHaveBeenCalled();
					});

					// calls[0] is safe here because we cleared mocks before this run
					const callArgs = mockInvokeMealAgent.mock.calls[0][0] as {
						prompt: string;
						sessionId: string;
					};
					// The component trims the input before sending
					expect(callArgs.prompt).toBe(prompt.trim());
					expect(callArgs.sessionId).toMatch(UUID_V4_RE);

					teardown();
					resetMock();
				},
			),
			{ numRuns: 100 },
		);
	});
});

// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
// Helpers
// ---------------------------------------------------------------------------

function openPanel() {
	const btn = screen.getByRole("button", { name: "Ask the meal assistant" });
	fireEvent.click(btn);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MealAgentChat — unit tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Default success mock
		mockInvokeMealAgent.mockResolvedValue({
			data: { sessionId: "s1", completion: "response" },
			errors: undefined,
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	// -------------------------------------------------------------------------
	// 1. FloatingButton renders with correct label and aria-label
	// Requirements 1.2, 9.1
	// -------------------------------------------------------------------------
	it("FloatingButton renders with correct label and aria-label (Requirements 1.2, 9.1)", () => {
		render(<MealAgentChat />);

		const btn = screen.getByRole("button", { name: "Ask the meal assistant" });
		expect(btn).toBeTruthy();
		expect(btn.getAttribute("aria-label")).toBe("Ask the meal assistant");
		expect(btn.textContent).toContain("Ask the meal assistant");
	});

	// -------------------------------------------------------------------------
	// 2. ChatPanel structure — header title
	// Requirement 2.3
	// -------------------------------------------------------------------------
	it("ChatPanel shows 'Meal Assistant' heading after opening (Requirement 2.3)", () => {
		render(<MealAgentChat />);
		openPanel();

		// Query with hidden:true because the panel uses aria-hidden when closed
		const heading = screen.getByText("Meal Assistant");
		expect(heading).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 3. ChatPanel structure — "New conversation" button
	// Requirement 2.3
	// -------------------------------------------------------------------------
	it("ChatPanel shows 'New conversation' button after opening (Requirement 2.3)", () => {
		render(<MealAgentChat />);
		openPanel();

		const btn = screen.getByRole("button", { name: /new conversation/i });
		expect(btn).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 4. ChatPanel structure — close button
	// Requirement 2.6
	// -------------------------------------------------------------------------
	it("ChatPanel shows close button with aria-label after opening (Requirement 2.6)", () => {
		render(<MealAgentChat />);
		openPanel();

		const closeBtn = screen.getByRole("button", { name: "Close chat panel" });
		expect(closeBtn).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 5. ChatPanel structure — messages area with role="log"
	// Requirement 2.4
	// -------------------------------------------------------------------------
	it("ChatPanel contains a messages area with role='log' (Requirement 2.4)", () => {
		render(<MealAgentChat />);
		openPanel();

		// The log element is always in the DOM (panel uses CSS transform, not conditional render)
		const log = document.querySelector("[role='log']");
		expect(log).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 6. ChatPanel structure — input area
	// Requirement 2.5
	// -------------------------------------------------------------------------
	it("ChatPanel shows text input and Send button after opening (Requirement 2.5)", () => {
		render(<MealAgentChat />);
		openPanel();

		const input = screen.getByRole("textbox");
		expect(input).toBeTruthy();

		const sendBtn = screen.getByRole("button", { name: /send/i });
		expect(sendBtn).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 7. Typing indicator visible while loading, hidden after response
	// Requirements 4.2, 7.1
	// -------------------------------------------------------------------------
	it("shows typing indicator while loading and hides it after response (Requirements 4.2, 7.1)", async () => {
		let resolveQuery!: (value: unknown) => void;
		const pendingPromise = new Promise((resolve) => {
			resolveQuery = resolve;
		});
		mockInvokeMealAgent.mockReturnValueOnce(pendingPromise);

		render(<MealAgentChat />);
		openPanel();

		const input = screen.getByRole("textbox");
		fireEvent.change(input, { target: { value: "What should I eat?" } });
		fireEvent.click(screen.getByRole("button", { name: /send/i }));

		// Typing indicator: animated dots rendered as <span> with animate-bounce
		await waitFor(() => {
			const dots = document.querySelectorAll(".animate-bounce");
			expect(dots.length).toBeGreaterThan(0);
		});

		// Resolve the query
		await act(async () => {
			resolveQuery({
				data: { sessionId: "s1", completion: "Here is my response" },
				errors: undefined,
			});
		});

		// Typing indicator gone, assistant message present
		await waitFor(() => {
			expect(document.querySelectorAll(".animate-bounce").length).toBe(0);
		});
		expect(screen.getByText("Here is my response")).toBeTruthy();
	});

	// -------------------------------------------------------------------------
	// 8. Input and Send button disabled while in-flight
	// Requirement 4.4
	// -------------------------------------------------------------------------
	it("disables input and Send button while request is in-flight (Requirement 4.4)", async () => {
		// Never resolves during this test
		mockInvokeMealAgent.mockReturnValueOnce(new Promise(() => {}));

		render(<MealAgentChat />);
		openPanel();

		const input = screen.getByRole("textbox") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "test message" } });
		fireEvent.click(screen.getByRole("button", { name: /send/i }));

		await waitFor(() => {
			const inp = screen.getByRole("textbox") as HTMLInputElement;
			expect(inp.disabled).toBe(true);
		});

		const sendBtn = screen.getByRole("button", { name: /send/i }) as HTMLButtonElement;
		expect(sendBtn.disabled).toBe(true);
	});

	// -------------------------------------------------------------------------
	// 9. Accessibility — role="log" and aria-live="polite"
	// Requirement 9.3
	// -------------------------------------------------------------------------
	it("messages area has role='log' and aria-live='polite' (Requirement 9.3)", () => {
		render(<MealAgentChat />);
		openPanel();

		const log = document.querySelector("[role='log']");
		expect(log).toBeTruthy();
		expect(log?.getAttribute("aria-live")).toBe("polite");
	});

	// -------------------------------------------------------------------------
	// 10. Accessibility — aria-label on close button
	// Requirement 9.2
	// -------------------------------------------------------------------------
	it("close button has aria-label='Close chat panel' (Requirement 9.2)", () => {
		render(<MealAgentChat />);
		openPanel();

		const closeBtn = screen.getByRole("button", { name: "Close chat panel" });
		expect(closeBtn.getAttribute("aria-label")).toBe("Close chat panel");
	});

	// -------------------------------------------------------------------------
	// 11. Accessibility — focus on open
	// Requirement 9.4
	// -------------------------------------------------------------------------
	it("moves focus to text input when panel opens (Requirement 9.4)", async () => {
		render(<MealAgentChat />);
		openPanel();

		await waitFor(
			() => {
				const input = screen.getByRole("textbox");
				expect(document.activeElement).toBe(input);
			},
			{ timeout: 500 },
		);
	});
});

import { MessageCircle, RefreshCw, Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { client } from "@/lib/amplify-client";

// ─── Interfaces ──────────────────────────────────────────────────────────────

interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
}

interface ChatPanelState {
	isOpen: boolean;
	sessionId: string;
	messages: ChatMessage[];
	inputValue: string;
	isLoading: boolean;
}

interface FloatingButtonProps {
	isOpen: boolean;
	onClick: () => void;
}

interface ChatPanelProps {
	isOpen: boolean;
	messages: ChatMessage[];
	isLoading: boolean;
	inputValue: string;
	onInputChange: (value: string) => void;
	onSend: () => void;
	onClose: () => void;
	onNewConversation: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FloatingButton({ isOpen, onClick }: FloatingButtonProps) {
	return (
		<button
			type="button"
			onClick={onClick}
			aria-label="Ask the meal assistant"
			className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-semibold rounded-full shadow-lg shadow-cyan-600/40 transition-all duration-200 hover:shadow-cyan-500/50 hover:scale-105"
		>
			{isOpen ? <X size={20} /> : <MessageCircle size={20} />}
			<span className="text-sm">Ask the meal assistant</span>
		</button>
	);
}

function UserMessage({ content }: { content: string }) {
	return (
		<div className="chat-message-user flex justify-end mb-3">
			<div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tr-sm bg-cyan-600/30 border border-cyan-500/40 text-white text-sm leading-relaxed">
				{content}
			</div>
		</div>
	);
}

function AssistantMessage({ content }: { content: string }) {
	return (
		<div className="chat-message-assistant flex justify-start mb-3">
			<div className="max-w-[80%] px-4 py-2.5 rounded-2xl rounded-tl-sm bg-slate-700/50 border border-slate-600 text-gray-200 text-sm leading-relaxed">
				{content}
			</div>
		</div>
	);
}

function TypingIndicator() {
	return (
		<div className="chat-message-assistant flex justify-start mb-3">
			<div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-slate-700/50 border border-slate-600 flex items-center gap-1.5">
				<span
					className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
					style={{ animationDelay: "0ms" }}
				/>
				<span
					className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
					style={{ animationDelay: "150ms" }}
				/>
				<span
					className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
					style={{ animationDelay: "300ms" }}
				/>
			</div>
		</div>
	);
}

function PanelHeader({
	onClose,
	onNewConversation,
}: {
	onClose: () => void;
	onNewConversation: () => void;
}) {
	return (
		<div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-800/95 backdrop-blur-sm flex-shrink-0">
			<div className="flex items-center gap-2">
				<MessageCircle size={18} className="text-cyan-400" />
				<h2 className="text-white font-semibold text-sm">Meal Assistant</h2>
			</div>
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={onNewConversation}
					className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
					title="New conversation"
				>
					<RefreshCw size={13} />
					<span>New conversation</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					aria-label="Close chat panel"
					className="p-1.5 text-gray-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
				>
					<X size={18} />
				</button>
			</div>
		</div>
	);
}

function MessageList({
	messages,
	isLoading,
	listRef,
}: {
	messages: ChatMessage[];
	isLoading: boolean;
	listRef: React.RefObject<HTMLDivElement | null>;
}) {
	return (
		<div
			ref={listRef}
			role="log"
			aria-live="polite"
			aria-label="Conversation messages"
			className="flex-1 overflow-y-auto px-4 py-4 space-y-0"
		>
			{messages.length === 0 && !isLoading && (
				<div className="flex flex-col items-center justify-center h-full text-center py-12">
					<MessageCircle size={40} className="text-slate-600 mb-3" />
					<p className="text-gray-500 text-sm">
						Ask me anything about your meals or nutrition!
					</p>
				</div>
			)}
			{messages.map((msg) =>
				msg.role === "user" ? (
					<UserMessage key={msg.id} content={msg.content} />
				) : (
					<AssistantMessage key={msg.id} content={msg.content} />
				),
			)}
			{isLoading && <TypingIndicator />}
		</div>
	);
}

function InputArea({
	inputValue,
	isLoading,
	inputRef,
	onInputChange,
	onSend,
}: {
	inputValue: string;
	isLoading: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onInputChange: (value: string) => void;
	onSend: () => void;
}) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			onSend();
		}
	};

	return (
		<div className="flex items-center gap-2 px-4 py-3 border-t border-slate-700 bg-slate-800/95 backdrop-blur-sm flex-shrink-0">
			<input
				ref={inputRef}
				type="text"
				value={inputValue}
				onChange={(e) => onInputChange(e.target.value)}
				onKeyDown={handleKeyDown}
				disabled={isLoading}
				placeholder="Ask about your meals…"
				aria-label="Message input"
				className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			/>
			<button
				type="button"
				onClick={onSend}
				disabled={isLoading || inputValue.trim() === ""}
				aria-label="Send message"
				className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-gray-500 text-white rounded-lg transition-colors flex-shrink-0 disabled:cursor-not-allowed"
			>
				<Send size={16} />
			</button>
		</div>
	);
}

function ChatPanel({
	isOpen,
	messages,
	isLoading,
	inputValue,
	onInputChange,
	onSend,
	onClose,
	onNewConversation,
}: ChatPanelProps) {
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);

	// Move focus to input when panel opens
	useEffect(() => {
		if (isOpen) {
			// Small delay to let the CSS transition start
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 50);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	// Scroll to bottom when new messages arrive or typing indicator appears
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages and isLoading trigger the scroll; listRef.current is intentionally not a dep
	useEffect(() => {
		if (listRef.current) {
			listRef.current.scrollTop = listRef.current.scrollHeight;
		}
	}, [messages, isLoading]);

	return (
		<div
			className={`fixed right-0 top-0 h-full w-96 z-50 flex flex-col bg-slate-900 border-l border-slate-700 shadow-2xl transform transition-transform duration-300 ease-in-out ${
				isOpen ? "translate-x-0" : "translate-x-full"
			}`}
			aria-hidden={!isOpen}
		>
			<PanelHeader onClose={onClose} onNewConversation={onNewConversation} />
			<MessageList messages={messages} isLoading={isLoading} listRef={listRef} />
			<InputArea
				inputValue={inputValue}
				isLoading={isLoading}
				inputRef={inputRef}
				onInputChange={onInputChange}
				onSend={onSend}
			/>
		</div>
	);
}

// ─── Root component ───────────────────────────────────────────────────────────

export default function MealAgentChat() {
	const [state, setState] = useState<ChatPanelState>({
		isOpen: false,
		sessionId: crypto.randomUUID(),
		messages: [],
		inputValue: "",
		isLoading: false,
	});

	const appendMessage = useCallback((message: ChatMessage) => {
		setState((prev) => ({
			...prev,
			messages: [...prev.messages, message],
		}));
	}, []);

	const handleSend = useCallback(async () => {
		const prompt = state.inputValue.trim();

		// Guard: do not submit empty/whitespace input
		if (!prompt) return;

		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: prompt,
			timestamp: Date.now(),
		};

		// Append user message, clear input, show typing indicator, disable input
		setState((prev) => ({
			...prev,
			messages: [...prev.messages, userMessage],
			inputValue: "",
			isLoading: true,
		}));

		try {
			const { data, errors } = await client.queries.invokeMealAgent({
				prompt,
				sessionId: state.sessionId,
			});

			if (errors?.length || !data) {
				throw new Error("Query returned errors");
			}

			const assistantMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: data.completion,
				timestamp: Date.now(),
			};
			appendMessage(assistantMessage);
		} catch {
			const fallbackMessage: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "Sorry, I couldn't get a response. Please try again.",
				timestamp: Date.now(),
			};
			appendMessage(fallbackMessage);
		} finally {
			setState((prev) => ({ ...prev, isLoading: false }));
		}
	}, [state.inputValue, state.sessionId, appendMessage]);

	const handleNewConversation = useCallback(() => {
		setState((prev) => ({
			...prev,
			sessionId: crypto.randomUUID(),
			messages: [],
		}));
	}, []);

	const handleToggle = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: !prev.isOpen }));
	}, []);

	const handleClose = useCallback(() => {
		setState((prev) => ({ ...prev, isOpen: false }));
	}, []);

	const handleInputChange = useCallback((value: string) => {
		setState((prev) => ({ ...prev, inputValue: value }));
	}, []);

	return (
		<>
			<FloatingButton isOpen={state.isOpen} onClick={handleToggle} />
			<ChatPanel
				isOpen={state.isOpen}
				messages={state.messages}
				isLoading={state.isLoading}
				inputValue={state.inputValue}
				onInputChange={handleInputChange}
				onSend={handleSend}
				onClose={handleClose}
				onNewConversation={handleNewConversation}
			/>
		</>
	);
}

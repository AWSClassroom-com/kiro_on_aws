# Implementation Plan: Meal Agent Chat

## Overview

Add a conversational AI panel to the Food Tracker page. A floating button opens a slide-in chat panel backed by a new `invoke-meal-agent` Lambda that calls the Bedrock Agent Runtime. The Lambda buffers the full streamed response into one string before returning. All state lives in a single `MealAgentChat` component tree.

Tasks are ordered by dependency — each task is one diff. The first task installs the new SDK package; subsequent tasks build on each other and end with wiring the component into the page.

## Tasks

- [x] 1. Install `@aws-sdk/client-bedrock-agent-runtime` dependency
  - Add `"@aws-sdk/client-bedrock-agent-runtime": "3.1039.0"` to `amplify/package.json` dependencies (pin to the same version already used by the other SDK packages)
  - Files: `amplify/package.json`
  - _Requirements: 6.1_

- [x] 2. Define the `invoke-meal-agent` Amplify Function resource
  - Create `amplify/functions/invoke-meal-agent/resource.ts` using `defineFunction` with `name: "invoke-meal-agent"`, `entry: "./handler.ts"`, `timeoutSeconds: 60`, `resourceGroupName: "data"`
  - Files: `amplify/functions/invoke-meal-agent/resource.ts`
  - _Design: "Amplify Function Definition" section_
  - _Requirements: 6.1_

- [x] 3. Implement the `invoke-meal-agent` Lambda handler
  - Create `amplify/functions/invoke-meal-agent/handler.ts`
  - Import `BedrockAgentRuntimeClient` and `InvokeAgentCommand` from `@aws-sdk/client-bedrock-agent-runtime`
  - Construct the client with `{ region: process.env.AWS_REGION }` — no static credentials
  - Read `AGENT_ID` and `AGENT_ALIAS_ID` from `process.env`
  - Call `InvokeAgentCommand` with `agentId`, `agentAliasId`, `sessionId`, and `inputText` (= `prompt`)
  - Iterate `response.completion` async-iterable; decode each chunk's `bytes` with `TextDecoder` and concatenate into a single string
  - Return `{ sessionId, completion }`
  - Wrap everything in a try/catch; on any error log it and return `{ sessionId, completion: "Sorry, I couldn't get a response. Please try again." }` — never throw
  - Inline validation only: guard against missing `prompt` or `sessionId` in `event.arguments`
  - Files: `amplify/functions/invoke-meal-agent/handler.ts`
  - _Design: "Lambda Handler Shape" and "Lambda Error Handling Pattern" sections_
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 4. Add `AgentResponse` custom type and `invokeMealAgent` query to the AppSync schema
  - Edit `amplify/data/resource.ts`
  - Import `invokeMealAgentFunction` from `../functions/invoke-meal-agent/resource`
  - Add `AgentResponse` custom type with `sessionId` (required string) and `completion` (required string)
  - Add `invokeMealAgent` query: arguments `prompt` (required string) and `sessionId` (required string), returns `AgentResponse`, handler `a.handler.function(invokeMealAgentFunction)`, authorization `allow.publicApiKey()` (stepping stone — project has no Cognito; switch to `allow.authenticated()` once Cognito is added)
  - Files: `amplify/data/resource.ts`
  - _Design: "AppSync Schema Additions" section_
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Wire the function into `backend.ts` and grant `bedrock:InvokeAgent` IAM permission
  - Edit `amplify/backend.ts`
  - Import `invokeMealAgentFunction` and add it to `defineBackend`
  - Set `AGENT_ID` and `AGENT_ALIAS_ID` environment variables on the Lambda (`0PFG4K6M5I` / `VBFPV7MGRM`)
  - Construct the agent alias ARN at synth time using `Stack.of(...)` (region + account — no hardcoded account ID)
  - Add a `PolicyStatement` granting `bedrock:InvokeAgent` on that ARN to the Lambda's execution role
  - Files: `amplify/backend.ts`
  - _Design: "Environment Variables" and agent alias ARN construction sections_
  - _Requirements: 6.6, 6.7_

- [x] 6. Build the `MealAgentChat` component
  - Create `src/components/MealAgentChat.tsx`
  - Implement `ChatMessage`, `ChatPanelState`, `FloatingButtonProps`, `ChatPanelProps` interfaces as defined in the design
  - `MealAgentChat` owns all state (`isOpen`, `sessionId`, `messages`, `inputValue`, `isLoading`)
  - `FloatingButton`: fixed bottom-right, label "Ask the meal assistant", accessible `aria-label`, toggles panel
  - `ChatPanel`: slide-in/out CSS transition from right edge; header with title "Meal Assistant", "New conversation" button, close button (with `aria-label`); scrollable `MessageList` with `role="log"` and `aria-live="polite"`; `InputArea` pinned to bottom with text input and Send button
  - User messages: right-aligned, cyan accent; assistant messages: left-aligned, slate accent (visually distinct CSS classes)
  - `TypingIndicator`: animated dots, rendered while `isLoading` is true
  - `handleSend`: guard empty/whitespace input (do not call query, do not add message); append user message; show typing indicator; disable input + Send; call `client.queries.invokeMealAgent({ prompt, sessionId })`; on success append assistant message; on error append fallback "Sorry, I couldn't get a response. Please try again."; in `finally` remove typing indicator and re-enable input
  - `onNewConversation`: generate new `crypto.randomUUID()` session ID, clear messages array
  - On panel open: move focus to text input (`useEffect` + `ref`)
  - Enter key in input field submits (same as Send button click)
  - Files: `src/components/MealAgentChat.tsx`
  - _Design: "React Component Tree", "FloatingButton Props", "ChatPanel Props", "React Error Handling Pattern" sections_
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7. Integrate `MealAgentChat` into the Food Tracker page
  - Edit `src/routes/food-tracker.tsx`
  - Import `MealAgentChat` from `@/components/MealAgentChat`
  - Render `<MealAgentChat />` as the last child inside the `FoodTracker` component's return (after the existing content sections, so the floating button sits above everything)
  - No other changes to the page's existing state or layout
  - Files: `src/routes/food-tracker.tsx`
  - _Design: "React Component Tree" section (FoodTracker as root)_
  - _Requirements: 1.1_

- [x] 8. Checkpoint — verify the full stack compiles and the panel renders
  - Ensure `amplify/` TypeScript compiles without errors (`tsc --noEmit` in `amplify/`)
  - Ensure frontend TypeScript compiles without errors (`tsc --noEmit` at root)
  - Ensure `npm run lint` passes (Biome)
  - Ask the user if any questions arise before proceeding to tests

- [x] 9. Write unit and property-based tests for the Lambda handler
  - [x] 9.1 Create `amplify/functions/invoke-meal-agent/__tests__/handler.test.ts`
    - Unit test: `InvokeAgentCommand` called with correct `agentId` and `agentAliasId` (Requirement 6.1)
    - Unit test: error path returns fallback completion string without throwing (Requirement 8.1)
    - _Requirements: 6.1, 8.1_
  - [x] 9.2 Write property test — Lambda forwards prompt and sessionId unchanged (Property 6)
    - **Property 6: Lambda forwards prompt and sessionId unchanged**
    - **Validates: Requirements 6.2**
    - File: `amplify/functions/invoke-meal-agent/__tests__/handler.pbt.test.ts`
  - [x] 9.3 Write property test — chunk concatenation round-trip (Property 7)
    - **Property 7: Chunk concatenation round-trip**
    - **Validates: Requirements 6.3, 6.4, 6.5**
    - File: `amplify/functions/invoke-meal-agent/__tests__/handler.pbt.test.ts`

- [x] 10. Write unit and property-based tests for the React components
  - [x] 10.1 Create `src/components/__tests__/MealAgentChat.test.tsx`
    - Unit tests: FloatingButton renders with correct label and aria-label (Requirement 1.2, 9.1)
    - Unit tests: ChatPanel structure — header title, buttons, messages area, input area (Requirements 2.3–2.6)
    - Unit tests: typing indicator visible while loading, hidden after response (Requirements 4.2, 7.1)
    - Unit tests: input and Send button disabled while in-flight (Requirement 4.4)
    - Unit tests: accessibility attributes — `role="log"`, `aria-live="polite"`, `aria-label` on close button, focus on open (Requirements 9.2–9.4)
    - _Requirements: 1.2, 2.3, 2.4, 2.5, 2.6, 4.2, 4.4, 7.1, 9.1, 9.2, 9.3, 9.4_
  - [x] 10.2 Write property test — session ID is always a valid UUID (Property 1)
    - **Property 1: Session ID is always a valid UUID**
    - **Validates: Requirements 3.1**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.3 Write property test — new conversation produces distinct session ID and clears messages (Property 2)
    - **Property 2: New conversation produces a distinct session ID and clears messages**
    - **Validates: Requirements 3.3**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.4 Write property test — submitted prompt appears in messages area (Property 3)
    - **Property 3: Submitted prompt appears in the messages area**
    - **Validates: Requirements 4.1**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.5 Write property test — input field cleared after submission (Property 4)
    - **Property 4: Input field is cleared after submission**
    - **Validates: Requirements 4.3**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.6 Write property test — empty/whitespace input is rejected (Property 5)
    - **Property 5: Empty or whitespace-only input is rejected**
    - **Validates: Requirements 4.5**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.7 Write property test — successful response appears as assistant message (Property 8)
    - **Property 8: Successful response appears as assistant message**
    - **Validates: Requirements 7.1**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.8 Write property test — user and assistant messages are visually distinct (Property 9)
    - **Property 9: User and assistant messages are visually distinct**
    - **Validates: Requirements 7.2**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.9 Write property test — error produces fallback message and re-enables input (Property 10)
    - **Property 10: Error produces fallback message and re-enables input**
    - **Validates: Requirements 8.1, 8.3**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`
  - [x] 10.10 Write property test — Enter key submits same as Send button (Property 11)
    - **Property 11: Enter key submits the same way as the Send button**
    - **Validates: Requirements 9.5**
    - File: `src/components/__tests__/MealAgentChat.pbt.test.tsx`

- [x] 11. Final checkpoint — ensure all tests pass
  - Run `npm test` and confirm all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests use **fast-check** (`npm install --save-dev fast-check`) with Vitest; install it before running the PBT tasks
- The `invokeMealAgent` query uses `allow.publicApiKey()` as a stepping stone because the project has no Cognito setup; switch to `allow.authenticated()` once Cognito is added (design note preserved)
- The Lambda never throws — all Bedrock errors are caught and returned as the fallback completion string so AppSync always receives a valid response
- The Lambda uses `process.env.AWS_REGION` (injected automatically by the Lambda runtime) and the SDK default credential chain — no static AWS credentials anywhere

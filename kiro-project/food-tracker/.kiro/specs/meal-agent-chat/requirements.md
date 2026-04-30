# Requirements Document

## Introduction

The Meal Agent Chat feature adds a conversational AI panel to the Food Tracker page. A floating button in the bottom-right corner opens a slide-in side panel where authenticated users can chat with the MealRecommendationAgent — an Amazon Bedrock Agent that has access to the user's food data. Each conversation is identified by a client-generated session ID that persists across messages until the user explicitly starts a new conversation. The chat is backed by a new AppSync custom query (`invokeMealAgent`) handled by a new Amplify Function (`invoke-meal-agent`) that calls the Bedrock Agent Runtime API using the Lambda execution role — no static AWS credentials are used anywhere.

---

## Glossary

- **Chat_Panel**: The slide-in side panel that contains the conversation UI.
- **Floating_Button**: The "Ask the meal assistant" button fixed to the bottom-right of the Food Tracker page.
- **MealRecommendationAgent**: The Amazon Bedrock Agent (ID: `0PFG4K6M5I`, Alias: `VBFPV7MGRM`) that responds to user prompts.
- **Session**: A single continuous conversation identified by a UUID generated with `crypto.randomUUID()`.
- **Session_ID**: A UUID string that groups messages into a single Bedrock Agent session.
- **InvokeMealAgent_Query**: The AppSync custom GraphQL query `invokeMealAgent(prompt, sessionId)` that returns `{ sessionId, completion }`.
- **Invoke_Agent_Function**: The Amplify Function (`invoke-meal-agent`) that calls the Bedrock Agent Runtime `InvokeAgentCommand`.
- **Message**: A single turn in the conversation — either a user prompt or an assistant completion.
- **Typing_Indicator**: An animated visual element shown while the Invoke_Agent_Function is processing a response.
- **Fallback_Message**: A user-friendly error string displayed in the Chat_Panel when the InvokeMealAgent_Query fails.

---

## Requirements

### Requirement 1: Floating Entry-Point Button

**User Story:** As a food tracker user, I want a persistent button on the Food Tracker page, so that I can open the Meal Assistant chat at any time without navigating away.

#### Acceptance Criteria

1. THE Chat_Panel trigger SHALL be rendered as a Floating_Button fixed to the bottom-right corner of the Food Tracker page viewport.
2. THE Floating_Button SHALL display the label "Ask the meal assistant".
3. WHEN the Floating_Button is clicked, THE Chat_Panel SHALL open.
4. WHILE the Chat_Panel is open, THE Floating_Button SHALL remain visible so the user can close the panel by clicking it again.

---

### Requirement 2: Chat Panel Layout and Slide-In Animation

**User Story:** As a food tracker user, I want the chat panel to slide in from the right side of the screen, so that I can see the conversation without losing context of the food tracker page.

#### Acceptance Criteria

1. WHEN the Chat_Panel opens, THE Chat_Panel SHALL animate by sliding in from the right edge of the viewport.
2. WHEN the Chat_Panel closes, THE Chat_Panel SHALL animate by sliding out to the right edge of the viewport.
3. THE Chat_Panel SHALL contain a header section with the title "Meal Assistant", a "New conversation" button, and a close button.
4. THE Chat_Panel SHALL contain a scrollable messages area that displays the conversation history.
5. THE Chat_Panel SHALL contain an input area pinned to the bottom with a text input field and a "Send" button.
6. WHEN the close button is clicked, THE Chat_Panel SHALL close.

---

### Requirement 3: Session Management

**User Story:** As a food tracker user, I want my conversation to persist across multiple messages, so that the assistant can remember context from earlier in our chat.

#### Acceptance Criteria

1. WHEN the Chat_Panel is opened for the first time in a page session, THE Chat_Panel SHALL generate a Session_ID using `crypto.randomUUID()`.
2. THE Chat_Panel SHALL reuse the same Session_ID for all subsequent messages within the same conversation.
3. WHEN the "New conversation" button is clicked, THE Chat_Panel SHALL generate a new Session_ID using `crypto.randomUUID()` and clear all messages from the messages area.

---

### Requirement 4: Sending Messages

**User Story:** As a food tracker user, I want to type a message and send it to the Meal Assistant, so that I can ask questions about my food and get personalised recommendations.

#### Acceptance Criteria

1. WHEN the user submits a non-empty prompt (via the Send button or pressing Enter), THE Chat_Panel SHALL append the user's message to the messages area immediately.
2. WHEN the user submits a prompt, THE Chat_Panel SHALL display the Typing_Indicator in the messages area.
3. WHEN the user submits a prompt, THE Chat_Panel SHALL clear the text input field.
4. WHILE a request is in-flight, THE Chat_Panel SHALL disable the text input field and the Send button to prevent duplicate submissions.
5. IF the text input field is empty, THEN THE Chat_Panel SHALL NOT submit the prompt.

---

### Requirement 5: AppSync Query — invokeMealAgent

**User Story:** As a developer, I want a typed AppSync custom query for invoking the Meal Agent, so that the frontend can call it through the generated Amplify client.

#### Acceptance Criteria

1. THE AppSync_Schema SHALL define a custom query `invokeMealAgent` that accepts `prompt` (required string) and `sessionId` (required string) arguments.
2. THE AppSync_Schema SHALL define the return type of `invokeMealAgent` as a custom type containing `sessionId` (required string) and `completion` (required string).
3. THE AppSync_Schema SHALL restrict the `invokeMealAgent` query to authenticated users via `allow.authenticated()` authorization.
4. THE AppSync_Schema SHALL attach the Invoke_Agent_Function as the handler for the `invokeMealAgent` query.

---

### Requirement 6: Invoke Agent Lambda Function

**User Story:** As a developer, I want a Lambda function that calls the Bedrock Agent Runtime, so that user prompts are forwarded to the MealRecommendationAgent and the streamed response is returned as a single string.

#### Acceptance Criteria

1. THE Invoke_Agent_Function SHALL call the Bedrock Agent Runtime `InvokeAgentCommand` with Agent ID `0PFG4K6M5I` and Alias ID `VBFPV7MGRM`.
2. THE Invoke_Agent_Function SHALL pass the `prompt` argument as the `inputText` and the `sessionId` argument as the `sessionId` to `InvokeAgentCommand`.
3. THE Invoke_Agent_Function SHALL iterate the async-iterable `response.completion` stream returned by `InvokeAgentCommand`.
4. THE Invoke_Agent_Function SHALL decode each chunk's `bytes` field using `TextDecoder` and concatenate all decoded strings into a single completion string.
5. THE Invoke_Agent_Function SHALL return the `sessionId` and the concatenated `completion` string to the caller.
6. THE Invoke_Agent_Function SHALL use the Lambda execution role's credentials via the AWS SDK default credential chain — it SHALL NOT read `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_PROFILE`, or any static credential environment variables.
7. THE Invoke_Agent_Function SHALL be granted `bedrock:InvokeAgent` permission on the MealRecommendationAgent resource ARN via its IAM execution role policy.

---

### Requirement 7: Displaying Assistant Responses

**User Story:** As a food tracker user, I want to see the assistant's reply appear in the chat after I send a message, so that I can read the recommendation.

#### Acceptance Criteria

1. WHEN the InvokeMealAgent_Query returns successfully, THE Chat_Panel SHALL remove the Typing_Indicator and append the assistant's completion as a new Message in the messages area.
2. THE Chat_Panel SHALL visually distinguish user messages from assistant messages (e.g., different alignment or background colour).
3. WHEN a new Message is appended, THE Chat_Panel SHALL scroll the messages area to show the latest message.

---

### Requirement 8: Error Handling

**User Story:** As a food tracker user, I want to see a friendly message if the assistant is unavailable, so that I am not left with a broken or empty UI.

#### Acceptance Criteria

1. IF the InvokeMealAgent_Query returns an error, THEN THE Chat_Panel SHALL remove the Typing_Indicator and display the Fallback_Message "Sorry, I couldn't get a response. Please try again." as an assistant message.
2. IF the InvokeMealAgent_Query returns an error, THEN THE Chat_Panel SHALL NOT throw an unhandled exception.
3. IF the InvokeMealAgent_Query returns an error, THEN THE Chat_Panel SHALL re-enable the text input field and the Send button so the user can retry.

---

### Requirement 9: Accessibility

**User Story:** As a user relying on assistive technology, I want the chat panel to be keyboard-navigable and screen-reader friendly, so that I can use the Meal Assistant without a mouse.

#### Acceptance Criteria

1. THE Floating_Button SHALL have an accessible label readable by screen readers.
2. THE Chat_Panel close button SHALL have an accessible label readable by screen readers.
3. THE Chat_Panel messages area SHALL have `role="log"` and `aria-live="polite"` so screen readers announce new messages.
4. WHEN the Chat_Panel opens, THE Chat_Panel SHALL move focus to the text input field.
5. WHEN the user presses the Enter key in the text input field, THE Chat_Panel SHALL submit the prompt (equivalent to clicking the Send button).

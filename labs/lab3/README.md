# Lab 3: Hooks and Product Recommendations

## Overview

In this lab, you will implement two practical features that address real-world development needs. First, you will create Kiro hooks to automate security scanning and code quality enforcement. Second, you will build a personalized product recommendation engine using Amazon Bedrock Agents.

By the end of this lab, your application will automatically prevent credential leaks and provide users with AI-powered product recommendations based on their purchase and browsing history.

## Prerequisites

- Lab 2 completed (review summarization feature implemented)
- Kiro IDE installed and configured
- AWS Console access with permissions for Amazon Bedrock
- acme-webshop project open in Kiro
- AWS region set to `us-east-1`

## Time Estimate

65 minutes

## Learning Objectives

By the end of this lab, you will be able to:
- Create Kiro hooks using natural language descriptions
- Configure security scanning hooks that block commits containing credentials
- Set up code quality hooks that provide warnings without blocking
- Create and configure Amazon Bedrock Agents with action groups
- Implement Lambda functions for agent tools
- Integrate personalized recommendations into a React application

**Course Repository:** **https://github.com/AWSClassroom-com/kiro_on_aws**

---

## Part A: Creating the Security Scanning Hook

In this section, you will create a pre-commit hook that automatically scans for accidentally committed secrets such as AWS keys, API keys, and database credentials.

### Step 1: Open the Hooks Panel

1. In Kiro, locate the **Hooks** icon in the activity bar on the left side (lightning bolt symbol).
2. Click the Hooks icon to open the panel.
3. Review any existing hooks from previous labs.

**Expected Result:** The Hooks panel opens, displaying a list of existing hooks (if any) and a button to create new hooks.

### Step 2: Create a New Security Hook

1. Click **Create New Hook**.
2. In the description field, enter the following:

```
Create a pre-commit hook that scans TypeScript and JavaScript files for accidentally committed secrets. Look for:
- AWS access keys (AKIA followed by 16 characters)
- AWS secret keys (40 character strings near "secret" keywords)
- API keys assigned to variables
- Private keys (BEGIN PRIVATE KEY)
- Database connection strings with passwords

If any secrets are found, block the commit and show exactly where the secret is located. Ignore environment variable references like process.env.SECRET and common placeholder values like "YOUR_KEY_HERE".
```

3. Click **Generate Hook**.

**Expected Result:** Kiro generates a YAML configuration for the hook. Wait for the generation to complete (5-10 seconds).

### Step 3: Review the Generated Configuration

Examine the generated hook configuration. It should look similar to:

```yaml
name: Security Credential Scanner
description: Scans for accidentally committed secrets
trigger:
  event: pre-commit
  files:
    include:
      - "**/*.ts"
      - "**/*.tsx"
      - "**/*.js"
      - "**/*.jsx"
      - "**/*.json"
    exclude:
      - "node_modules/**"
      - "**/*.test.ts"
      - "**/*.spec.ts"
      - "dist/**"
action: block
system_prompt: |
  You are a security scanner. Analyze the provided code for secrets.

  DETECT these patterns:
  1. AWS Access Keys: AKIA[0-9A-Z]{16}
  2. AWS Secret Keys: 40-character strings near "secret", "key", "aws"
  3. API Keys: strings assigned to variables like apiKey, api_key
  4. Private Keys: -----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----
  5. Connection strings: mongodb://, postgres://, mysql:// with passwords

  IGNORE:
  - process.env.* references
  - Placeholder values: YOUR_KEY_HERE, xxx, placeholder, example
  - AWS example keys from documentation

  OUTPUT JSON:
  {"blocked": boolean, "findings": [{"type": string, "line": number, "match": string, "recommendation": string}]}
```

1. Verify the trigger is set to `event: pre-commit`.
2. Confirm the action is set to `block`.
3. Check that `node_modules/**` and `dist/**` are excluded.

### Step 4: Save the Security Hook

1. Make any necessary adjustments to the patterns or exclusions.
2. Click **Save Hook**.

**Expected Result:** The hook appears in your Hooks panel with an enabled status.

### Step 5: Test the Security Hook

1. Create a new test file by opening the terminal in Kiro and running:
   ```bash
   touch src/test-secrets.ts
   ```

2. Open `src/test-secrets.ts` and add the following content:
   ```typescript
   // This file is for testing the security hook
   const awsAccessKey = "AKIAIOSFODNN7EXAMPLE";
   const awsSecretKey = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";
   const apiKey = "sk-1234567890abcdef";
   ```

3. Save the file.
4. In the terminal, attempt to commit:
   ```bash
   git add src/test-secrets.ts
   git commit -m "Test commit"
   ```

**Expected Result:** The commit should be **blocked**. You should see output similar to:

```
Security Hook: Commit blocked. Found 3 potential secrets:
- Line 2: AWS Access Key pattern detected
- Line 3: AWS Secret Key pattern detected
- Line 4: API Key pattern detected
```

### Step 6: Clean Up the Test File

1. Delete the test file:
   ```bash
   rm src/test-secrets.ts
   git restore src/test-secrets.ts 2>/dev/null || true
   ```

**Expected Result:** The test file is removed and no longer staged for commit.

---

## Part B: Creating the Code Quality Hook

In this section, you will create a non-blocking hook that warns about code quality issues when files are saved.

### Step 7: Create the Code Quality Hook

1. In the Hooks panel, click **Create New Hook**.
2. Enter the following description:

```
Create a hook that runs on file save for TypeScript files. Check for:
- Console.log statements (should be removed before commit)
- Unused variables
- Missing return types on exported functions
- TODO comments without associated issue numbers

Don't block, just show warnings. Also suggest fixes where possible.
```

3. Click **Generate Hook**

**Expected Result:** Kiro generates a YAML configuration with `event: file_save` and `action: alert`.

### Step 8: Review and Save the Quality Hook

1. Verify the configuration includes:
   - `trigger.event: file_save`
   - `action: alert` (not `block`)
   - File patterns for `.ts` and `.tsx` files

2. Click **Save Hook**.

**Expected Result:** The code quality hook appears in the Hooks panel.

### Step 9: Test the Code Quality Hook

1. Open any TypeScript file in your project (e.g., `src/App.tsx`).
2. Add a console.log statement anywhere in the file:
   ```typescript
   console.log("debug output");
   ```
3. Save the file.

**Expected Result:** A warning notification appears indicating the console.log statement. The save completes successfully (not blocked).

4. Remove the console.log statement and save again.

**Expected Result:** The warning disappears.

---

## Part C: Setting Up Amazon Bedrock Agents

In this section, you will create a Bedrock Agent that provides personalized product recommendations.

### Step 10: Navigate to Bedrock Agents

1. Open the AWS Console at https://console.aws.amazon.com
2. Ensure you are in the `us-east-1` region.
3. Search for **Bedrock** in the services search bar.
4. Click **Amazon Bedrock**.
5. In the left navigation, click **Agents**.

**Expected Result:** The Bedrock Agents page displays with options to create and manage agents.

### Step 11: Create the Recommendation Agent

1. Click **Create Agent**.
2. Configure the agent with these settings:
   - **Name:** `ProductRecommendationAgent`
   - **Description:** `Provides personalized product recommendations based on user history and preferences`
   - **Foundation Model:** Select **Claude 3.5 Sonnet** (or the latest available Sonnet model)

### Step 12: Configure Agent Instructions

1. In the **Agent instructions** field, enter:

```
You are a helpful shopping assistant for an e-commerce application.
Your job is to recommend products based on the user's:
- Purchase history
- Browsing history
- Stated preferences
- Current context

When making recommendations:
1. First understand what the user is looking for
2. Use the available tools to gather relevant data
3. Analyze patterns in their history
4. Recommend 3-5 products with explanations
5. Explain WHY each product is a good fit

Be conversational and helpful. If you don't have enough data,
ask clarifying questions.
```

2. Click **Save**.

**Expected Result:** The agent configuration is saved. Note the Agent ID displayed on the page.

### Step 13: Create the Action Group

1. In the agent configuration, click **Add action group**.
2. Configure the action group:
   - **Action group name:** `UserDataTools`
   - **Description:** `Tools for retrieving user data`

### Step 14: Define the Agent Tools

Add the following four actions to the action group:

**Action 1 - Get Purchase History:**
- Name: `getPurchaseHistory`
- Description: `Retrieves the user's past purchases`
- Parameters:
  - `userId` (string, required)
  - `limit` (number, optional, default: 10)

**Action 2 - Get Browsing History:**
- Name: `getBrowsingHistory`
- Description: `Gets products the user recently viewed`
- Parameters:
  - `userId` (string, required)
  - `days` (number, optional, default: 7)

**Action 3 - Find Similar Products:**
- Name: `findSimilarProducts`
- Description: `Finds products similar to a given product`
- Parameters:
  - `productId` (string, required)
  - `limit` (number, optional)

**Action 4 - Get Product Details:**
- Name: `getProductDetails`
- Description: `Gets full details for a product including reviews`
- Parameters:
  - `productId` (string, required)

Click **Create action group**

**Expected Result:** The action group appears in the agent configuration with all four tools defined.

### Step 15: Create the Lambda Function for Tools

1. In Kiro, create a new file `api/functions/agent-tools.ts`.
2. Add the following code:

```typescript
import { DynamoDBClient, QueryCommand, GetCommand } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

const dynamodb = new DynamoDBClient({ region: "us-east-1" });

interface AgentEvent {
  actionGroup: string;
  function: string;
  parameters: Record<string, string>;
}

export const handler = async (event: AgentEvent) => {
  const { function: functionName, parameters } = event;

  switch (functionName) {
    case "getPurchaseHistory":
      return await getPurchaseHistory(
        parameters.userId,
        parseInt(parameters.limit || "10")
      );

    case "getBrowsingHistory":
      return await getBrowsingHistory(
        parameters.userId,
        parseInt(parameters.days || "7")
      );

    case "findSimilarProducts":
      return await findSimilarProducts(
        parameters.productId,
        parseInt(parameters.limit || "5")
      );

    case "getProductDetails":
      return await getProductDetails(parameters.productId);

    default:
      throw new Error(`Unknown function: ${functionName}`);
  }
};

async function getPurchaseHistory(userId: string, limit: number) {
  const result = await dynamodb.send(
    new QueryCommand({
      TableName: "Purchases",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
      },
      Limit: limit,
      ScanIndexForward: false, // Most recent first
    })
  );

  return {
    purchases: result.Items?.map((item) => unmarshall(item)) || [],
  };
}

async function getBrowsingHistory(userId: string, days: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: "BrowsingHistory",
      KeyConditionExpression: "userId = :userId AND viewedAt > :cutoff",
      ExpressionAttributeValues: {
        ":userId": { S: userId },
        ":cutoff": { S: cutoffDate.toISOString() },
      },
    })
  );

  return {
    viewedProducts: result.Items?.map((item) => unmarshall(item)) || [],
  };
}

async function findSimilarProducts(productId: string, limit: number) {
  const product = await getProductDetails(productId);

  const result = await dynamodb.send(
    new QueryCommand({
      TableName: "Products",
      IndexName: "category-index",
      KeyConditionExpression: "category = :category",
      ExpressionAttributeValues: {
        ":category": { S: product.product.category },
      },
      Limit: limit + 1,
    })
  );

  return {
    similarProducts:
      result.Items?.map((item) => unmarshall(item)).filter(
        (p) => p.productId !== productId
      ) || [],
  };
}

async function getProductDetails(productId: string) {
  const result = await dynamodb.send(
    new GetCommand({
      TableName: "Products",
      Key: { productId: { S: productId } },
    })
  );

  return {
    product: result.Item ? unmarshall(result.Item) : null,
  };
}
```

3. Save the file

**Expected Result:** The Lambda function file is created with all four tool implementations.

### Step 16: Connect Lambda to the Action Group

1. Return to the AWS Console (Bedrock Agents page).
2. In your agent's action group configuration, set the Lambda function to the deployed `agent-tools` function.
3. Save the action group.

**Note:** You will deploy this Lambda function in Lab 4. For now, ensure the code is ready.

---

## Part D: Integrating Recommendations into the Application

In this section, you will create the API endpoint and frontend component for the recommendation feature.

### Step 17: Create the Recommendations API

1. Create a new file `api/functions/recommendations.ts`.
2. Add the following code:

```typescript
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";

const client = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const AGENT_ID = process.env.RECOMMENDATION_AGENT_ID!;
const AGENT_ALIAS_ID = process.env.RECOMMENDATION_AGENT_ALIAS_ID!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Content-Type": "application/json",
};

function response(statusCode: number, body: object): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

// Input validation to prevent prompt injection attacks
const MAX_PROMPT_LENGTH = 500;
const BLOCKED_PATTERNS = [
  /ignore.*previous.*instructions/i,
  /disregard.*above/i,
  /system.*prompt/i,
  /you.*are.*now/i,
  /<\/?script>/i,
];

function sanitizePrompt(input: string): { valid: boolean; sanitized: string; error?: string } {
  if (!input || typeof input !== "string") {
    return { valid: true, sanitized: "" };
  }

  if (input.length > MAX_PROMPT_LENGTH) {
    return { valid: false, sanitized: "", error: `Prompt too long (max ${MAX_PROMPT_LENGTH} chars)` };
  }

  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(input)) {
      return { valid: false, sanitized: "", error: "Invalid prompt content" };
    }
  }

  const sanitized = input.replace(/<[^>]*>/g, "").trim();
  return { valid: true, sanitized };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  const userId = event.requestContext.authorizer?.userId;
  const body = JSON.parse(event.body || "{}");

  if (!userId) {
    return response(401, { error: "Unauthorized" });
  }

  const promptValidation = sanitizePrompt(body.prompt);
  if (!promptValidation.valid) {
    return response(400, { error: promptValidation.error });
  }

  const sessionId = `${userId}-${Date.now()}`;
  const prompt = promptValidation.sanitized ||
    "Based on my purchase and browsing history, what products would you recommend for me?";

  try {
    const agentResponse = await client.send(
      new InvokeAgentCommand({
        agentId: AGENT_ID,
        agentAliasId: AGENT_ALIAS_ID,
        sessionId,
        inputText: `User ID: ${userId}\n\nUser request: ${prompt}`,
      })
    );

    let fullResponse = "";
    if (agentResponse.completion) {
      for await (const agentEvent of agentResponse.completion) {
        if (agentEvent.chunk?.bytes) {
          fullResponse += new TextDecoder().decode(agentEvent.chunk.bytes);
        }
      }
    }

    return response(200, {
      success: true,
      recommendations: fullResponse,
      sessionId,
    });
  } catch (error) {
    console.error("Recommendation error:", error);
    return response(500, {
      success: false,
      error: "Failed to generate recommendations",
    });
  }
};
```

3. Save the file

**Expected Result:** The recommendations API handler is created with prompt injection protection.

### Step 18: Create the Frontend Component

1. Create a new file `src/components/RecommendationChat.tsx`.
2. Add the following code:

```tsx
import React, { useState } from "react";
import { getRecommendations } from "../services/api";

export const RecommendationChat: React.FC = () => {
  const [messages, setMessages] = useState<
    Array<{ role: "user" | "assistant"; content: string }>
  >([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setLoading(true);

    try {
      const response = await getRecommendations(userMessage);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.recommendations },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't generate recommendations. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recommendation-chat">
      <h3>Personal Shopping Assistant</h3>

      <div className="messages">
        {messages.length === 0 && (
          <div className="welcome">
            <p>Hi! I can help you find products based on your preferences.</p>
            <p>Try asking:</p>
            <ul>
              <li>"What should I buy based on my history?"</li>
              <li>"Find me something similar to my last purchase"</li>
              <li>"I'm looking for a gift under $50"</li>
            </ul>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`message ${msg.role}`}>
            <strong>{msg.role === "user" ? "You" : "Assistant"}:</strong>
            <p>{msg.content}</p>
          </div>
        ))}

        {loading && (
          <div className="message assistant loading">
            <span className="typing-indicator">Thinking...</span>
          </div>
        )}
      </div>

      <div className="input-area">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Ask for recommendations..."
          disabled={loading}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
};
```

3. Save the file.

**Expected Result:** The React component for the recommendation chat interface is created.

### Step 19: Add the Component to Your Application

1. Open your main page component (e.g., `src/App.tsx` or a product page).
2. Import the RecommendationChat component:
   ```typescript
   import { RecommendationChat } from "./components/RecommendationChat";
   ```
3. Add the component where you want the chat to appear:
   ```tsx
   <RecommendationChat />
   ```
4. Save the file.

**Expected Result:** The recommendation chat component is integrated into your application.

---

## Validation Checklist

Use this checklist to verify your lab completion:

- [ ] Security scanning hook created and enabled
- [ ] Security hook blocks commits containing AWS keys
- [ ] Security hook allows commits without secrets
- [ ] Code quality hook created and enabled
- [ ] Code quality hook shows warnings for console.log statements
- [ ] Bedrock Agent created with name `ProductRecommendationAgent`
- [ ] Action group `UserDataTools` created with 4 tools
- [ ] Lambda function `agent-tools.ts` created
- [ ] Recommendations API `recommendations.ts` created
- [ ] RecommendationChat component created and integrated
- [ ] All files saved without TypeScript errors

---

## Troubleshooting

### Issue: Hook does not trigger

**Symptoms:** No response when saving files or attempting commits.

**Solution:**
1. Open the Hooks panel and verify the hook is enabled (toggle should be on).
2. Check that the file patterns match the files you are editing.
3. Open the Kiro Output panel (View > Output) and check for error messages.
4. Try restarting Kiro if hooks were recently created.

### Issue: Agent returns generic responses

**Symptoms:** Recommendations are not personalized to the user.

**Solution:**
1. Verify the Lambda function is connected to the action group in Bedrock.
2. Check that the Lambda function has DynamoDB read permissions.
3. Ensure the test user has purchase and browsing history in the database.
4. Check CloudWatch logs for Lambda execution errors.

### Issue: Rate limit exceeded (429 error)

**Symptoms:** Bedrock returns "ThrottlingException" or 429 status.

**Solution:**
1. Reduce the frequency of test requests.
2. Wait 1-2 minutes before retrying.
3. Implement exponential backoff in your application code.
4. If this persists, contact AWS Support to request a quota increase.

### Issue: Prompt validation rejects legitimate messages

**Symptoms:** User messages are blocked with "Invalid prompt content" error.

**Solution:**
1. Review the BLOCKED_PATTERNS in `recommendations.ts`.
2. Adjust patterns if they are too aggressive for your use case.
3. For production, consider using Amazon Bedrock Guardrails for more sophisticated filtering.

---

## Summary

In this lab, you accomplished the following:

1. **Created a Security Scanning Hook** that automatically detects and blocks commits containing credentials, preventing accidental secret exposure
2. **Created a Code Quality Hook** that provides non-blocking warnings for code quality issues, improving code consistency
3. **Set Up an Amazon Bedrock Agent** with action groups and tools for personalized recommendations
4. **Implemented Lambda Functions** to execute agent tools and query DynamoDB for user data
5. **Built a Recommendation API** with prompt injection protection for security
6. **Created a React Chat Component** for users to interact with the recommendation agent

The hooks run locally on your machine, providing consistent automated feedback without external dependencies. The Bedrock Agent orchestrates multiple data sources to deliver personalized product recommendations.

---

## Next Steps

In **Lab 4: Deploy to AWS with CI/CD**, you will deploy the complete application to production using:
- AWS Amplify for frontend hosting
- AWS SAM for Lambda deployment
- GitHub Actions for CI/CD automation
- CloudWatch for monitoring and alerting

---

## Additional Resources

- [Kiro Hooks Documentation](https://kiro.dev/docs/hooks) - *Source: Kiro*
- [Amazon Bedrock Agents](https://docs.aws.amazon.com/bedrock/latest/userguide/agents.html) - *Source: AWS*
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/) - *Source: AWS*
- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) - *Source: OWASP*

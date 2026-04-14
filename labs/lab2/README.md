# Lab 2: Implement Review Summarization with Specs

## Overview
In this lab, you will build an AI-powered review summarization feature using Kiro's spec-driven development workflow. You will transform a natural language description into formal requirements, technical designs, and sequenced implementation tasks. The feature will integrate with Amazon Bedrock to generate summaries of customer reviews.

## Prerequisites
- Completed Lab 1 (Kiro installed, starter application running)
- AWS credentials configured (SSO or access keys)
- Amazon Bedrock access enabled with Claude model access
- Starter application running at `http://localhost:3000`

## Time Estimate
70 minutes

## Learning Objectives
By the end of this lab, you will be able to:
- Generate formal requirements from a natural language feature description
- Create technical design specifications with interface definitions
- Break work into sequenced implementation tasks
- Integrate Amazon Bedrock for AI-powered features
- Implement a complete feature using spec-driven development

**Course Repository:** **https://github.com/AWSClassroom-com/kiro_on_aws**

---

## Part A: Generate Requirements

### Step 1: Open the Specs Panel

1. In Kiro, click the **Specs** icon in the activity bar (document with lines icon)
2. Click **New Specification** or use the command palette:
   - **Windows/Linux:** `Ctrl + Shift + P`, type "Kiro: New Spec"
   - **macOS:** `Cmd + Shift + P`, type "Kiro: New Spec"

**Expected Result:** A dialog appears asking for a feature description.

### Step 2: Describe the Feature

1. Copy and paste the following feature description into the dialog:

```
Build an AI-powered review summarization feature for the product detail page.

Requirements:
- Display a concise 2-3 sentence summary of all reviews for a product
- Show a list of 3-5 key pros mentioned across reviews
- Show a list of 3-5 key cons mentioned across reviews
- Display overall sentiment (positive, neutral, or negative)
- Integrate with Amazon Bedrock using Claude Sonnet 4.5 for summarization
- Handle edge cases: products with fewer than 3 reviews should show a message instead of summary
- Cache summaries for 24 hours to reduce Bedrock API calls
- Summary must load within 3 seconds
```

2. Click **Generate Requirements**

3. Wait for Kiro to process (this may take 30-60 seconds)

**Expected Result:** Kiro generates a requirements document with user stories, acceptance criteria, non-functional requirements, and edge cases.

### Step 3: Review the Generated Requirements

1. Open the generated `requirements.md` file in the Specs panel

2. Locate and review each section:

   **User Stories:** Look for stories like:
   - "As a customer browsing products, I want to see a summary of reviews so that I can make informed purchasing decisions without reading every review."

   **Acceptance Criteria:** Look for testable conditions:
   - "Summary displays within 3 seconds of page load"
   - "Summary shows minimum 3 and maximum 5 pros and cons"
   - "Sentiment indicator shows positive, neutral, or negative"

   **Non-Functional Requirements:** Look for:
   - Performance requirements (response time limits)
   - Reliability requirements (error handling)
   - Caching requirements

   **Edge Cases:** Verify Kiro identified scenarios such as:
   - What if Bedrock is unavailable?
   - What if a product has too many reviews (token limits)?
   - What if reviews contain inappropriate content?

**Expected Result:** You have a comprehensive requirements document covering functional and non-functional aspects.

### Step 4: Refine and Approve Requirements

1. Review the requirements for completeness

2. If you need to add a requirement, either:
   - Edit the document directly, OR
   - Ask Kiro in the chat: "Add a requirement for caching summaries to avoid repeated Bedrock calls"

3. When satisfied, click **Approve Requirements**

**Expected Result:** Requirements are locked and you can proceed to design.

---

## Part B: Generate Design Specification

### Step 5: Generate Technical Design

1. In the Specs panel, click **Generate Design**

2. Wait for Kiro to generate the technical design (this may take 1-2 minutes)

**Expected Result:** Kiro generates a design document with architecture, interfaces, and error handling strategies.

### Step 6: Review Design Components

1. Open the generated `design.md` file

2. Review each section:

   **Architecture:** Look for a data flow description:
   - Frontend component requests summary
   - API endpoint receives request
   - Lambda function fetches reviews
   - Bedrock generates summary
   - Response cached and returned

   **Interface Definitions:** Verify TypeScript interfaces include:
   ```typescript
   interface ReviewSummary {
     summary: string;
     pros: string[];
     cons: string[];
     sentiment: 'positive' | 'neutral' | 'negative';
     reviewCount: number;
     generatedAt: string;
   }

   interface SummarizeRequest {
     productId: string;
     forceRefresh?: boolean;
   }

   interface SummarizeResponse {
     success: boolean;
     data?: ReviewSummary;
     error?: string;
   }
   ```

   **API Endpoint Design:** Look for:
   - Endpoint path (e.g., `POST /api/summarize`)
   - Request parameters
   - Response format
   - Error codes (400, 404, 500, 503)

   **Error Handling Strategy:** Verify mapping of failures to responses:
   - Bedrock timeout: Return cached summary or friendly error
   - Rate limited: Retry with exponential backoff
   - Invalid product: 404 response

**Expected Result:** You understand how the feature will be architected.

### Step 7: Approve the Design

1. Review the design for technical feasibility

2. Verify interfaces align with existing codebase patterns

3. Confirm error handling covers all edge cases from requirements

4. Click **Approve Design**

**Expected Result:** Design is locked and you can proceed to task generation.

---

## Part C: Generate Implementation Tasks

### Step 8: Generate Tasks

1. In the Specs panel, click **Generate Tasks**

2. Wait for Kiro to break down the work (30-60 seconds)

**Expected Result:** Kiro generates a list of discrete implementation tasks with dependencies.

### Step 9: Review Task Sequence

1. Open the generated `tasks.md` file

2. Verify you see four main tasks in this order:

   **Task 1: Create Bedrock Service Client**
   - Foundation task with no dependencies
   - Creates reusable client with error handling and retry logic

   **Task 2: Implement Summarization Prompt**
   - Depends on Task 1
   - Creates prompt template for Claude
   - Defines expected response format

   **Task 3: Create Summary API Endpoint**
   - Depends on Tasks 1 and 2
   - Lambda handler for summarization requests
   - Implements caching logic

   **Task 4: Add Frontend Summary Component**
   - Depends on Task 3
   - React component displaying summary
   - Handles loading and error states

**Expected Result:** Tasks are sequenced by dependency, ready for implementation.

---

## Part D: Implement the Feature

### Step 10: Set Up AWS Credentials and Enable Bedrock

**Configure AWS Credentials:**

**Option A - AWS SSO (Recommended):**
```bash
aws configure sso
```
Follow the prompts to configure your SSO session.

**Option B - Access Keys:**
```bash
aws configure
```
Enter your Access Key ID and Secret Access Key when prompted.

**Enable Bedrock Model Access:**

1. Open the AWS Console and navigate to **Amazon Bedrock**
2. In the left navigation, click **Model access**
3. Click **Manage model access**
4. Find **Anthropic** and check **Claude 3.5 Sonnet** (or Claude Sonnet 4.5 if available)
5. Click **Request model access**
6. Wait for access to be granted (usually immediate)

**Verify Setup:**
```bash
aws bedrock list-foundation-models --query "modelSummaries[?contains(modelId, 'claude')]" --output table
```

**Expected Result:** You see Claude models listed in the output.

### Step 10a: Create Type Definitions

1. Create a new file at `src/types/index.ts`

2. Add the following type definitions:

```typescript
export interface ProductReview {
  id: string;
  productId: string;
  rating: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface ReviewSummary {
  summary: string;
  pros: string[];
  cons: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  reviewCount: number;
  generatedAt: string;
}

export interface SummarizeRequest {
  productId: string;
  forceRefresh?: boolean;
}

export interface SummarizeResponse {
  success: boolean;
  data?: ReviewSummary;
  error?: string;
}
```

**Expected Result:** Type definitions are available for all components to use.

### Step 11: Implement Task 1 - Bedrock Service Client

1. In the Specs panel, click on **Task 1**

2. Create a new file at `src/services/bedrock.ts`

3. Add the following code:

```typescript
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });
const MODEL_ID = 'anthropic.claude-sonnet-4-5-20250929-v1:0';
const MAX_RETRIES = 3;

interface BedrockResponse {
  content: string;
}

export async function invokeModel(prompt: string): Promise<BedrockResponse> {
  const request = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: 2048,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  };

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const command = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(request),
      });

      const response = await client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      return {
        content: responseBody.content[0].text,
      };
    } catch (error) {
      lastError = error as Error;

      if (attempt < MAX_RETRIES) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Failed to invoke Bedrock model');
}
```

4. Save the file

5. In the Specs panel, mark **Task 1 as complete**

**Expected Result:** Bedrock client with retry logic is ready to use.

### Step 12: Implement Task 2 - Summarization Prompt

1. In the Specs panel, click on **Task 2**

2. Create a new file at `src/services/summarization.ts`

3. Add the following code:

```typescript
import { invokeModel } from './bedrock';
import { ProductReview, ReviewSummary } from '../types';

const MINIMUM_REVIEWS = 3;

function buildPrompt(reviews: ProductReview[]): string {
  const reviewText = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating}/5 stars):\n${r.content}`)
    .join('\n\n');

  return `Analyze the following product reviews and provide a summary.

${reviewText}

Respond with a JSON object in exactly this format:
{
  "summary": "A 2-3 sentence summary of the overall customer sentiment and experience",
  "pros": ["pro 1", "pro 2", "pro 3"],
  "cons": ["con 1", "con 2", "con 3"],
  "sentiment": "positive" | "neutral" | "negative"
}

Rules:
- Include 3-5 pros based on positive feedback mentioned in reviews
- Include 3-5 cons based on negative feedback mentioned in reviews
- Sentiment should be "positive" if average rating >= 4, "negative" if <= 2, otherwise "neutral"
- Return ONLY the JSON object, no additional text`;
}

export async function summarizeReviews(
  reviews: ProductReview[]
): Promise<ReviewSummary> {
  if (reviews.length < MINIMUM_REVIEWS) {
    throw new Error(
      `Insufficient reviews: need at least ${MINIMUM_REVIEWS}, got ${reviews.length}`
    );
  }

  const prompt = buildPrompt(reviews);
  const response = await invokeModel(prompt);

  try {
    const parsed = JSON.parse(response.content);

    return {
      summary: parsed.summary,
      pros: parsed.pros.slice(0, 5),
      cons: parsed.cons.slice(0, 5),
      sentiment: parsed.sentiment,
      reviewCount: reviews.length,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error('Failed to parse Bedrock response as JSON');
  }
}
```

4. Save the file

5. Mark **Task 2 as complete**

**Expected Result:** Summarization service is ready to process reviews.

### Step 12a: Create Supporting Services

**Cache Service:**

1. Create `src/services/cache.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb';
import { ReviewSummary } from '../types';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.CACHE_TABLE_NAME || 'acme-webshop-summary-cache';
const CACHE_TTL_HOURS = 24;

export async function getCachedSummary(
  productId: string
): Promise<ReviewSummary | null> {
  try {
    const response = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { productId },
      })
    );

    if (!response.Item) {
      return null;
    }

    // Check if cache is expired
    const cachedAt = new Date(response.Item.cachedAt);
    const now = new Date();
    const hoursSinceCached =
      (now.getTime() - cachedAt.getTime()) / (1000 * 60 * 60);

    if (hoursSinceCached > CACHE_TTL_HOURS) {
      return null;
    }

    return response.Item.summary as ReviewSummary;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

export async function cacheSummary(
  productId: string,
  summary: ReviewSummary
): Promise<void> {
  try {
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          productId,
          summary,
          cachedAt: new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.error('Cache write error:', error);
    // Don't throw - caching failure shouldn't break the feature
  }
}
```

**Reviews Service:**

2. Create `src/services/reviews.ts`:

```typescript
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ProductReview } from '../types';

const client = new DynamoDBClient({ region: 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.REVIEWS_TABLE_NAME || 'acme-webshop-reviews';

export async function getReviewsByProductId(
  productId: string
): Promise<ProductReview[]> {
  const response = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'productId = :pid',
      ExpressionAttributeValues: {
        ':pid': productId,
      },
    })
  );

  return (response.Items || []) as ProductReview[];
}
```

**Expected Result:** Supporting services for caching and review retrieval are ready.

### Step 13: Implement Task 3 - API Endpoint

1. In the Specs panel, click on **Task 3**

2. Create `api/functions/summarize.ts`:

```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { summarizeReviews } from '../../src/services/summarization';
import { getReviewsByProductId } from '../../src/services/reviews';
import { getCachedSummary, cacheSummary } from '../../src/services/cache';
import { SummarizeRequest, SummarizeResponse } from '../../src/types';

const MINIMUM_REVIEWS = 3;

export async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    // Parse request
    const body: SummarizeRequest = JSON.parse(event.body || '{}');
    const { productId, forceRefresh = false } = body;

    // Validate request
    if (!productId) {
      return buildResponse(400, {
        success: false,
        error: 'productId is required',
      });
    }

    // Check cache (unless force refresh requested)
    if (!forceRefresh) {
      const cached = await getCachedSummary(productId);
      if (cached) {
        return buildResponse(200, {
          success: true,
          data: cached,
        });
      }
    }

    // Fetch reviews
    const reviews = await getReviewsByProductId(productId);

    // Handle insufficient reviews
    if (reviews.length < MINIMUM_REVIEWS) {
      return buildResponse(200, {
        success: false,
        error: `This product has only ${reviews.length} reviews. At least ${MINIMUM_REVIEWS} reviews are needed to generate a summary.`,
      });
    }

    // Generate summary
    const summary = await summarizeReviews(reviews);

    // Cache the result
    await cacheSummary(productId, summary);

    return buildResponse(200, {
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error('Summarization error:', error);

    return buildResponse(500, {
      success: false,
      error: 'Unable to generate summary. Please try again later.',
    });
  }
}

function buildResponse(
  statusCode: number,
  body: SummarizeResponse
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}
```

3. Mark **Task 3 as complete**

**Expected Result:** API endpoint handles requests with validation, caching, and error handling.

### Step 14: Implement Task 4 - Frontend Component

1. In the Specs panel, click on **Task 4**

2. Create `src/components/ReviewSummary.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { ReviewSummary as ReviewSummaryType, SummarizeResponse } from '../types';

interface ReviewSummaryProps {
  productId: string;
}

export function ReviewSummary({ productId }: ReviewSummaryProps) {
  const [summary, setSummary] = useState<ReviewSummaryType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSummary() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId }),
        });

        const data: SummarizeResponse = await response.json();

        if (data.success && data.data) {
          setSummary(data.data);
        } else {
          setError(data.error || 'Failed to load summary');
        }
      } catch (err) {
        setError('Unable to connect to the server');
      } finally {
        setLoading(false);
      }
    }

    fetchSummary();
  }, [productId]);

  if (loading) {
    return (
      <div className="review-summary loading">
        <div className="spinner" />
        <p>Generating AI summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="review-summary error">
        <p>{error}</p>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  const sentimentColor = {
    positive: '#22c55e',
    neutral: '#6b7280',
    negative: '#ef4444',
  }[summary.sentiment];

  return (
    <div className="review-summary">
      <h3>AI Review Summary</h3>

      <div className="sentiment" style={{ color: sentimentColor }}>
        Overall: {summary.sentiment.charAt(0).toUpperCase() + summary.sentiment.slice(1)}
      </div>

      <p className="summary-text">{summary.summary}</p>

      <div className="pros-cons">
        <div className="pros">
          <h4>Pros</h4>
          <ul>
            {summary.pros.map((pro, index) => (
              <li key={index}>{pro}</li>
            ))}
          </ul>
        </div>

        <div className="cons">
          <h4>Cons</h4>
          <ul>
            {summary.cons.map((con, index) => (
              <li key={index}>{con}</li>
            ))}
          </ul>
        </div>
      </div>

      <p className="meta">
        Based on {summary.reviewCount} reviews
      </p>
    </div>
  );
}
```

3. Add the component to your product detail page. Open the product detail page file and add:

```typescript
import { ReviewSummary } from '../components/ReviewSummary';

// Inside your component's render/return, add:
<ReviewSummary productId={product.id} />
```

4. Mark **Task 4 as complete**

**Expected Result:** All tasks are complete. The feature is fully implemented.

---

## Validation Checklist

Verify your lab completion by confirming:

- [ ] Specs panel shows approved requirements document
- [ ] Specs panel shows approved design document
- [ ] Specs panel shows all 4 tasks marked complete
- [ ] Product with 3+ reviews displays AI summary
- [ ] Summary shows 2-3 sentence overview
- [ ] Summary shows list of pros (3-5 items)
- [ ] Summary shows list of cons (3-5 items)
- [ ] Sentiment indicator displays (positive/neutral/negative)
- [ ] Product with fewer than 3 reviews shows appropriate message
- [ ] Page refresh loads summary faster (cached response)

---

## Troubleshooting

### Issue: "Access Denied" when calling Bedrock
**Solution:**
1. Run `aws configure` to verify credentials are set
2. In the AWS Console, go to **Bedrock** > **Model access** and ensure Claude models are enabled
3. Verify your IAM role/user has `bedrock:InvokeModel` permission

### Issue: Requirements document seems incomplete
**Solution:** You can edit the document directly or ask Kiro to add specific requirements. The document is editable until approved.

### Issue: Bedrock returns malformed JSON
**Solution:** The prompt may need adjustment. Ensure the prompt clearly specifies JSON output format. Check that the response is not being truncated (increase `max_tokens` if needed).

### Issue: Summary takes longer than 3 seconds
**Solution:**
1. Verify caching is working (second load should be fast)
2. Check network latency to Bedrock in your region
3. Consider reducing the number of reviews sent to Bedrock

### Issue: "Insufficient reviews" error for products with reviews
**Solution:** Verify the reviews are being fetched correctly from DynamoDB. Check that the table name matches your environment configuration.

### Issue: Component shows loading spinner indefinitely
**Solution:**
1. Check browser console for errors
2. Verify the API endpoint is deployed and accessible
3. Check Lambda function logs in CloudWatch

---

## Summary

In this lab, you accomplished the following:

1. **Generated Requirements** - Transformed a natural language feature description into formal requirements with user stories, acceptance criteria, and edge cases using Kiro's spec workflow

2. **Created Technical Design** - Generated architecture documentation, TypeScript interfaces, and error handling strategies that serve as a blueprint for implementation

3. **Sequenced Implementation Tasks** - Let Kiro break down the work into discrete, dependency-ordered tasks for systematic implementation

4. **Integrated Amazon Bedrock** - Built a reusable Bedrock client with retry logic and proper error handling

5. **Implemented Complete Feature** - Created summarization service, API endpoint with caching, and frontend component following the spec-driven approach

You now have:
- A working AI-powered feature integrated with Amazon Bedrock
- Requirements documentation explaining WHAT was built and WHY
- Design documentation explaining HOW it is built
- Task history showing the implementation sequence
- Code that handles edge cases and errors gracefully

This spec-driven approach ensures your features are documented, testable, and maintainable - ready for production deployment and team collaboration.

# Building Agentic Applications with Amazon Kiro

Welcome to Building Agentic Applications with Amazon Kiro! This repo contains the lab guides for the class and the source you will clone to your local machine to complete the labs.

**Last Update: 22 Sept 2026**

## Labs

### [Lab 1: Getting Started with Kiro](labs/lab1/) (60 minutes)

Install Kiro, sign in with a Builder ID, authenticate the AWS CLI, and deploy your own personal AWS Amplify Gen 2 sandbox: an AppSync GraphQL API, a DynamoDB table, Cognito auth, Lambda functions and an Amazon Bedrock AgentCore runtime, all provisioned from code rather than clicked together in a console. You then work the way most people first meet an agentic IDE, prompting Kiro directly to add features to the food-tracker application and reviewing every diff before accepting it. Skills practiced: reading agent-generated diffs critically, handling command approvals safely, and understanding exactly what an Amplify sandbox creates in your AWS account and what it costs.

### [Lab 2: Build a Weekly Nutrition Summary with Specs and Bedrock](labs/lab2/) (60 minutes)

Move from ad-hoc prompting to spec-driven development. You describe a feature once and Kiro turns it into formal `requirements.md`, `design.md` and `tasks.md` documents that you review and approve before a line of code is written. The feature itself is an AI-powered weekly nutrition summary backed by Amazon Bedrock running inside an Amplify Function and exposed through a custom AppSync query. Skills practiced: reviewing a technical design for buildability rather than plausibility, catching invented APIs before they reach a deploy, and the Amplify Gen 2 pattern of function plus custom query plus scoped IAM grant that underpins any AI feature in a real application.

### [Lab 3: Hooks, Steering, and a Meal Recommendation Agent](labs/lab3/) (60 minutes)

Two distinct kinds of automation in one lab. Inside Kiro, you extend your steering files with a security policy and build two Agent Hooks side by side: an Ask Kiro hook that uses model judgment to decide whether a string is a real credential, and a Run Command hook that deterministically formats code. On AWS, you author the behaviour of a real agent running on Amazon Bedrock AgentCore: you write its instructions and its tool descriptions, deploy them through the same CDK construct that ships with the project, then read the agent's own CloudWatch logs to see which tool it chose and why. You finish by deliberately degrading one tool description and watching tool selection fail. Skills practiced: shaping agent behaviour through context rather than code, and diagnosing why an agent called the wrong tool.

### [Lab 4: Chat Panel and Production Deployment](labs/lab4/) (90 minutes)

Use the spec workflow a second time, now for an integration feature rather than a user interface one. You build an in-app chat panel that calls `InvokeAgentRuntime` against the agent you configured in Lab 3, wired through an Amplify Function, a typed custom AppSync query and a React component, with session IDs threading multi-turn conversations. Along the way you review and correct the generated design and code against the real AWS APIs, because plausible-looking agent output is not the same as working code. Skills practiced: integrating an agent into a production-shaped application, telling the difference between code that compiles and code that actually deploys, and an optional take-home exercise promoting the app off your developer sandbox onto GitHub-connected AWS Amplify Hosting.

## Prerequisites

- AWS Builder ID to sign in to Kiro (free, and separate from your AWS account)
- AWS account with permissions to deploy an Amplify sandbox (your instructor provides credentials for the class)
- Modern web browser (Chrome, Firefox, or Edge)
- GitHub account for repository integration (optional Lab 4 take-home bonus)
- Basic programming experience (JavaScript/TypeScript or Python)

---

*Materials prepared for ROI Training delivery.*

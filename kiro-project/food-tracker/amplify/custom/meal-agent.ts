import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Stack } from "aws-cdk-lib";
import * as bedrock from "aws-cdk-lib/aws-bedrock";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

const MODEL_ID = "global.anthropic.claude-sonnet-4-5-20250929-v1:0";

export interface MealAgentProps {
  /** The Lambda that backs the FoodEntryTools action group. */
  toolsFunction: lambda.IFunction;
}

/**
 * Deploys the MealRecommendationAgent (Amazon Bedrock Agent) with its
 * FoodEntryTools action group and a "v1" alias.
 *
 * The agent's behavior comes from two files you generate with Kiro in Lab 3:
 *   amplify/functions/meal-recommendations/agent-instructions.md
 *   amplify/functions/meal-recommendations/openapi.json
 *
 * This construct is inert until Lab 3 wires it into amplify/backend.ts.
 */
export class MealAgent extends Construct {
  public readonly agent: bedrock.CfnAgent;
  public readonly alias: bedrock.CfnAgentAlias;

  constructor(scope: Construct, id: string, props: MealAgentProps) {
    super(scope, id);

    const instruction = readFileSync(
      fileURLToPath(
        new URL("../functions/meal-recommendations/agent-instructions.md", import.meta.url),
      ),
      "utf-8",
    );
    const apiSchema = readFileSync(
      fileURLToPath(new URL("../functions/meal-recommendations/openapi.json", import.meta.url)),
      "utf-8",
    );

    // Service role the agent assumes to call the foundation model.
    const agentRole = new iam.Role(this, "AgentRole", {
      assumedBy: new iam.ServicePrincipal("bedrock.amazonaws.com"),
      inlinePolicies: {
        InvokeModel: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "bedrock:InvokeModel",
                "bedrock:InvokeModelWithResponseStream",
                "bedrock:GetInferenceProfile",
              ],
              resources: ["*"],
            }),
          ],
        }),
      },
    });

    // Unique-per-stack suffix so sandbox and production agents can coexist.
    const nameSuffix = Stack.of(this).node.addr.slice(0, 8);

    this.agent = new bedrock.CfnAgent(this, "Agent", {
      agentName: `MealRecommendationAgent-${nameSuffix}`,
      agentResourceRoleArn: agentRole.roleArn,
      foundationModel: MODEL_ID,
      instruction,
      autoPrepare: true,
      actionGroups: [
        {
          actionGroupName: "FoodEntryTools",
          actionGroupExecutor: { lambda: props.toolsFunction.functionArn },
          apiSchema: { payload: apiSchema },
        },
      ],
    });

    this.alias = new bedrock.CfnAgentAlias(this, "Alias", {
      agentAliasName: "v1",
      agentId: this.agent.attrAgentId,
    });

    // Let the Bedrock service invoke the tools Lambda on this agent's behalf.
    // Declared here (not via toolsFunction.addPermission) to avoid a cyclic
    // cross-stack dependency with the data stack.
    new lambda.CfnPermission(this, "AllowBedrockInvoke", {
      functionName: props.toolsFunction.functionName,
      action: "lambda:InvokeFunction",
      principal: "bedrock.amazonaws.com",
      sourceArn: this.agent.attrAgentArn,
    });
  }
}

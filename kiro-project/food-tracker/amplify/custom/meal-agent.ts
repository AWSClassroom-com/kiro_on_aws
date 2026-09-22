import { copyFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Duration, Stack } from "aws-cdk-lib";
import * as agentcore from "aws-cdk-lib/aws-bedrockagentcore";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { buildSync } from "esbuild";

export interface MealAgentProps {
  /** The Lambda that backs the FoodEntryTools action group. */
  toolsFunction: lambda.IFunction;
}

/**
 * Deploys the MealRecommendationAgent on Amazon Bedrock AgentCore Runtime.
 *
 * The agent's behavior comes from two files you generate with Kiro in Lab 3:
 *   amplify/functions/meal-recommendations/agent-instructions.md
 *   amplify/functions/meal-recommendations/openapi.json
 *
 * Those two files are unchanged from the Bedrock Agents Classic version of
 * this construct. What changed is who runs the agent loop. Classic ran it as
 * a managed service; AgentCore Runtime hosts our own code, which lives in
 * amplify/custom/agent/app.ts.
 *
 * AgentCore Runtime takes either a container image or a code package. This
 * uses the code package, so nothing here needs Docker, ECR, or an ARM64
 * image build on a student machine. The bundle is produced at synth time by
 * esbuild, which Amplify already installs.
 */
export class MealAgent extends Construct {
  public readonly runtime: agentcore.Runtime;

  /** ARN the application invokes with InvokeAgentRuntime. */
  public readonly agentRuntimeArn: string;

  constructor(scope: Construct, id: string, props: MealAgentProps) {
    super(scope, id);

    const here = dirname(fileURLToPath(import.meta.url));
    const behaviourDir = join(here, "../functions/meal-recommendations");
    const bundleDir = join(here, "../../.amplify/agent-bundle");

    mkdirSync(bundleDir, { recursive: true });

    // Bundle the agent to a single CommonJS file. AgentCore Runtime does not
    // execute TypeScript, and it validates that any native binaries are built
    // for arm64. Bundling to plain JavaScript sidesteps both constraints.
    buildSync({
      entryPoints: [join(here, "agent/app.ts")],
      outfile: join(bundleDir, "app.js"),
      bundle: true,
      platform: "node",
      target: "node22",
      format: "cjs",
    });

    // Ship the two behaviour files beside the bundle. The agent reads them at
    // startup, so editing them in Lab 3 changes the deployed agent.
    copyFileSync(
      join(behaviourDir, "agent-instructions.md"),
      join(bundleDir, "agent-instructions.md"),
    );
    copyFileSync(join(behaviourDir, "openapi.json"), join(bundleDir, "openapi.json"));

    // Unique-per-stack suffix so sandbox and production agents can coexist.
    // AgentCore runtime names allow letters, digits and underscores only.
    const nameSuffix = Stack.of(this).node.addr.slice(0, 8);

    this.runtime = new agentcore.Runtime(this, "Runtime", {
      runtimeName: `MealRecommendationAgent_${nameSuffix}`,
      description: "Recommends meals from the food the user is actually tracking.",
      agentRuntimeArtifact: agentcore.AgentRuntimeArtifact.fromCodeAsset({
        path: bundleDir,
        runtime: agentcore.AgentCoreRuntime.NODE_22,
        entrypoint: ["app.js"],
      }),
      environmentVariables: {
        TOOLS_FUNCTION_NAME: props.toolsFunction.functionName,
        ACTION_GROUP_NAME: "FoodEntryTools",
      },
      // A session holds memory until it goes idle. Set this explicitly rather
      // than inheriting the default, so a class does not leave sessions warm.
      lifecycleConfiguration: {
        idleRuntimeSessionTimeout: Duration.minutes(5),
        maxLifetime: Duration.minutes(30),
      },
    });

    this.agentRuntimeArn = this.runtime.agentRuntimeArn;

    // The agent calls the foundation model directly, which the Classic service
    // used to do on our behalf.
    this.runtime.role.addToPrincipalPolicy(
      new iam.PolicyStatement({
        actions: [
          "bedrock:InvokeModel",
          "bedrock:InvokeModelWithResponseStream",
          "bedrock:GetInferenceProfile",
        ],
        resources: ["*"],
      }),
    );

    // The agent invokes the tools Lambda itself, so the Classic resource policy
    // that let bedrock.amazonaws.com call it is no longer needed.
    props.toolsFunction.grantInvoke(this.runtime);
  }
}

# Lab 4: Deploy to AWS with CI/CD

## Overview

In this lab, you will deploy the complete acme-webshop application to production on AWS. You will set up DynamoDB tables for data persistence, deploy Lambda functions using AWS SAM, host the frontend on AWS Amplify, and create a GitHub Actions CI/CD pipeline for automated deployments.

By the end of this lab, your AI-powered shopping application will be live on the internet with automated testing, security scanning, and deployment on every push to the main branch.

## Prerequisites

- Lab 3 completed (all features implemented, hooks configured)
- AWS Console access with permissions for DynamoDB, Lambda, Amplify, and IAM
- GitHub account with repository access
- Git configured locally
- AWS CLI installed and configured
- AWS SAM CLI installed
- AWS region set to `us-east-1`

## Time Estimate

70 minutes

## Learning Objectives

By the end of this lab, you will be able to:
- Design and create DynamoDB tables with appropriate partition and sort keys
- Deploy serverless applications using AWS SAM templates
- Configure AWS Amplify for automatic frontend deployments
- Set up OIDC authentication between GitHub Actions and AWS
- Create a complete CI/CD pipeline with testing and security scanning
- Implement least-privilege IAM policies
- Configure CloudWatch alarms for production monitoring

---

## Part A: Setting Up DynamoDB Tables

In this section, you will create the DynamoDB tables required for storing application data.

### Step 1: Navigate to DynamoDB

1. Open the AWS Console at https://console.aws.amazon.com
2. Ensure you are in the `us-east-1` region
3. Search for **DynamoDB** in the services search bar
4. Click **DynamoDB**

**Expected Result:** The DynamoDB dashboard displays with options to create and manage tables.

### Step 2: Create the Products Table

1. Click **Create table**
2. Configure the table:
   - **Table name:** `Products`
   - **Partition key:** `productId` (String)
   - **Sort key:** Leave empty
3. Under Table settings, select **Default settings** (uses on-demand capacity)
4. Click **Create table**

**Expected Result:** The Products table is created. Wait for the status to show "Active" (1-2 minutes).

### Step 3: Create the Reviews Table

1. Click **Create table**
2. Configure the table:
   - **Table name:** `Reviews`
   - **Partition key:** `productId` (String)
   - **Sort key:** `reviewId` (String)
3. Keep default settings
4. Click **Create table**

**Expected Result:** The Reviews table is created with a composite key allowing multiple reviews per product.

### Step 4: Create the Purchases Table

1. Click **Create table**
2. Configure the table:
   - **Table name:** `Purchases`
   - **Partition key:** `userId` (String)
   - **Sort key:** `purchaseId` (String)
3. Keep default settings
4. Click **Create table**

**Expected Result:** The Purchases table is created for storing user purchase history.

### Step 5: Create the BrowsingHistory Table

1. Click **Create table**
2. Configure the table:
   - **Table name:** `BrowsingHistory`
   - **Partition key:** `userId` (String)
   - **Sort key:** `viewedAt` (String)
3. Keep default settings
4. Click **Create table**

**Expected Result:** The BrowsingHistory table is created. Using `viewedAt` as the sort key enables efficient time-based queries.

### Step 6: Verify All Tables Are Active

1. In the DynamoDB console, click **Tables** in the left navigation
2. Verify all four tables show status "Active":
   - Products
   - Reviews
   - Purchases
   - BrowsingHistory

**Expected Result:** All four tables are listed and active.

### Step 7: Seed Sample Data

1. In Kiro, open the terminal
2. Check if a seed script exists:
   ```bash
   npm run seed:dynamodb
   ```

3. If the script does not exist, create `scripts/seed-dynamodb.ts`:
   ```typescript
   import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
   import { marshall } from "@aws-sdk/util-dynamodb";

   const client = new DynamoDBClient({ region: "us-east-1" });

   const products = [
     {
       productId: "prod-001",
       name: "Wireless Headphones",
       category: "Electronics",
       price: 79.99,
       description: "High-quality wireless headphones with noise cancellation",
       createdAt: new Date().toISOString(),
     },
     {
       productId: "prod-002",
       name: "Laptop Stand",
       category: "Electronics",
       price: 49.99,
       description: "Adjustable aluminum laptop stand",
       createdAt: new Date().toISOString(),
     },
     {
       productId: "prod-003",
       name: "USB-C Hub",
       category: "Electronics",
       price: 39.99,
       description: "7-in-1 USB-C hub with HDMI and card reader",
       createdAt: new Date().toISOString(),
     },
   ];

   const reviews = [
     {
       productId: "prod-001",
       reviewId: "rev-001",
       userId: "user-001",
       rating: 5,
       text: "Amazing sound quality! Best headphones I've ever owned.",
       date: new Date().toISOString(),
     },
     {
       productId: "prod-001",
       reviewId: "rev-002",
       userId: "user-002",
       rating: 4,
       text: "Great headphones, but battery could be better.",
       date: new Date().toISOString(),
     },
     {
       productId: "prod-002",
       reviewId: "rev-003",
       userId: "user-001",
       rating: 5,
       text: "Solid build quality. My laptop runs cooler now.",
       date: new Date().toISOString(),
     },
   ];

   async function seed() {
     console.log("Seeding products...");
     for (const product of products) {
       await client.send(
         new PutItemCommand({
           TableName: "Products",
           Item: marshall(product),
         })
       );
     }

     console.log("Seeding reviews...");
     for (const review of reviews) {
       await client.send(
         new PutItemCommand({
           TableName: "Reviews",
           Item: marshall(review),
         })
       );
     }

     console.log("Done!");
   }

   seed().catch(console.error);
   ```

4. Run the seed script:
   ```bash
   npx ts-node scripts/seed-dynamodb.ts
   ```

**Expected Result:** Output shows "Seeding products...", "Seeding reviews...", "Done!"

### Step 8: Verify Data in DynamoDB

1. In the DynamoDB console, click on the **Products** table
2. Click **Explore table items**
3. Verify the sample products appear

**Expected Result:** Three products are visible in the table explorer.

---

## Part B: Deploying Lambda Functions with SAM

In this section, you will create a SAM template and deploy the backend Lambda functions.

### Step 9: Create the SAM Template

1. In your project root, create a file named `template.yaml`
2. Add the following content:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Kiro Shopping App Backend

Globals:
  Function:
    Timeout: 30
    Runtime: nodejs20.x
    MemorySize: 256
    Environment:
      Variables:
        TABLE_PRODUCTS: !Ref ProductsTable
        TABLE_REVIEWS: !Ref ReviewsTable

Parameters:
  Environment:
    Type: String
    Default: dev
    AllowedValues:
      - dev
      - staging
      - production
  RecommendationAgentId:
    Type: String
    Description: ID of the Bedrock Recommendation Agent
    Default: ""
  RecommendationAgentAliasId:
    Type: String
    Description: Alias ID of the Bedrock Recommendation Agent
    Default: "TSTALIASID"

Resources:
  # API Gateway
  ShoppingApi:
    Type: AWS::Serverless::Api
    Properties:
      Name: !Sub shopping-api-${Environment}
      StageName: !Ref Environment
      Cors:
        AllowOrigin: "'*'"
        AllowMethods: "'GET,POST,OPTIONS'"
        AllowHeaders: "'Content-Type,Authorization'"

  # Summarize Reviews Function
  SummarizeReviewsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub summarize-reviews-${Environment}
      CodeUri: ./dist/api/
      Handler: functions/summarize.handler
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ReviewsTable
        - Statement:
            - Effect: Allow
              Action:
                - bedrock:InvokeModel
              Resource:
                - arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-sonnet-4-5-*
      Events:
        GetSummary:
          Type: Api
          Properties:
            RestApiId: !Ref ShoppingApi
            Path: /api/products/{productId}/summary
            Method: GET

  # Recommendations Function
  RecommendationsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub recommendations-${Environment}
      CodeUri: ./dist/api/
      Handler: functions/recommendations.handler
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ProductsTable
        - DynamoDBReadPolicy:
            TableName: !Ref PurchasesTable
        - Statement:
            - Effect: Allow
              Action:
                - bedrock:InvokeAgent
              Resource: !Sub 'arn:aws:bedrock:${AWS::Region}:${AWS::AccountId}:agent/${RecommendationAgentId}'
      Environment:
        Variables:
          RECOMMENDATION_AGENT_ID: !Ref RecommendationAgentId
          RECOMMENDATION_AGENT_ALIAS_ID: !Ref RecommendationAgentAliasId
      Events:
        GetRecommendations:
          Type: Api
          Properties:
            RestApiId: !Ref ShoppingApi
            Path: /api/recommendations
            Method: POST

  # Agent Tools Function
  AgentToolsFunction:
    Type: AWS::Serverless::Function
    Properties:
      FunctionName: !Sub agent-tools-${Environment}
      CodeUri: ./dist/api/
      Handler: functions/agent-tools.handler
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref ProductsTable
        - DynamoDBReadPolicy:
            TableName: !Ref PurchasesTable
        - DynamoDBReadPolicy:
            TableName: !Ref BrowsingHistoryTable

  # DynamoDB Tables
  ProductsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub Products-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: productId
          AttributeType: S
      KeySchema:
        - AttributeName: productId
          KeyType: HASH

  ReviewsTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub Reviews-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: productId
          AttributeType: S
        - AttributeName: reviewId
          AttributeType: S
      KeySchema:
        - AttributeName: productId
          KeyType: HASH
        - AttributeName: reviewId
          KeyType: RANGE

  PurchasesTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub Purchases-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
        - AttributeName: purchaseId
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
        - AttributeName: purchaseId
          KeyType: RANGE

  BrowsingHistoryTable:
    Type: AWS::DynamoDB::Table
    Properties:
      TableName: !Sub BrowsingHistory-${Environment}
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: userId
          AttributeType: S
        - AttributeName: viewedAt
          AttributeType: S
      KeySchema:
        - AttributeName: userId
          KeyType: HASH
        - AttributeName: viewedAt
          KeyType: RANGE

Outputs:
  ApiUrl:
    Description: API Gateway URL
    Value: !Sub https://${ShoppingApi}.execute-api.${AWS::Region}.amazonaws.com/${Environment}
```

3. Save the file

**Expected Result:** The SAM template is created with all Lambda functions, API Gateway, and DynamoDB tables defined.

### Step 10: Build the TypeScript

1. In the terminal, run:
   ```bash
   npm run build
   ```

**Expected Result:** TypeScript compiles successfully with output in the `dist/` directory.

### Step 11: Build with SAM

1. Run the SAM build command:
   ```bash
   sam build
   ```

**Expected Result:** SAM builds successfully. You should see "Build Succeeded" in the output.

### Step 12: Deploy with SAM (First Time)

1. Run the guided deployment:
   ```bash
   sam deploy --guided
   ```

2. Answer the prompts:
   - **Stack name:** `kiro-shopping-app-dev`
   - **AWS Region:** `us-east-1`
   - **Parameter Environment:** `dev`
   - **Parameter RecommendationAgentId:** Enter your agent ID from Lab 3 (or leave blank for now)
   - **Parameter RecommendationAgentAliasId:** `TSTALIASID` (or your alias ID)
   - **Confirm changes before deploy:** `Y`
   - **Allow SAM CLI IAM role creation:** `Y`
   - **Disable rollback:** `N`
   - **Save arguments to configuration file:** `Y`
   - **SAM configuration file:** `samconfig.toml`
   - **SAM configuration environment:** `default`

3. Review the changeset and confirm with `y`

**Expected Result:** CloudFormation creates all resources. This takes 2-3 minutes. Note the **ApiUrl** from the Outputs section.

### Step 13: Record the API URL

1. Copy the API URL from the SAM deploy output
2. It will look like: `https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/dev`
3. Save this URL - you will need it for the frontend configuration

**Expected Result:** You have the API Gateway URL saved for use in the next section.

---

## Part C: Deploying Frontend to AWS Amplify

In this section, you will deploy the React frontend to AWS Amplify with automatic deployments from GitHub.

### Step 14: Navigate to AWS Amplify

1. In the AWS Console, search for **Amplify**
2. Click **AWS Amplify**

**Expected Result:** The Amplify console displays.

### Step 15: Create a New Amplify App

1. Click **New app**, then **Host web app**
2. Select **GitHub** as the repository service
3. Click **Connect to GitHub**
4. Authorize AWS Amplify to access your GitHub account if prompted

**Expected Result:** You are redirected to GitHub to authorize, then returned to Amplify.

### Step 16: Select Your Repository

1. Select your repository from the list
2. Select the **main** branch
3. Click **Next**

**Expected Result:** Amplify detects your repository and branch.

### Step 17: Review Build Settings

1. Amplify should auto-detect your React/Vite application
2. Verify the build settings show:
   ```yaml
   version: 1
   frontend:
     phases:
       preBuild:
         commands:
           - npm ci
       build:
         commands:
           - npm run build
     artifacts:
       baseDirectory: dist
       files:
         - '**/*'
     cache:
       paths:
         - node_modules/**/*
   ```
3. Click **Next**

**Expected Result:** Build settings are configured correctly for a Vite application.

### Step 18: Configure Environment Variables

1. Before clicking "Save and deploy", expand **Advanced settings**
2. Or, click **Next** and then go to **App settings** > **Environment variables**
3. Add the following environment variables:
   - **Key:** `VITE_API_URL` **Value:** Your API Gateway URL from Step 13
   - **Key:** `VITE_ENVIRONMENT` **Value:** `production`
4. Click **Save**

**Expected Result:** Environment variables are configured for the frontend build.

### Step 19: Deploy the Application

1. Click **Save and deploy**
2. Wait for the build to complete (2-3 minutes)
3. Watch the build progress through Provision, Build, Deploy, and Verify stages

**Expected Result:** All stages complete with green checkmarks.

### Step 20: Access Your Live Application

1. Click the URL provided by Amplify (looks like `https://main.xxxxxxxxxx.amplifyapp.com`)
2. Verify the application loads
3. Test basic functionality:
   - Browse products
   - View a product detail page
   - Check that the AI review summary loads

**Expected Result:** Your application is live and accessible via the Amplify URL with HTTPS enabled.

---

## Part D: Setting Up GitHub Actions CI/CD

In this section, you will create a CI/CD pipeline that automatically tests, scans, and deploys your application.

### Step 21: Create IAM OIDC Provider (Recommended)

OIDC authentication is more secure than access keys because it uses short-lived tokens.

1. In the AWS Console, go to **IAM**
2. Click **Identity providers** in the left navigation
3. Click **Add provider**
4. Configure the provider:
   - **Provider type:** OpenID Connect
   - **Provider URL:** `https://token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`
5. Click **Add provider**

**Expected Result:** The GitHub Actions OIDC provider is created in your AWS account.

### Step 22: Create IAM Role for GitHub Actions

1. In IAM, click **Roles** > **Create role**
2. Select **Web identity** as the trusted entity type
3. Configure the trust:
   - **Identity provider:** `token.actions.githubusercontent.com`
   - **Audience:** `sts.amazonaws.com`
4. Click **Next**
5. Attach policies. For this lab, you can use **AdministratorAccess** (note: use more restrictive policies in production)
6. Click **Next**
7. Name the role: `github-actions-deploy-role`
8. Click **Create role**

### Step 23: Add Trust Policy Condition

1. Find and click on the role you just created
2. Click the **Trust relationships** tab
3. Click **Edit trust policy**
4. Add a condition to restrict access to your specific repository. Replace `YOUR_ORG` and `YOUR_REPO`:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Principal": {
           "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
         },
         "Action": "sts:AssumeRoleWithWebIdentity",
         "Condition": {
           "StringEquals": {
             "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
           },
           "StringLike": {
             "token.actions.githubusercontent.com:sub": "repo:YOUR_ORG/YOUR_REPO:*"
           }
         }
       }
     ]
   }
   ```
5. Click **Update policy**

**Expected Result:** The IAM role can only be assumed by GitHub Actions running in your specific repository.

### Step 24: Configure GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret** and add:
   - **Name:** `AWS_ROLE_ARN`
   - **Value:** Your IAM role ARN (e.g., `arn:aws:iam::123456789012:role/github-actions-deploy-role`)
4. Add another secret:
   - **Name:** `AWS_REGION`
   - **Value:** `us-east-1`
5. Add another secret:
   - **Name:** `AMPLIFY_APP_ID`
   - **Value:** Your Amplify app ID (found in the Amplify console URL after `/apps/`)

**Expected Result:** Three secrets are configured in your repository.

### Step 25: Create the CI/CD Workflow

1. In your project, create the directory `.github/workflows/`:
   ```bash
   mkdir -p .github/workflows
   ```

2. Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to AWS

   on:
     push:
       branches: [main]
     pull_request:
       branches: [main]

   env:
     AWS_REGION: us-east-1
     NODE_VERSION: '20'

   permissions:
     id-token: write
     contents: read

   jobs:
     # Run tests on all pushes and PRs
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: ${{ env.NODE_VERSION }}
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Run linter
           run: npm run lint

         - name: Run tests
           run: npm test

         - name: Run type check
           run: npm run typecheck

     # Security scan
     security:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Run Trivy vulnerability scanner
           uses: aquasecurity/trivy-action@master
           with:
             scan-type: 'fs'
             ignore-unfixed: true
             severity: 'CRITICAL,HIGH'

     # Deploy Lambda (only on push to main)
     deploy-lambda:
       needs: [test, security]
       if: github.event_name == 'push' && github.ref == 'refs/heads/main'
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: ${{ env.NODE_VERSION }}
             cache: 'npm'

         - name: Install dependencies
           run: npm ci

         - name: Build
           run: npm run build

         - name: Configure AWS credentials (OIDC)
           uses: aws-actions/configure-aws-credentials@v4
           with:
             role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
             aws-region: ${{ env.AWS_REGION }}

         - name: Setup SAM
           uses: aws-actions/setup-sam@v2

         - name: SAM build
           run: sam build

         - name: SAM deploy
           run: |
             sam deploy \
               --no-confirm-changeset \
               --no-fail-on-empty-changeset \
               --parameter-overrides Environment=production

     # Verify Amplify deployment
     verify-amplify:
       needs: [deploy-lambda]
       runs-on: ubuntu-latest
       steps:
         - name: Configure AWS credentials (OIDC)
           uses: aws-actions/configure-aws-credentials@v4
           with:
             role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
             aws-region: ${{ env.AWS_REGION }}

         - name: Wait for Amplify deployment
           run: |
             echo "Waiting for Amplify to deploy..."
             sleep 60

         - name: Get Amplify deployment status
           run: |
             aws amplify list-jobs \
               --app-id ${{ secrets.AMPLIFY_APP_ID }} \
               --branch-name main \
               --max-results 1

     # Notify on completion
     notify:
       needs: [verify-amplify]
       runs-on: ubuntu-latest
       if: always()
       steps:
         - name: Deployment status
           run: |
             if [ "${{ needs.verify-amplify.result }}" == "success" ]; then
               echo "Deployment successful!"
             else
               echo "Deployment failed"
               exit 1
             fi
   ```

3. Save the file

**Expected Result:** The CI/CD workflow file is created with test, security, deploy, and verify jobs.

### Step 26: Commit and Push the Workflow

1. Stage and commit the workflow:
   ```bash
   git add .github/workflows/deploy.yml
   git commit -m "Add CI/CD workflow"
   git push
   ```

**Expected Result:** The commit triggers the workflow.

### Step 27: Verify the Pipeline

1. Go to your GitHub repository
2. Click the **Actions** tab
3. Click on the running workflow
4. Watch the jobs execute:
   - **test** - Runs linting, tests, and type checking
   - **security** - Runs Trivy vulnerability scanner
   - **deploy-lambda** - Builds and deploys with SAM
   - **verify-amplify** - Confirms Amplify deployment
   - **notify** - Reports final status

**Expected Result:** All jobs complete successfully with green checkmarks.

---

## Part E: Implementing Security Best Practices

In this section, you will verify and enhance the security of your deployment.

### Step 28: Review IAM Role Permissions

1. In the AWS Console, go to **IAM** > **Roles**
2. Find the Lambda execution roles created by SAM (names include `SummarizeReviewsFunctionRole`)
3. Click on each role and review the attached policies

**Expected Result:** Each role has only the permissions it needs:
- DynamoDB read access to specific tables
- Bedrock access to specific models
- CloudWatch Logs access for logging

### Step 29: Verify Encryption

1. **DynamoDB Encryption:**
   - Go to DynamoDB > Tables > Select a table
   - Click the **Additional settings** tab
   - Verify "Encryption at rest" shows "Enabled" (AWS owned key)

2. **API Gateway HTTPS:**
   - Go to API Gateway > Your API
   - Note that all endpoints use HTTPS only

3. **Amplify HTTPS:**
   - Visit your Amplify URL
   - Verify the browser shows a padlock icon (HTTPS)

**Expected Result:** All data is encrypted at rest and in transit.

### Step 30: Create CloudWatch Alarm for Lambda Errors

1. Go to **CloudWatch** > **Alarms** > **Create alarm**
2. Click **Select metric**
3. Choose **Lambda** > **By Function Name**
4. Select `Errors` for your `summarize-reviews-dev` function
5. Configure the alarm:
   - **Statistic:** Sum
   - **Period:** 5 minutes
   - **Threshold type:** Static
   - **Condition:** Greater than 5
6. Configure actions:
   - Create a new SNS topic named `lambda-alerts`
   - Add your email address
7. Name the alarm: `Lambda-Errors-High`
8. Click **Create alarm**
9. Confirm the SNS subscription in your email

**Expected Result:** The alarm is created and will notify you when Lambda errors exceed the threshold.

### Step 31: Create CloudWatch Alarm for API Gateway 5XX Errors

1. Go to **CloudWatch** > **Alarms** > **Create alarm**
2. Select metric **ApiGateway** > **By Api Name** > **5XXError**
3. Configure:
   - **Threshold:** Greater than 10
   - **Period:** 5 minutes
4. Use the same SNS topic (`lambda-alerts`)
5. Name the alarm: `API-Gateway-5XX-High`
6. Click **Create alarm**

**Expected Result:** The alarm is created for API Gateway errors.

### Step 32: Set Up Billing Alert (Optional but Recommended)

1. Go to **Billing and Cost Management**
2. Click **Budgets** > **Create budget**
3. Select **Cost budget**
4. Set a monthly budget (e.g., $50)
5. Set an alert threshold (e.g., 80% of budget)
6. Add your email for notifications
7. Click **Create budget**

**Expected Result:** You will be notified before exceeding your budget.

---

## Validation Checklist

Use this checklist to verify your complete production deployment:

- [ ] DynamoDB tables created (Products, Reviews, Purchases, BrowsingHistory)
- [ ] Sample data seeded and visible in DynamoDB console
- [ ] SAM template created with all resources defined
- [ ] SAM deployment completed successfully
- [ ] API Gateway URL obtained from SAM outputs
- [ ] Amplify app created and connected to GitHub
- [ ] Environment variables configured in Amplify (VITE_API_URL, VITE_ENVIRONMENT)
- [ ] Frontend deployed and accessible via Amplify URL
- [ ] HTTPS enforced (padlock visible in browser)
- [ ] GitHub secrets configured (AWS_ROLE_ARN, AWS_REGION, AMPLIFY_APP_ID)
- [ ] CI/CD workflow created and pushed
- [ ] Pipeline runs successfully on push to main
- [ ] IAM roles follow least privilege principle
- [ ] CloudWatch alarms configured for Lambda and API Gateway errors
- [ ] Live application: products browsable
- [ ] Live application: AI review summary loads
- [ ] Live application: recommendation chat works

---

## Troubleshooting

### Issue: SAM deploy fails with permissions error

**Symptoms:** Error message "User is not authorized to perform..."

**Solution:**
1. Verify AWS credentials are correctly configured
2. Check that your IAM user/role has CloudFormation, Lambda, API Gateway, DynamoDB, and IAM permissions
3. If using a profile, verify SAM is using the correct profile: `sam deploy --profile your-profile`

### Issue: Amplify build fails

**Symptoms:** Build fails in the Amplify console

**Solution:**
1. Check the build logs in Amplify console for specific errors
2. Verify the build commands work locally (`npm ci` and `npm run build`)
3. Ensure environment variables are set correctly
4. Check that `package.json` has all required scripts

### Issue: Lambda timeout (504 Gateway Timeout)

**Symptoms:** API calls fail with timeout errors

**Solution:**
1. Increase Lambda timeout in `template.yaml` (current: 30s, max: 900s)
2. Check CloudWatch Logs for the Lambda function to identify slow operations
3. Optimize database queries or Bedrock calls
4. Consider adding caching for frequently accessed data

### Issue: CORS errors in browser

**Symptoms:** Console shows "Access-Control-Allow-Origin" error

**Solution:**
1. Verify CORS is configured in the SAM template (already present in the provided template)
2. Check that Lambda functions return CORS headers in the response
3. If using a custom domain, update the CORS configuration to include that domain

### Issue: GitHub Actions fails to authenticate with AWS

**Symptoms:** "Credentials could not be loaded" or "Access Denied"

**Solution:**
1. Verify the IAM OIDC provider is configured correctly
2. Check that the trust policy includes your repository
3. Verify the `AWS_ROLE_ARN` secret is correct
4. Ensure the `permissions: id-token: write` is present in the workflow

---

## Summary

In this lab, you accomplished the following:

1. **Created DynamoDB Tables** with appropriate key designs for products, reviews, purchases, and browsing history
2. **Deployed Lambda Functions** using AWS SAM with least-privilege IAM policies
3. **Configured API Gateway** for secure REST endpoints with CORS support
4. **Deployed Frontend to Amplify** with automatic deployments from GitHub
5. **Set Up GitHub Actions CI/CD** with OIDC authentication, testing, and security scanning
6. **Implemented Security Best Practices** including encryption verification and CloudWatch alarms

Your application is now running in production with:
- Automatic deployments on every push to main
- Security scanning for vulnerabilities
- Monitoring and alerting for errors
- Secure authentication between GitHub and AWS
- HTTPS encryption for all traffic

---

## Cost Considerations

| Service | Estimated Monthly Cost |
|---------|----------------------|
| Amplify Hosting | $0-5 (free tier eligible) |
| Lambda | $0-2 (free tier: 1M requests) |
| DynamoDB | $0-5 (on-demand, free tier eligible) |
| API Gateway | $0-3 (free tier: 1M calls) |
| Bedrock (Claude) | $5-20 (based on usage) |
| CloudWatch | $0-2 (basic monitoring free) |
| **Total** | **$5-35/month** |

Note: Bedrock usage is your primary variable cost. Each review summarization and recommendation request incurs charges based on input/output tokens.

---

## Next Steps

Congratulations on completing the course! You have built and deployed a complete AI-powered shopping application. Here are your recommended next steps:

1. **Continue Building:** Add more features like user authentication, shopping cart, checkout
2. **Optimize Costs:** Implement caching for frequently accessed summaries
3. **Enhance Security:** Add Amazon Bedrock Guardrails for content filtering
4. **Scale:** Configure DynamoDB auto-scaling and Lambda reserved concurrency
5. **Certify:** Consider AWS Certified Developer - Associate certification
6. **Explore:** Learn about advanced Bedrock features including custom models and knowledge bases

---

## Additional Resources

- [AWS Amplify Documentation](https://docs.aws.amazon.com/amplify/) - *Source: AWS*
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/) - *Source: AWS*
- [GitHub Actions Documentation](https://docs.github.com/en/actions) - *Source: GitHub*
- [AWS Well-Architected Framework](https://docs.aws.amazon.com/wellarchitected/) - *Source: AWS*
- [DynamoDB Developer Guide](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/) - *Source: AWS*
- [Amazon Bedrock User Guide](https://docs.aws.amazon.com/bedrock/latest/userguide/) - *Source: AWS*

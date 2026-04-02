import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';
import { Construct } from 'constructs';

export class ContentGuardianStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ──────────────────────────────────────────────
    // DynamoDB Tables
    // ──────────────────────────────────────────────

    const usageDataTable = new dynamodb.Table(this, 'UsageDataTable', {
      tableName: 'ContentGuardian-UsageData',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    usageDataTable.addGlobalSecondaryIndex({
      indexName: 'DateIndex',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'date', type: dynamodb.AttributeType.STRING },
    });

    const userProfilesTable = new dynamodb.Table(this, 'UserProfilesTable', {
      tableName: 'ContentGuardian-UserProfiles',
      partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ──────────────────────────────────────────────
    // Cognito User Pool
    // ──────────────────────────────────────────────

    const userPool = new cognito.UserPool(this, 'ContentGuardianUserPool', {
      userPoolName: 'ContentGuardian-Users',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const userPoolClient = userPool.addClient('ContentGuardianAppClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: { authorizationCodeGrant: true },
        scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL],
      },
    });

    // ──────────────────────────────────────────────
    // S3 Bucket for media
    // ──────────────────────────────────────────────

    const mediaBucket = new s3.Bucket(this, 'ContentGuardianMediaBucket', {
      bucketName: `content-guardian-media-${this.account}-${this.region}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethod.GET, s3.HttpMethod.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // ──────────────────────────────────────────────
    // Lambda Functions
    // ──────────────────────────────────────────────

    const commonLambdaProps: Partial<lambda.FunctionProps> = {
      runtime: lambda.Runtime.NODEJS_18_X,
      timeout: cdk.Duration.seconds(30),
      memorySize: 256,
      environment: {
        USAGE_DATA_TABLE: usageDataTable.tableName,
        USER_PROFILES_TABLE: userProfilesTable.tableName,
        MEDIA_BUCKET: mediaBucket.bucketName,
      },
    };

    const analyzeContentFn = new lambda.Function(this, 'AnalyzeContentFn', {
      ...commonLambdaProps,
      functionName: 'ContentGuardian-AnalyzeContent',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/analyze-content')),
    });

    const generateMotivationFn = new lambda.Function(this, 'GenerateMotivationFn', {
      ...commonLambdaProps,
      functionName: 'ContentGuardian-GenerateMotivation',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/generate-motivation')),
    });

    const generateReportFn = new lambda.Function(this, 'GenerateReportFn', {
      ...commonLambdaProps,
      functionName: 'ContentGuardian-GenerateReport',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/generate-report')),
    });

    const authHandlerFn = new lambda.Function(this, 'AuthHandlerFn', {
      ...commonLambdaProps,
      functionName: 'ContentGuardian-AuthHandler',
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda/auth-handler')),
    });

    // Grant permissions
    usageDataTable.grantReadWriteData(analyzeContentFn);
    usageDataTable.grantReadData(generateReportFn);
    userProfilesTable.grantReadWriteData(authHandlerFn);
    userProfilesTable.grantReadData(generateMotivationFn);
    mediaBucket.grantReadWrite(generateReportFn);

    // Attach Cognito triggers
    userPool.addTrigger(cognito.UserPoolOperation.POST_CONFIRMATION, authHandlerFn);

    // ──────────────────────────────────────────────
    // API Gateway
    // ──────────────────────────────────────────────

    const api = new apigateway.RestApi(this, 'ContentGuardianApi', {
      restApiName: 'ContentGuardian API',
      description: 'ContentGuardian backend API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const analyzeResource = api.root.addResource('analyze');
    analyzeResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(analyzeContentFn),
    );

    const motivationResource = api.root.addResource('motivation');
    motivationResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(generateMotivationFn),
    );

    const reportResource = api.root.addResource('report');
    reportResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(generateReportFn),
    );

    const authResource = api.root.addResource('auth');
    authResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(authHandlerFn),
    );

    // ──────────────────────────────────────────────
    // Outputs
    // ──────────────────────────────────────────────

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'ContentGuardian API Gateway URL',
    });

    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'MediaBucketName', {
      value: mediaBucket.bucketName,
      description: 'S3 Media Bucket Name',
    });
  }
}

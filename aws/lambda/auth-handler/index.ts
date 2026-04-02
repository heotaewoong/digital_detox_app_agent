import type { CognitoUserPoolTriggerEvent, Context, Callback } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

const USER_PROFILES_TABLE =
  process.env.USER_PROFILES_TABLE ?? 'ContentGuardian-UserProfiles';

interface UserProfileRecord {
  userId: string;
  email: string;
  name: string;
  dreams: string[];
  goals: string[];
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

async function initializeUserProfile(
  userId: string,
  email: string,
  name: string,
): Promise<void> {
  // Check if profile already exists
  const existing = await docClient.send(
    new GetCommand({
      TableName: USER_PROFILES_TABLE,
      Key: { userId },
    }),
  );

  if (existing.Item) {
    console.log(`User profile already exists for userId: ${userId}`);
    return;
  }

  const now = new Date().toISOString();
  const profile: UserProfileRecord = {
    userId,
    email,
    name: name || email.split('@')[0],
    dreams: [],
    goals: [],
    onboardingCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: USER_PROFILES_TABLE,
      Item: profile,
    }),
  );

  console.log(`Initialized user profile for userId: ${userId}`);
}

export const handler = async (
  event: CognitoUserPoolTriggerEvent,
  _context: Context,
  callback: Callback,
): Promise<CognitoUserPoolTriggerEvent> => {
  console.log('Auth trigger event:', JSON.stringify(event, null, 2));

  try {
    const { triggerSource, userName, request } = event;

    switch (triggerSource) {
      // Post-confirmation trigger: fired after a user confirms their account
      case 'PostConfirmation_ConfirmSignUp': {
        const email = request.userAttributes?.email ?? '';
        const name = request.userAttributes?.name ?? '';
        await initializeUserProfile(userName, email, name);
        break;
      }

      // Pre-authentication trigger: can be used for custom validation
      case 'PreAuthentication_Authentication': {
        console.log(`Pre-authentication for user: ${userName}`);
        // Add custom pre-auth logic here if needed
        // e.g., check if user is banned, rate limiting, etc.
        break;
      }

      // Post-authentication trigger: fired after successful authentication
      case 'PostAuthentication_Authentication': {
        console.log(`Post-authentication for user: ${userName}`);
        // Add custom post-auth logic here if needed
        // e.g., update last login timestamp, analytics, etc.
        break;
      }

      default: {
        console.log(`Unhandled trigger source: ${triggerSource}`);
      }
    }

    // Return the event object back to Cognito
    callback(null, event);
    return event;
  } catch (error) {
    console.error('Error in auth handler:', error);
    // Return the event to avoid blocking authentication on errors
    callback(null, event);
    return event;
  }
};

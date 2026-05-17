'use server';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { cookies } from 'next/headers';
import { AWS_CONFIG } from '../aws-config';
import { redirect } from 'next/navigation';

const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_CONFIG.region,
});

export async function signIn(
  prevState: { error?: string },
  formData: FormData
): Promise<{ error?: string }> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const result = await cognitoClient.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: AWS_CONFIG.cognito.clientId,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }));

    const idToken = result.AuthenticationResult?.IdToken;
    const accessToken = result.AuthenticationResult?.AccessToken;
    const refreshToken = result.AuthenticationResult?.RefreshToken;

    if (!idToken) throw new Error('No token received');

    // Store tokens in HTTP-only cookies (never exposed to client JS)
    const cookieStore = await cookies();
    cookieStore.set('id_token', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
    });
    cookieStore.set('access_token', accessToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600,
    });
    cookieStore.set('refresh_token', refreshToken!, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 3600,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign in failed';
    return { error: message };
  }

  // redirect must be called OUTSIDE try/catch — it throws a NEXT_REDIRECT error internally
  redirect('/dashboard');
}

export async function signOut() {
  const cookieStore = await cookies();
  cookieStore.delete('id_token');
  cookieStore.delete('access_token');
  cookieStore.delete('refresh_token');
  redirect('/login');
}

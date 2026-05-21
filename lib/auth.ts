import { CognitoJwtVerifier } from 'aws-jwt-verify';
import { cookies } from 'next/headers';
import { AWS_CONFIG } from './aws-config';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'MANAGER' | 'EMPLOYEE' | 'ADMIN';
  teamId: string;
  fullName: string;
}

// Lazily initialized — only created on the first actual token verification.
// Avoids fetching Cognito JWKS on cold start for unauthenticated requests.
let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function getVerifier() {
  if (!_verifier) {
    _verifier = CognitoJwtVerifier.create({
      userPoolId: AWS_CONFIG.cognito.userPoolId,
      tokenUse: 'id',
      clientId: AWS_CONFIG.cognito.clientId,
    });
  }
  return _verifier;
}

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('id_token')?.value;

    // Short-circuit immediately — no network call needed for unauthenticated users
    if (!token) return null;

    const payload = await getVerifier().verify(token);

    return {
      userId: payload.sub,
      email: payload.email as string,
      role: (payload['custom:role'] as string || 'EMPLOYEE') as AuthUser['role'],
      teamId: payload['custom:teamId'] as string || '',
      fullName: payload.name as string || 'Unknown',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<AuthUser> {
  const user = await getAuthUser();
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  return user;
}

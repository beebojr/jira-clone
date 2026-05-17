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

// Create verifier once (cached at module level)
const verifier = CognitoJwtVerifier.create({
  userPoolId: AWS_CONFIG.cognito.userPoolId,
  tokenUse: 'id',
  clientId: AWS_CONFIG.cognito.clientId,
});

export async function getAuthUser(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('id_token')?.value;

    if (!token) return null;

    const payload = await verifier.verify(token);

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

'use client';

import { authClient } from '@/lib/auth-client';

// Type definitions for Better Auth session
export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Session {
  user: User;
  activeOrganizationId?: string;
}

/**
 * Hook to get the current authentication session
 * This is a thin wrapper around Better Auth's useSession for consistency
 */
export function useAuth() {
  const { data: session, isPending, error } = authClient.useSession();

  return {
    session: session as Session | null,
    user: session?.user || null,
    isAuthenticated: !!session?.user,
    isPending,
    error,
  };
}

/**
 * Hook to get authentication utilities
 */
export function useAuthActions() {
  return {
    signIn: authClient.signIn,
    signUp: authClient.signUp,
    signOut: authClient.signOut,
    forgetPassword: authClient.forgetPassword,
    resetPassword: authClient.resetPassword,
  };
}

'use client';

import { useEffect } from 'react';
import { useAuth } from './use-auth';
import { useOrganizations } from './use-organizations';
import { patch } from '@/lib/fetcher';

/**
 * Hook to manage active organization selection
 * Automatically sets the first organization as active if none is selected
 */
export function useActiveOrganizationManager() {
  const { session, updateSession } = useAuth();
  const { organizations, isLoading } = useOrganizations();

  useEffect(() => {
    // Only run if we have organizations data and session, but no active org is set
    if (
      !isLoading &&
      organizations.length > 0 &&
      session?.user?.id &&
      !session?.activeOrganizationId
    ) {
      const firstOrg = organizations[0];

      // Set the first organization as active
      const setActiveOrganization = async () => {
        try {
          await patch('/api/auth/session', {
            activeOrganizationId: firstOrg.id,
          });

          // Update local session state
          await updateSession({
            activeOrganizationId: firstOrg.id,
          });
        } catch (error) {
          console.error('Failed to set active organization:', error);
        }
      };

      setActiveOrganization();
    }
  }, [organizations, isLoading, session, updateSession]);

  return {
    isActiveOrganizationSet: !!session?.activeOrganizationId,
    isSettingActiveOrganization:
      !isLoading && organizations.length > 0 && !session?.activeOrganizationId,
  };
}

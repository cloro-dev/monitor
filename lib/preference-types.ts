/**
 * Type definitions for page-specific preferences
 */

export type TimeRange = '7d' | '30d' | '90d';

export interface SourcesPreferences {
  timeRange: TimeRange;
  brandId: string | null;
  tab: 'domain' | 'url';
  sortBy: 'mentions' | 'utilization';
  sortOrder: 'asc' | 'desc';
}

export interface PromptsPreferences {
  brandId: string | null;
  activeTab: 'active' | 'suggested' | 'archived';
}

export interface CompetitorsPreferences {
  brandId: string | null;
}

export interface DashboardPreferences {
  // Future preferences for dashboard overview
  timeRange?: TimeRange;
  brandId?: string | null;
}

export interface PagePreferences {
  sources: SourcesPreferences;
  prompts: PromptsPreferences;
  competitors: CompetitorsPreferences;
  dashboard: DashboardPreferences;
}

export interface StoredPreferences {
  version: '1.0';
  lastUpdated: string;
  data: PagePreferences;
}

export type PageKey = keyof PagePreferences;

/**
 * Type helper to get preferences for a specific page
 */
export type PagePreferenceType<T extends PageKey> = PagePreferences[T];

/**
 * Type helper to get preference keys for a specific page
 */
export type PagePreferenceKeys<T extends PageKey> = keyof PagePreferences[T];

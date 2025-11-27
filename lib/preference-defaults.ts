import type {
  PagePreferences,
  SourcesPreferences,
  PromptsPreferences,
  CompetitorsPreferences,
  DashboardPreferences,
} from './preference-types';

/**
 * Default preference values for each page
 */

export const defaultSourcesPreferences: SourcesPreferences = {
  timeRange: '30d',
  brandId: null,
  tab: 'domain',
  sortBy: 'utilization',
  sortOrder: 'desc',
};

export const defaultPromptsPreferences: PromptsPreferences = {
  brandId: null,
  activeTab: 'active',
};

export const defaultCompetitorsPreferences: CompetitorsPreferences = {
  brandId: null,
};

export const defaultDashboardPreferences: DashboardPreferences = {
  timeRange: '30d',
  brandId: null,
};

export const defaultPagePreferences: PagePreferences = {
  sources: defaultSourcesPreferences,
  prompts: defaultPromptsPreferences,
  competitors: defaultCompetitorsPreferences,
  dashboard: defaultDashboardPreferences,
};

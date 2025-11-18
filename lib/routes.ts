/**
 * Centralized route configuration for navigation and breadcrumbs
 * This serves as the single source of truth for route labels across the app
 */

export interface RouteConfig {
  title: string;
  icon?: string; // For sidebar navigation
}

export const ROUTES: Record<string, RouteConfig> = {
  '/': { title: 'Dashboard', icon: 'LayoutDashboard' },
  '/prompts': { title: 'Prompts', icon: 'MessageSquare' },
  '/competitors': { title: 'Competitors', icon: 'Users' },
  '/settings': { title: 'Settings', icon: 'Building2' },
};

/**
 * Get route title by path
 */
export function getRouteTitle(path: string): string {
  // Remove trailing slash for consistent matching
  const normalizedPath = path.replace(/\/$/, '');
  return ROUTES[normalizedPath]?.title || 'Dashboard';
}

/**
 * Get all routes for sidebar navigation (excludes dashboard home)
 */
export function getNavigationRoutes() {
  return Object.entries(ROUTES)
    .filter(([path]) => path !== '/')
    .map(([path, config]) => ({
      title: config.title,
      url: path,
      icon: config.icon,
    }));
}

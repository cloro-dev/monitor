import { subDays, startOfDay, endOfDay } from 'date-fns';

export type TimeRange = '7d' | '30d' | '90d';

export interface DateRange {
  from: Date;
  to?: Date;
}

/**
 * Get date range based on timeRange string
 * @param timeRange - The time range ('7d', '30d', '90d')
 * @returns DateRange object with start and end dates
 */
export function getDateRange(timeRange: TimeRange): DateRange {
  const end = new Date();
  let days = 30;

  if (timeRange === '7d') days = 7;
  if (timeRange === '90d') days = 90;

  return {
    from: startOfDay(subDays(end, days)),
    to: endOfDay(end),
  };
}

/**
 * Get date range for filtering (without time boundaries)
 * @param timeRange - The time range ('7d', '30d', '90d')
 * @returns DateRange object with start and end dates
 */
export function getDateRangeForFilter(timeRange: TimeRange): DateRange {
  const end = new Date();
  let days = 30;

  if (timeRange === '7d') days = 7;
  if (timeRange === '90d') days = 90;

  return {
    from: subDays(end, days),
    to: end,
  };
}

/**
 * Get days count from timeRange string
 * @param timeRange - The time range ('7d', '30d', '90d')
 * @returns Number of days to look back
 */
export function getDaysFromTimeRange(timeRange: TimeRange): number {
  switch (timeRange) {
    case '7d':
      return 7;
    case '30d':
      return 30;
    case '90d':
      return 90;
    default:
      return 30;
  }
}

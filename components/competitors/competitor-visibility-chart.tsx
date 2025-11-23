'use client';

import * as React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { DateRangeSelect } from '@/components/ui/date-range-select';

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

interface CompetitorVisibilityChartProps {
  data: ChartDataPoint[];
  competitors: { id: string; name: string; color?: string }[];
}

const COLORS = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#dc2626', // red-600
  '#d97706', // amber-600
  '#9333ea', // purple-600
  '#0891b2', // cyan-600
];

export function CompetitorVisibilityChart({
  data,
  competitors,
}: CompetitorVisibilityChartProps) {
  const [timeRange, setTimeRange] = React.useState('90d');

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date();
    let daysToSubtract = 90;
    if (timeRange === '30d') {
      daysToSubtract = 30;
    } else if (timeRange === '7d') {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return data.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [data, timeRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
        <div className="space-y-1">
          <CardTitle>Competitor Visibility</CardTitle>
          <CardDescription>Visibility share over time</CardDescription>
        </div>
        <DateRangeSelect
          value={timeRange}
          onValueChange={setTimeRange}
          className="w-[160px] rounded-lg sm:ml-auto"
        />
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                {competitors.map((comp, index) => (
                  <linearGradient
                    key={comp.id}
                    id={`fill${comp.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={COLORS[index % COLORS.length]}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={COLORS[index % COLORS.length]}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  });
                }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <span className="text-xs font-bold text-muted-foreground">
                            {new Date(label).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="mt-2 grid grid-cols-1 gap-1.5">
                          {payload.map((entry: any) => (
                            <div
                              key={entry.name}
                              className="flex items-center gap-2"
                            >
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: entry.color }}
                              />
                              <span className="text-xs font-medium text-foreground">
                                {entry.name}: {Number(entry.value).toFixed(0)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                iconType="circle"
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
              />
              {competitors.map((comp, index) => (
                <Area
                  key={comp.id}
                  type="monotone"
                  dataKey={comp.name}
                  stackId="1" // Stack them? Or overlap? Usually visibility is relative, so stacking might make sense if it adds to 100%. But here it's independent visibility.
                  // If I stack, it implies they share a pie. If I don't stack, they overlap.
                  // Visibility is "percentage of results where it appears". It can be > 100% total if multiple brands appear in same result.
                  // So I should NOT use stackId if I want absolute values.
                  // But Area charts without stacking can be messy.
                  // Let's try without stackId first.
                  stroke={COLORS[index % COLORS.length]}
                  fill={`url(#fill${comp.id})`}
                  fillOpacity={0.4}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

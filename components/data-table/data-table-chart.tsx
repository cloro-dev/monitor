'use client';

import * as React from 'react';
import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Separator } from '@/components/ui/separator';
import { IconTrendingUp } from '@tabler/icons-react';
import { z } from 'zod';

const chartConfig = {
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))',
  },
  mobile: {
    label: 'Mobile',
    color: 'hsl(var(--chart-2))',
  },
} satisfies ChartConfig;

interface DataTableChartProps {
  data: z.infer<any>[];
}

export const DataTableChart = React.memo(function DataTableChart({
  data,
}: DataTableChartProps) {
  const chartData = useMemo(() => {
    // Generate mock chart data based on the table data
    // Use deterministic values based on index and item properties
    return data.map((item, index) => {
      // Create pseudo-random but deterministic values
      const seed = item.id ? (item.id * 31 + index * 17) % 1000 : index * 42;
      const desktopValue = 1500 + (seed % 800);
      const mobileValue = 1200 + ((seed * 2) % 900);

      return {
        month: `Month ${index + 1}`,
        desktop: desktopValue,
        mobile: mobileValue,
      };
    });
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mt-6 h-[200px] w-full">
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="line" />}
            />
            <Area
              dataKey="mobile"
              type="natural"
              fill="var(--color-mobile)"
              fillOpacity={0.4}
              stroke="var(--color-mobile)"
              stackId="a"
            />
            <Area
              dataKey="desktop"
              type="natural"
              fill="var(--color-desktop)"
              fillOpacity={0.4}
              stroke="var(--color-desktop)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </div>
      <Separator />
      <div className="grid gap-2">
        <div className="flex gap-2 font-medium leading-none">
          Trending up by 5.2% this month <IconTrendingUp className="size-4" />
        </div>
        <div className="text-muted-foreground">
          Showing total visitors for the last 6 months.
        </div>
      </div>
    </>
  );
});

DataTableChart.displayName = 'DataTableChart';

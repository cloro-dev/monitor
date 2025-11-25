'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export type ChartConfig = {
  [k in string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<string, string> }
  );
};

interface LightweightChartProps {
  data: Array<Record<string, any>>;
  width?: number;
  height?: number;
  config?: ChartConfig;
  className?: string;
  children?: React.ReactNode;
}

interface AreaChartProps extends Omit<LightweightChartProps, 'children'> {
  dataKey: string;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
}

// Lightweight SVG Area Chart Component
export const LightweightAreaChart = React.memo(function LightweightAreaChart({
  data,
  width = 600,
  height = 200,
  config,
  className,
  dataKey,
  stroke = 'hsl(var(--chart-1))',
  fill = 'hsl(var(--chart-1))',
  strokeWidth = 2,
}: AreaChartProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width, height });

  // Responsive behavior
  React.useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || width,
          height: rect.height || height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  const padding = React.useMemo(
    () => ({ top: 20, right: 20, bottom: 40, left: 50 }),
    [],
  );

  // Calculate chart dimensions
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  // Process data
  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map((item, index) => ({
      ...item,
      index,
    }));
  }, [data]);

  // Calculate scales
  const { xScale, yScale, maxValue } = React.useMemo(() => {
    if (processedData.length === 0) {
      return {
        xScale: (i: number) => 0,
        yScale: (v: number) => chartHeight,
        maxValue: 100,
      };
    }

    const values = processedData.map((d: any) => Number(d[dataKey]) || 0);
    const maxVal = Math.max(...values, 1);

    return {
      xScale: (index: number) =>
        (index / (processedData.length - 1)) * chartWidth,
      yScale: (value: number) => chartHeight - (value / maxVal) * chartHeight,
      maxValue: maxVal,
    };
  }, [processedData, dataKey, chartHeight, chartWidth]);

  // Create path for area chart
  const areaPath = React.useMemo(() => {
    if (processedData.length === 0) return '';

    let path = `M ${padding.left},${padding.top + chartHeight}`;

    processedData.forEach((item: any, index) => {
      const x = padding.left + xScale(index);
      const y = padding.top + yScale(Number(item[dataKey]) || 0);
      path += ` L ${x},${y}`;
    });

    // Close the path for filled area
    path += ` L ${padding.left + chartWidth},${padding.top + chartHeight} Z`;

    return path;
  }, [
    processedData,
    dataKey,
    xScale,
    yScale,
    padding,
    chartWidth,
    chartHeight,
  ]);

  // Create path for line only
  const linePath = React.useMemo(() => {
    if (processedData.length === 0) return '';

    return processedData
      .map((item: any, index) => {
        const x = padding.left + xScale(index);
        const y = padding.top + yScale(Number(item[dataKey]) || 0);
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`;
      })
      .join(' ');
  }, [processedData, dataKey, xScale, yScale, padding]);

  // Generate grid lines
  const gridLines = React.useMemo(() => {
    const lines = [];
    const gridCount = 5;

    for (let i = 0; i <= gridCount; i++) {
      const y = padding.top + (chartHeight / gridCount) * i;
      lines.push(
        <line
          key={`grid-h-${i}`}
          x1={padding.left}
          y1={y}
          x2={padding.left + chartWidth}
          y2={y}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.1"
        />,
      );
    }

    return lines;
  }, [padding, chartWidth, chartHeight]);

  // Generate x-axis labels
  const xAxisLabels = React.useMemo(() => {
    if (processedData.length === 0) return [];

    const labelCount = Math.min(6, processedData.length);
    const step = Math.floor(processedData.length / labelCount);

    return Array.from({ length: labelCount }, (_, i) => {
      const index = i * step;
      if (index >= processedData.length) return null;

      const item = processedData[index];
      const x = padding.left + xScale(index);
      const label =
        (item as any).month ||
        (item as any).name ||
        (item as any).label ||
        `${index + 1}`;

      return (
        <text
          key={`label-${index}`}
          x={x}
          y={dimensions.height - 10}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          {label.toString().slice(0, 3)}
        </text>
      );
    }).filter(Boolean);
  }, [processedData, xScale, padding, dimensions]);

  if (processedData.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {gridLines}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />

        {/* Area */}
        <path
          d={areaPath}
          fill={fill}
          fillOpacity="0.4"
          className="transition-all duration-300"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          className="transition-all duration-300"
        />

        {/* X-axis labels */}
        {xAxisLabels}

        {/* Y-axis labels */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const value = Math.round((maxValue / 5) * (5 - i));
          const y = padding.top + (chartHeight / 5) * i;
          return (
            <text
              key={`y-label-${i}`}
              x={padding.left - 10}
              y={y + 4}
              textAnchor="end"
              className="fill-muted-foreground text-xs"
            >
              {value}
            </text>
          );
        })}
      </svg>
    </div>
  );
});

LightweightAreaChart.displayName = 'LightweightAreaChart';

// Simple Bar Chart
interface BarChartProps extends Omit<LightweightChartProps, 'children'> {
  dataKey: string;
  fill?: string;
  barWidth?: number;
}

export const LightweightBarChart = React.memo(function LightweightBarChart({
  data,
  width = 600,
  height = 200,
  config,
  className,
  dataKey,
  fill = 'hsl(var(--chart-1))',
  barWidth = 20,
}: BarChartProps) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = React.useState({ width, height });

  React.useEffect(() => {
    const updateDimensions = () => {
      if (svgRef.current) {
        const rect = svgRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width || width,
          height: rect.height || height,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const processedData = React.useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item, index) => ({
      ...item,
      index,
    }));
  }, [data]);

  const {
    maxValue,
    barWidth: actualBarWidth,
    barSpacing,
  } = React.useMemo(() => {
    if (processedData.length === 0) {
      return { maxValue: 100, barWidth: barWidth, barSpacing: 10 };
    }

    const values = processedData.map((d: any) => Number(d[dataKey]) || 0);
    const maxVal = Math.max(...values, 1);
    const availableWidth = chartWidth;
    const calculatedBarWidth = Math.min(
      barWidth,
      (availableWidth / processedData.length) * 0.8,
    );
    const calculatedSpacing =
      processedData.length > 1
        ? (availableWidth - calculatedBarWidth * processedData.length) /
          (processedData.length - 1)
        : 0;

    return {
      maxValue: maxVal,
      barWidth: calculatedBarWidth,
      barSpacing: calculatedSpacing,
    };
  }, [processedData, dataKey, chartWidth, barWidth]);

  if (processedData.length === 0) {
    return (
      <div
        className={cn(
          'flex items-center justify-center text-muted-foreground',
          className,
        )}
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="overflow-visible"
      >
        {/* Grid lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = padding.top + (chartHeight / 5) * i;
          return (
            <line
              key={`grid-${i}`}
              x1={padding.left}
              y1={y}
              x2={padding.left + chartWidth}
              y2={y}
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.1"
            />
          );
        })}

        {/* Bars */}
        {processedData.map((item: any, index) => {
          const value = Number(item[dataKey]) || 0;
          const barHeight = (value / maxValue) * chartHeight;
          const x = padding.left + index * (actualBarWidth + barSpacing);
          const y = padding.top + chartHeight - barHeight;

          return (
            <rect
              key={`bar-${index}`}
              x={x}
              y={y}
              width={actualBarWidth}
              height={barHeight}
              fill={fill}
              className="transition-all duration-300 hover:opacity-80"
            />
          );
        })}

        {/* Axes */}
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
        <line
          x1={padding.left}
          y1={padding.top + chartHeight}
          x2={padding.left + chartWidth}
          y2={padding.top + chartHeight}
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.3"
        />
      </svg>
    </div>
  );
});

LightweightBarChart.displayName = 'LightweightBarChart';

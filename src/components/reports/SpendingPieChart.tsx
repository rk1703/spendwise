"use client";

import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent, 
  ChartLegend,
  ChartLegendContent,
  type ChartConfig
} from "@/components/ui/chart" 
import { PieChart, Pie, Cell } from 'recharts';
import type { ChartDataPoint } from '@/lib/types';
import { FileWarning } from 'lucide-react';

export function SpendingPieChart() {
  const { transactions, categories } = useAppContext();

  // Filter for current month expenses only
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenseTransactions = transactions.filter(t => {
    if (t.type !== 'expense') return false;
    const transactionDate = new Date(t.date);
    return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
  });

  // Define a comprehensive color palette with distinct, easily distinguishable colors
  const colorPalette = [
    '#3B82F6', // Blue
    '#EF4444', // Red
    '#10B981', // Green
    '#F59E0B', // Amber
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#6366F1', // Indigo
    '#14B8A6', // Teal
    '#A855F7', // Violet
    '#22C55E', // Emerald
    '#EAB308', // Yellow
    '#DC2626', // Rose
  ];

  const data: ChartDataPoint[] = categories
    .map((category, index) => {
      const categoryExpenses = expenseTransactions
        .filter(t => t.categoryId === category.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: category.name,
        value: categoryExpenses,
        fill: colorPalette[index % colorPalette.length], // Use category color or distinct palette color
      };
    })
    .filter(item => item.value > 0); // Only include categories with spending

  const chartConfig = {} as ChartConfig;
  data.forEach(item => {
    chartConfig[item.name] = {
      label: item.name,
      color: item.fill,
    };
  });

  if (data.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Monthly Spending by Category</CardTitle>
          <CardDescription>A visual breakdown of your current month expenses.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px]">
            <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No monthly expense data available to display chart.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Monthly Spending by Category</CardTitle>
        <CardDescription>A visual breakdown of your current month expenses.</CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center p-0">
        <ChartContainer config={chartConfig} className="aspect-square h-[350px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel nameKey="value" />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                 if (percent < 0.05) return null; // Hide label for small slices
                 const RADIAN = Math.PI / 180;
                 const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                 const x = cx + radius * Math.cos(-midAngle * RADIAN);
                 const y = cy + radius * Math.sin(-midAngle * RADIAN);
                 return (
                    <text x={x} y={y} fill="hsl(var(--card-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs">
                        {`${(percent * 100).toFixed(0)}%`}
                    </text>
                );
              }}
            >
              {data.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" className="text-sm" />}
              className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

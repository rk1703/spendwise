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

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  const data: ChartDataPoint[] = categories
    .map(category => {
      const categoryExpenses = expenseTransactions
        .filter(t => t.categoryId === category.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: category.name,
        value: categoryExpenses,
        fill: category.color || `hsl(var(--chart-${(categories.indexOf(category) % 5) + 1}))` , // Use category color or default
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
          <CardTitle>Spending by Category</CardTitle>
          <CardDescription>A visual breakdown of your expenses.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px]">
            <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No expense data available to display chart.</p>
        </CardContent>
      </Card>
    );
  }


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Spending by Category</CardTitle>
        <CardDescription>A visual breakdown of your expenses.</CardDescription>
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
              className="-mt-4"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

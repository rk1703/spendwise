
"use client";

import { useAppContext } from '@/context/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, parseISO, startOfMonth, eachMonthOfInterval, subMonths } from 'date-fns';
import { FileWarning } from 'lucide-react';

export function SpendingLineChart() {
  const { transactions } = useAppContext();

  const expenseTransactions = transactions.filter(t => t.type === 'expense');

  // Generate data for the last 6 months
  const endDate = new Date();
  const startDate = subMonths(startOfMonth(endDate), 5); // 5 months ago from start of current month
  
  const monthsInterval = eachMonthOfInterval({ start: startDate, end: endDate });

  const data = monthsInterval.map(monthStart => {
    const monthKey = format(monthStart, 'yyyy-MM');
    const monthLabel = format(monthStart, 'MMM yy');
    
    const monthlyExpenses = expenseTransactions
      .filter(t => format(parseISO(t.date), 'yyyy-MM') === monthKey)
      .reduce((sum, t) => sum + t.amount, 0);
      
    return {
      name: monthLabel,
      expenses: monthlyExpenses,
    };
  });

  const chartConfig = {
    expenses: {
      label: "Expenses",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  if (data.every(d => d.expenses === 0) || data.length < 2) {
     return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Spending Over Time</CardTitle>
          <CardDescription>Track your expense trends monthly.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-[350px]">
            <FileWarning className="w-16 h-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Not enough expense data to display chart.</p>
            <p className="text-xs text-muted-foreground">(Requires at least two months with expenses)</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg overflow-x-scroll no-scrollbar">
      <CardHeader>
        <CardTitle>Spending Over Time</CardTitle>
        <CardDescription>Track your expense trends monthly.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              accessibilityLayer
              data={data}
              margin={{ top: 5, right: 20, left: -10, bottom: 5 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => value.slice(0, 3)}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(value) => `₹${value}`}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Line
                dataKey="expenses"
                type="monotone"
                stroke="var(--color-expenses)"
                strokeWidth={2}
                dot={{
                  fill: "var(--color-expenses)",
                  r: 4,
                }}
                activeDot={{
                  r: 6,
                }}
              />
            </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

    
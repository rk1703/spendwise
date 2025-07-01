
"use client";

import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppContext } from '@/context/AppContext';
import type { Transaction } from '@/lib/types';
import { IndianRupee , TrendingUp, TrendingDown, ListChecks, Target, LayoutDashboard, Tag, FileWarning, Loader2 } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Progress } from "@/components/ui/progress";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart"
import { Bar, BarChart, Pie, PieChart, Cell, XAxis, YAxis } from "recharts"

export default function DashboardPage() {
  const { 
    transactions, 
    categories, 
    budgets, 
    getCategoryById, 
    getTransactionsByCategory,
    loadingTransactions,
    loadingCategories,
    loadingBudgets
  } = useAppContext();

  // Calculate totals - these can be calculated even if data is loading, they'll just be 0 initially
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  const recentTransactions = transactions.slice(0, 5);

  // Spending by Category - calculate only if data is loaded
  let spendingByCategory: { name: string; amount: number; fill: string; }[] = [];
  let categoryChartConfig: ChartConfig = {};

  if (!loadingCategories && !loadingTransactions) {
    spendingByCategory = categories.map((category, catIndex) => {
      const categoryExpenses = transactions
        .filter(t => t.type === 'expense' && t.categoryId === category.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: category.name,
        amount: categoryExpenses,
        fill: category.color || `hsl(var(--chart-${(catIndex % 5) + 1}))`
      };
    }).filter(c => c.amount > 0);

    categoryChartConfig = spendingByCategory.reduce((acc, item) => {
      acc[item.name] = { label: item.name, color: item.fill };
      return acc;
    }, {} as ChartConfig);
  }

  // Spending Over Time - calculate only if data is loaded
  let spendingOverTimeData: {month: string; total: number}[] = [];
  if (!loadingTransactions) {
    spendingOverTimeData = transactions
    .filter(t => t.type === 'expense')
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .reduce((acc, curr) => {
      const month = new Date(curr.date).toLocaleString('default', { month: 'short' });
      const existingMonth = acc.find(item => item.month === month);
      if (existingMonth) {
        existingMonth.total += curr.amount;
      } else {
        acc.push({ month, total: curr.amount });
      }
      return acc;
    }, [] as {month: string; total: number}[]).slice(-6); // Last 6 months
  }


  return (
    <>
      <PageHeader title="Dashboard" description="Your financial overview at a glance." icon={LayoutDashboard} />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <IndianRupee className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingTransactions ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <div className="text-3xl font-bold font-headline">₹{balance.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">Available funds</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </CardHeader>
          <CardContent>
             {loadingTransactions ? <Loader2 className="h-7 w-7 animate-spin text-green-500" /> : <div className="text-3xl font-bold font-headline text-green-600">₹{totalIncome.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">Earned this period</p>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-5 w-5 text-red-500" />
          </CardHeader>
          <CardContent>
            {loadingTransactions ? <Loader2 className="h-7 w-7 animate-spin text-red-500" /> : <div className="text-3xl font-bold font-headline text-red-600">₹{totalExpenses.toFixed(2)}</div>}
            <p className="text-xs text-muted-foreground">Spent this period</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary"/>Recent Transactions</CardTitle>
            <CardDescription>Your last 5 transactions.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions || loadingCategories ? (
              <div className="flex justify-center items-center h-[150px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : recentTransactions.length > 0 ? (
              <ul className="space-y-3">
                {recentTransactions.map((t) => {
                  const category = getCategoryById(t.categoryId);
                  const Icon = category ? (LucideIcons[category.icon as keyof typeof LucideIcons] || Tag) : Tag;
                  return (
                    <li key={t.id} className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="h-5 w-5 text-muted-foreground" style={{color: category?.color}}/>
                        <div>
                          <p className="font-medium">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()} - {category?.name || 'Uncategorized'}</p>
                        </div>
                      </div>
                      <span className={`font-semibold ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}₹{t.amount.toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No recent transactions. <Link href="/transactions" className="text-primary hover:underline">Add one!</Link></p>
            )}
             <Button asChild variant="link" className="mt-4 w-full">
                <Link href="/transactions">View All Transactions</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Target className="text-primary"/>Budget Goals</CardTitle>
            <CardDescription>Track your spending against your budgets.</CardDescription>
          </CardHeader>
          <CardContent>
             {loadingBudgets || loadingCategories || loadingTransactions ? (
                <div className="flex justify-center items-center h-[150px]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
             ) : budgets.length > 0 ? (
              <ul className="space-y-4">
                {budgets.slice(0,3).map(budget => {
                  const category = getCategoryById(budget.categoryId);
                  if (!category) return null;
                  const spent = getTransactionsByCategory(budget.categoryId)
                    .filter(t => t.type === 'expense') // Consider time period later
                    .reduce((sum, t) => sum + t.amount, 0);
                  const progress = budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0;
                  const Icon = LucideIcons[category.icon as keyof typeof LucideIcons] || Tag;
                  return (
                    <li key={budget.id}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" style={{color: category.color}}/>{category.name}</span>
                        <span className="text-sm text-muted-foreground">₹{spent.toFixed(2)} / ₹{budget.amount.toFixed(2)}</span>
                      </div>
                      <Progress value={progress} className="h-2 [&>div]:bg-accent" />
                       {progress >= 100 && <p className="text-xs text-red-500 mt-1">Budget exceeded!</p>}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="text-muted-foreground text-center py-4">No budgets set. <Link href="/budgets" className="text-primary hover:underline">Create one!</Link></p>
            )}
            <Button asChild variant="link" className="mt-4 w-full">
                <Link href="/budgets">Manage Budgets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 mt-6 md:grid-cols-2">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Spending by Category</CardTitle>
            <CardDescription>How your expenses are distributed.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            {loadingCategories || loadingTransactions ? (
               <div className="flex flex-col items-center justify-center h-[300px]">
                <Loader2 className="w-12 h-12 text-muted-foreground animate-spin mb-4" />
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            ) : spendingByCategory.length > 0 ? (
            <ChartContainer config={categoryChartConfig} className="mx-auto aspect-square h-[300px] max-h-[300px]">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="amount" hideLabel />} />
                <Pie data={spendingByCategory} dataKey="amount" nameKey="name" labelLine={false}
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
                  {spendingByCategory.map((entry) => (
                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="name" className="text-sm"/>} className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"/>
              </PieChart>
            </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <FileWarning className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Not enough data for category chart.</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <CardTitle>Spending Over Time</CardTitle>
             <CardDescription>Your expense trend over the last few months.</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingTransactions ? (
                <div className="flex flex-col items-center justify-center h-[300px]">
                    <Loader2 className="w-12 h-12 text-muted-foreground animate-spin mb-4" />
                    <p className="text-muted-foreground">Loading chart data...</p>
                </div>
            ) : spendingOverTimeData.length > 1 ? (
            <ChartContainer config={{total: {label: "Total Spending", color: "hsl(var(--primary))"}}} className="aspect-video max-h-[300px]">
              <BarChart accessibilityLayer data={spendingOverTimeData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} tickFormatter={(value) => `₹${value}`} />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} cursor={false} />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <FileWarning className="w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Not enough data for time series chart.</p>
                <p className="text-xs text-muted-foreground">(Requires at least two months with expenses)</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
            <CardTitle>Welcome to SpendWise!</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <Image src="/assets/spend_wise.png" alt="Financial planning" width={300} height={200} className="rounded-lg shadow-md dark:bg-[#ffe0c2]" data-ai-hint="finance planning" />
            <div>
                <p className="text-lg mb-4">
                    Take control of your finances with SpendWise. Track your income and expenses, set budgets, and visualize your spending habits to achieve your financial goals.
                </p>
                <p className="mb-4">
                    Navigate through the sections using the sidebar:
                </p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong className="text-foreground">Dashboard:</strong> Get a quick overview of your finances.</li>
                    <li><strong className="text-foreground">Transactions:</strong> Add, view, and manage all your financial activities.</li>
                    <li><strong className="text-foreground">Budgets:</strong> Set spending limits for categories and track your progress.</li>
                    <li><strong className="text-foreground">Reports:</strong> Analyze your spending patterns with insightful charts.</li>
                    <li><strong className="text-foreground">Settings:</strong> Customize categories and export your data.</li>
                </ul>
                 <Button asChild className="mt-6">
                    <Link href="/transactions">Get Started by Adding a Transaction</Link>
                </Button>
            </div>
        </CardContent>
      </Card>

    </>
  );
}


"use client";

import { PageHeader } from '@/components/PageHeader';
import { SpendingPieChart } from '@/components/reports/SpendingPieChart';
import { SpendingLineChart } from '@/components/reports/SpendingLineChart';
import { DataExport } from '@/components/reports/DataExport';
import { PieChartIcon, BarChart3 } from 'lucide-react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function ReportsPage() {
  return (
    <>
      <PageHeader
        title="Financial Reports"
        description="Visualize your spending patterns and financial health."
        icon={PieChartIcon}
      />
      
      <div className="grid gap-8 md:grid-cols-1 lg:grid-cols-2 w-full">
        <SpendingPieChart />
        <SpendingLineChart />
        <DataExport />
      </div>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="text-primary"/> More Insights Coming Soon
          </CardTitle>
          <CardDescription>
            We're working on adding more detailed reports to help you understand your finances better.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-6">
          <Image 
            src="/assets/spend_report.png" 
            alt="Data analysis illustration" 
            width={300} 
            height={200} 
            className="rounded-lg shadow-md dark:bg-[#ffe0c2]"
            data-ai-hint="data analysis charts"
          />
          <div>
            <p className="text-lg mb-3">
              Future reports will include:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>Income vs. Expense comparisons over various periods.</li>
              <li>Deep dives into specific category spending trends.</li>
              <li>Net worth tracking (if assets/liabilities are added).</li>
              <li>Exportable PDF reports for your records.</li>
            </ul>
            <p className="mt-4 text-sm">
              Stay tuned for these exciting updates!
            </p>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

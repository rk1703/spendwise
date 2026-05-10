"use client";

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download, Calendar, FileText, Table } from 'lucide-react';
import { useState } from 'react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'sonner';

export function MonthlyExport() {
  const { transactions, categories, getCategoryById } = useAppContext();
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Generate list of available months from transactions
  const getAvailableMonths = () => {
    const monthSet = new Set<string>();
    transactions.forEach(transaction => {
      const date = new Date(transaction.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(monthKey);
    });
    
    return Array.from(monthSet).sort().reverse(); // Most recent first
  };

  const formatMonthDisplay = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const getTransactionsForMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const endDate = new Date(parseInt(year), parseInt(month), 0);
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate >= startDate && transactionDate <= endDate;
    });
  };

  const getMonthlySummary = (monthKey: string) => {
    const monthTransactions = getTransactionsForMonth(monthKey);
    const expenses = monthTransactions.filter(t => t.type === 'expense');
    const income = monthTransactions.filter(t => t.type === 'income');
    
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
    const netAmount = totalIncome - totalExpenses;
    
    // Category breakdown for expenses
    const categoryBreakdown = categories.map(category => {
      const categoryExpenses = expenses.filter(t => t.categoryId === category.id);
      const categoryTotal = categoryExpenses.reduce((sum, t) => sum + t.amount, 0);
      return {
        name: category.name,
        amount: categoryTotal,
        percentage: totalExpenses > 0 ? (categoryTotal / totalExpenses) * 100 : 0
      };
    }).filter(item => item.amount > 0);

    return {
      totalExpenses,
      totalIncome,
      netAmount,
      categoryBreakdown,
      transactionCount: monthTransactions.length
    };
  };

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) {
      return '""';
    }
    const stringField = String(field);
    if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return `"${stringField}"`;
  };

  const handleExportCSV = () => {
    if (!selectedMonth) {
      toast.error("No Month Selected", { description: "Please select a month to export." });
      return;
    }

    const monthTransactions = getTransactionsForMonth(selectedMonth);
    if (monthTransactions.length === 0) {
      toast.error("No Data", { description: `No transactions found for ${formatMonthDisplay(selectedMonth)}.` });
      return;
    }

    const headers = [
      "S.No",
      "Date",
      "Description",
      "Amount",
      "Type",
      "Category Name"
    ];

    const csvRows = [headers.join(',')];
    let totalAmount = 0;

    monthTransactions.forEach((transaction, index) => {
      const amount = Number(transaction.amount);
      totalAmount += amount;
      const category = getCategoryById(transaction.categoryId);
      const row = [
        escapeCSVField(index + 1),
        escapeCSVField(new Date(transaction.date).toLocaleDateString()),
        escapeCSVField(transaction.description),
        escapeCSVField(transaction.amount),
        escapeCSVField(transaction.type),
        escapeCSVField(category?.name || 'N/A'),
      ];
      csvRows.push(row.join(','));
    });

    csvRows.push('');
    csvRows.push('Total Transactions,Total Amount,,,,');
    csvRows.push(`${monthTransactions.length},${totalAmount.toFixed(2)},,,,`);

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spendwise_${selectedMonth}_transactions.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Monthly Data Exported (CSV)", { description: `Transactions for ${formatMonthDisplay(selectedMonth)} have been downloaded.` });
  };

  const handleExportPDF = () => {
    if (!selectedMonth) {
      toast.error("No Month Selected", { description: "Please select a month to export." });
      return;
    }

    const monthTransactions = getTransactionsForMonth(selectedMonth);
    if (monthTransactions.length === 0) {
      toast.error("No Data", { description: `No transactions found for ${formatMonthDisplay(selectedMonth)}.` });
      return;
    }

    const summary = getMonthlySummary(selectedMonth);
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text(`Monthly Report - ${formatMonthDisplay(selectedMonth)}`, 20, 20);
    
    // Summary section
    doc.setFontSize(12);
    doc.text(`Total Income: $${summary.totalIncome.toFixed(2)}`, 20, 40);
    doc.text(`Total Expenses: $${summary.totalExpenses.toFixed(2)}`, 20, 50);
    doc.text(`Net Amount: $${summary.netAmount.toFixed(2)}`, 20, 60);
    doc.text(`Total Transactions: ${summary.transactionCount}`, 20, 70);

    // Transactions table
    const headers = [["S.No", "Date", "Description", "Amount", "Type", "Category"]];
    const data = monthTransactions.map((transaction, index) => {
      const category = getCategoryById(transaction.categoryId);
      return [
        index + 1,
        new Date(transaction.date).toLocaleDateString(),
        transaction.description,
        `$${transaction.amount.toFixed(2)}`,
        transaction.type,
        category?.name || "N/A"
      ];
    });

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 80,
      styles: { fontSize: 9 },
      theme: 'grid',
      margin: { top: 20 },
    });

    // Category breakdown
    if (summary.categoryBreakdown.length > 0) {
      const categoryHeaders = [["Category", "Amount", "Percentage"]];
      const categoryData = summary.categoryBreakdown.map(item => [
        item.name,
        `$${item.amount.toFixed(2)}`,
        `${item.percentage.toFixed(1)}%`
      ]);

      autoTable(doc, {
        head: categoryHeaders,
        body: categoryData,
        startY: doc.lastAutoTable.finalY + 20,
        styles: { fontSize: 10 },
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] }
      });
    }

    doc.save(`spendwise_${selectedMonth}_report.pdf`);
    toast.success("Monthly Report Exported (PDF)", { description: `Report for ${formatMonthDisplay(selectedMonth)} has been downloaded.` });
  };

  const availableMonths = getAvailableMonths();

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="text-primary" />
          Monthly Export
        </CardTitle>
        <CardDescription>
          Export detailed monthly reports in CSV or PDF format for any month with transaction data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Select Month</label>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a month to export" />
            </SelectTrigger>
            <SelectContent>
              {availableMonths.map(monthKey => (
                <SelectItem key={monthKey} value={monthKey}>
                  {formatMonthDisplay(monthKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMonth && (
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Preview for {formatMonthDisplay(selectedMonth)}</h4>
            {(() => {
              const summary = getMonthlySummary(selectedMonth);
              return (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total Income:</span>
                    <span className="ml-2 font-medium text-green-600">${summary.totalIncome.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total Expenses:</span>
                    <span className="ml-2 font-medium text-red-600">${summary.totalExpenses.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Net Amount:</span>
                    <span className={`ml-2 font-medium ${summary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${summary.netAmount.toFixed(2)}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transactions:</span>
                    <span className="ml-2 font-medium">{summary.transactionCount}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="flex gap-3">
          <Button 
            onClick={handleExportCSV} 
            disabled={!selectedMonth}
            className="flex-1"
          >
            <Table className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button 
            onClick={handleExportPDF} 
            disabled={!selectedMonth}
            variant="secondary"
            className="flex-1"
          >
            <FileText className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

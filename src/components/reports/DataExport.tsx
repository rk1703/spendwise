
"use client";

import { useAppContext } from '@/context/AppContext';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from 'sonner';

export function DataExport() {
  const { transactions, categories, budgets, getCategoryById } = useAppContext();

  // const handleExportJSON = () => {
  //   const dataToExport = {
  //     transactions,
  //     categories: categories.map(c => ({ ...c, icon: typeof c.icon === 'string' ? c.icon : (c.icon as any)?.displayName || 'Activity' })), // Store icon name
  //     budgets,
  //   };
  //   const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(dataToExport, null, 2))}`;
  //   const link = document.createElement('a');
  //   link.href = jsonString;
  //   link.download = `spendwise_data_${new Date().toISOString().split('T')[0]}.json`;
  //   link.click();
  //   toast({ title: "Data Exported (JSON)", description: "Your financial data has been downloaded as a JSON file." });
  // };

  const escapeCSVField = (field: any): string => {
    if (field === null || field === undefined) {
      return '""';
    }
    const stringField = String(field);
    // Escape double quotes by doubling them, and wrap in double quotes if it contains commas, double quotes, or newlines
    if (stringField.includes('"') || stringField.includes(',') || stringField.includes('\n') || stringField.includes('\r')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return `"${stringField}"`; // Always wrap in quotes for consistency
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) {
      toast.error("No Transactions",{description: "There are no transactions to export."});
      return;
    }

    const headers = [
      "S.No",
      "Date",
      "Description",
      "Amount",
      "Type",
      // "Category ID",
      "Category Name",
      // "Category Icon",
    ];

    const csvRows = [headers.join(',')];
    let totalAmount = 0;

    transactions.forEach((transaction, index) => {
      const amount = Number(transaction.amount);
      totalAmount += amount;
      const category = getCategoryById(transaction.categoryId);
      const row = [
        escapeCSVField(index + 1),
        escapeCSVField(new Date(transaction.date).toLocaleDateString()),
        escapeCSVField(transaction.description),
        escapeCSVField(transaction.amount),
        escapeCSVField(transaction.type),
        // escapeCSVField(transaction.categoryId),
        escapeCSVField(category?.name || 'N/A'),
        // escapeCSVField(category?.icon || 'N/A'),
      ];
      csvRows.push(row.join(','));
    });

    csvRows.push('');

    // Create the total row — align under "Amount" column (4th index)
    const totalRow = [
      '', '', 'Total', totalAmount.toFixed(2), '', ''
    ];
    csvRows.push(totalRow.join(','));

    const csvString = csvRows.join('\r\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spendwise_transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success("Transactions Exported (CSV)",{description: "Your transactions have been downloaded as a CSV file." });
  };

  const handleExportPDF = () => {
  if (transactions.length === 0) {
    toast.error("No Transactions",{description: "There are no transactions to export."});
    return;
  }

  const doc = new jsPDF();
  const headers = [
    ["S.No", "Date", "Description", "Amount", "Type", "Category Name"]
  ];

  let totalAmount = 0;

  const data = transactions.map((transaction, index) => {
    const category = getCategoryById(transaction.categoryId);
    const amount = Number(transaction.amount);
    totalAmount += amount;

    return [
      index + 1,
      new Date(transaction.date).toLocaleDateString(),
      transaction.description,
      amount.toFixed(2),
      transaction.type,
      category?.name || "N/A"
    ];
  });

  // Add table with transactions
  autoTable(doc, {
    head: headers,
    body: data,
    styles: { fontSize: 10 },
    theme: 'grid',
    margin: { top: 20 },
  });

  // Add Total row
  autoTable(doc, {
    body: [["", "", "Total Expenses", totalAmount.toFixed(2), "", ""]],
    startY: doc.lastAutoTable.finalY + 5,
    styles: { fontStyle: 'bold' },
    theme: 'plain'
  });

  doc.save(`spendwise_transactions_${new Date().toISOString().split('T')[0]}.pdf`);

  toast.success("Transactions Exported (PDF)",{description: "Your transactions have been downloaded as a PDF file." });
};


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Download className="text-primary" />Export Data</CardTitle>
        <CardDescription>Download your financial data for backup or external analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Export all your transactions, categories, and budgets as a JSON file. This format is suitable for re-importing or programmatic use.
          </p>
          <Button onClick={handleExportPDF}>
            <Download className="mr-2 h-4 w-4" /> Export Transactions (PDF)
          </Button>
        </div>
        <div>
          <p className="mb-2 text-sm text-muted-foreground">
            Export only your transactions list as a CSV file. This format is suitable for spreadsheets.
          </p>
          <Button onClick={handleExportCSV} variant="secondary">
            <Download className="mr-2 h-4 w-4" /> Export Transactions (CSV)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

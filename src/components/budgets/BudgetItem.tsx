
"use client";

import type { Budget } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, AlertTriangle, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


interface BudgetItemProps {
  budget: Budget;
  onEdit: (budget: Budget) => void;
}

export function BudgetItem({ budget, onEdit }: BudgetItemProps) {
  const { getCategoryById, getTransactionsByCategory, deleteBudget } = useAppContext();
  const category = getCategoryById(budget.categoryId);
  if (!category) return null;

  const IconComponent = LucideIcons[category.icon as keyof typeof LucideIcons] || Tag;

  // Calculate current spending for this budget's category and period
  // For simplicity, this example assumes all transactions are within the current budget period.
  // A more robust solution would filter transactions by date based on the budget period.
  const expenses = getTransactionsByCategory(budget.categoryId)
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const progress = budget.amount > 0 ? Math.min((expenses / budget.amount) * 100, 100) : 0;
  const amountLeft = budget.amount - expenses;
  const isOverBudget = expenses > budget.amount;

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <IconComponent className="h-7 w-7" style={{color: category.color || 'hsl(var(--primary))'}} />
                <CardTitle>{category.name} Budget</CardTitle>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(budget)} aria-label="Edit budget">
                    <Pencil className="h-4 w-4" />
                </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Delete budget">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this budget.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBudget(budget.id)} className="bg-destructive hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <CardDescription>
          {budget.period.charAt(0).toUpperCase() + budget.period.slice(1)} limit: ₹{budget.amount.toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-1">
            <span>Spent: ₹{expenses.toFixed(2)}</span>
            <span className={isOverBudget ? "text-destructive font-semibold" : ""}>
              {isOverBudget 
                ? `Over by ₹${Math.abs(amountLeft).toFixed(2)}` 
                : `Left: ₹${amountLeft.toFixed(2)}`}
            </span>
          </div>
          <Progress value={progress} className={`h-3 ${isOverBudget ? '[&>div]:bg-destructive' : '[&>div]:bg-accent'}`} />
        </div>
        {isOverBudget && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            You've exceeded your budget for {category.name}.
          </p>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground w-full text-right">
            Progress: {progress.toFixed(0)}%
        </p>
      </CardFooter>
    </Card>
  );
}


"use client";

import type { Budget } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, AlertTriangle, Tag, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import AnimatedCounter from '@/components/animation/AnimatedCounter';
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

  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
  const IconComponent = iconMap[category.icon] || Tag;

  // Calculate current spending for this budget's category within the current month.
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const expenses = getTransactionsByCategory(budget.categoryId)
    .filter(t => {
      const transactionDate = new Date(t.date);
      return t.type === 'expense' && transactionDate >= startOfMonth && transactionDate <= endOfMonth;
    })
    .reduce((sum, t) => sum + t.amount, 0);

  const progress = budget.amount > 0 ? Math.min((expenses / budget.amount) * 100, 100) : 0;
  const amountLeft = budget.amount - expenses;
  const isOverBudget = expenses > budget.amount;

  return (
    <Card className="glass-card overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-background/50 backdrop-blur-sm border border-border/50 shadow-sm">
                  <IconComponent className="h-6 w-6" style={{color: category.color || 'hsl(var(--primary))'}} />
                </div>
                <CardTitle className="font-heading">{category.name} Budget</CardTitle>
            </div>
            <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => onEdit(budget)} aria-label="Edit budget" className="hover:bg-primary/10">
                    <Pencil className="h-4 w-4" />
                </Button>
                 <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Delete budget" className="hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="glass">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete this budget.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteBudget(budget.id)} className="bg-destructive hover:bg-destructive/90 text-white">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        <CardDescription className="text-sm">
          Monthly limit: ₹<AnimatedCounter value={budget.amount} decimals={2} />
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-2">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-muted-foreground">Spent: ₹<AnimatedCounter value={expenses} decimals={2} /></span>
            <span className={cn("font-semibold", isOverBudget ? "text-destructive" : "text-primary")}>
              {isOverBudget 
                ? `Over by ₹${Math.abs(amountLeft).toFixed(2)}` 
                : `Left: ₹${amountLeft.toFixed(2)}`}
            </span>
          </div>
          <div className="relative h-3 w-full bg-muted rounded-full overflow-hidden border border-border/50">
            <motion.div 
              className={cn("h-full", isOverBudget ? 'bg-destructive' : 'bg-primary')}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
        {isOverBudget && (
          <motion.p 
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-xs text-destructive flex items-center gap-1 mt-2 bg-destructive/10 p-2 rounded-lg"
          >
            <AlertTriangle className="h-3 w-3" />
            Budget exceeded! Consider reducing expenses in this category.
          </motion.p>
        )}
      </CardContent>
      <CardFooter>
         <p className="text-xs text-muted-foreground w-full text-right font-medium">
            <AnimatedCounter value={progress} suffix="%" /> used
        </p>
      </CardFooter>
    </Card>
  );
}

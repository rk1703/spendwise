"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import { BudgetItem } from '@/components/budgets/BudgetItem';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import type { Budget } from '@/lib/types';
import { PlusCircle, Target, PiggyBank } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';

export default function BudgetsPage() {
  const { budgets } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | undefined>(undefined);

  const handleEdit = (budget: Budget) => {
    setEditingBudget(budget);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    setIsFormOpen(false);
    setEditingBudget(undefined);
  };
  
  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingBudget(undefined);
  }

  return (
    <>
      <PageHeader
        title="Budgets"
        description="Set and track your spending goals."
        icon={Target}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleCancel(); else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBudget(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Set New Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingBudget ? 'Edit' : 'Set New'} Budget</DialogTitle>
              </DialogHeader>
              <BudgetForm budget={editingBudget} onSave={handleSave} onCancel={handleCancel} />
            </DialogContent>
          </Dialog>
        }
      />

      {budgets.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetItem key={budget.id} budget={budget} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-card rounded-lg shadow">
          <PiggyBank className="mx-auto h-16 w-16 text-muted-foreground mb-6" />
          <h3 className="text-2xl font-semibold mb-3 text-foreground">No Budgets Yet</h3>
          <p className="text-muted-foreground mb-6">
            Start managing your finances better by setting up a budget.
          </p>
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleCancel(); else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingBudget(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Your First Budget
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Set New Budget</DialogTitle>
              </DialogHeader>
              <BudgetForm onSave={handleSave} onCancel={handleCancel} />
            </DialogContent>
          </Dialog>
        </div>
      )}
    </>
  );
}

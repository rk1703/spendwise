"use client";

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/context/AppContext';
import type { Budget } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const budgetSchema = z.object({
  categoryId: z.string().min(1, 'Category is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  period: z.enum(['monthly', 'yearly']),
});

type BudgetFormData = z.infer<typeof budgetSchema>;

interface BudgetFormProps {
  budget?: Budget;
  onSave: () => void;
  onCancel?: () => void;
}

export function BudgetForm({ budget, onSave, onCancel }: BudgetFormProps) {
  const { categories, addBudget, updateBudget } = useAppContext();
  const { control, handleSubmit, register, formState: { errors, isSubmitting } } = useForm<BudgetFormData>({
    resolver: zodResolver(budgetSchema),
    defaultValues: {
      categoryId: budget?.categoryId || '',
      amount: budget?.amount || undefined,
      period: budget?.period || 'monthly',
    },
  });

  const onSubmit = (data: BudgetFormData) => {
    if (budget) {
      updateBudget({ ...data, id: budget.id });
    } else {
      addBudget(data);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div>
        <Label htmlFor="categoryId">Category</Label>
        <Controller
          name="categoryId"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="categoryId">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.filter(c => c.name !== 'Income').map((cat) => ( // Exclude income category for budgets
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
        {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
      </div>

      <div>
        <Label htmlFor="amount">Budget Amount</Label>
        <Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="e.g., 500" />
        {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="period">Period</Label>
        <Controller
          name="period"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="period">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.period && <p className="text-sm text-destructive mt-1">{errors.period.message}</p>}
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {budget ? 'Save Changes' : 'Set Budget'}
        </Button>
      </div>
    </form>
  );
}

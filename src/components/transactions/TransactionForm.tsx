"use client";

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { useAppContext } from '@/context/AppContext';
import type { Transaction, TransactionType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { suggestCategory } from '@/ai/flows/suggest-category';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const transactionSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.date({ required_error: 'Date is required' }),
  categoryId: z.string().min(1, 'Category is required'),
  type: z.enum(['income', 'expense']),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  onSave: () => void;
  onCancel?: () => void;
}

export function TransactionForm({ transaction, onSave, onCancel }: TransactionFormProps) {
  const { categories, addTransaction, updateTransaction, getCategoryByName } = useAppContext();
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);

  const { control, handleSubmit, register, setValue, watch, formState: { errors, isSubmitting } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      description: transaction?.description || '',
      amount: transaction?.amount || undefined,
      date: transaction ? new Date(transaction.date) : new Date(),
      categoryId: transaction?.categoryId || '',
      type: transaction?.type || 'expense',
    },
  });

  const descriptionValue = watch('description');

  const handleSuggestCategory = async () => {
    if (!descriptionValue) {
      toast.error("Cannot Suggest",{description: 'Please enter a description first.' });
      return;
    }
    setIsSuggestingCategory(true);
    try {
      const result = await suggestCategory({ description: descriptionValue });
      const suggestedCatName = result.category;
      
      const matchedCategory = getCategoryByName(suggestedCatName) || categories.find(c => suggestedCatName.toLowerCase().includes(c.name.toLowerCase()));

      if (matchedCategory) {
        setValue('categoryId', matchedCategory.id, { shouldValidate: true });
        toast.info("Category Suggested!",{description: `We've selected "${matchedCategory.name}" for you.` });
      } else {
        toast.info('Suggestion Made',{description: `AI suggested: "${suggestedCatName}". Please select a category or add a new one.`, duration: 5000 });
      }
    } catch (error) {
      console.error('Error suggesting category:', error);
      toast.error('Suggestion Failed',{description: 'Could not get AI suggestion. Please select manually.' });
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  const onSubmit = (data: TransactionFormData) => {
    const transactionData = {
      ...data,
      date: data.date.toISOString(),
    };
    if (transaction) {
      updateTransaction({ ...transactionData, id: transaction.id });
    } else {
      addTransaction(transactionData);
    }
    onSave();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 p-1">
      <div>
        <Label htmlFor="type">Type</Label>
        <Controller
          name="type"
          control={control}
          render={({ field }) => (
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.type && <p className="text-sm text-destructive mt-1">{errors.type.message}</p>}
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} placeholder="e.g., Coffee with friends" className="h-24"/>
        {errors.description && <p className="text-sm text-destructive mt-1">{errors.description.message}</p>}
      </div>

      <div>
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" step="0.01" {...register('amount')} placeholder="0.00" />
        {errors.amount && <p className="text-sm text-destructive mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <Label htmlFor="date">Date</Label>
        <Controller
          name="date"
          control={control} 
          render={({ field }) => (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !field.value && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {field.value ? format(field.value, 'PPP') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
              </PopoverContent>
            </Popover>
          )}
        />
        {errors.date && <p className="text-sm text-destructive mt-1">{errors.date.message}</p>}
      </div>

      <div>
        <Label htmlFor="categoryId">Category</Label>
        <div className="flex items-center gap-2">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <Select onValueChange={field.onChange} value={field.value} >
                <SelectTrigger id="categoryId" className="flex-grow">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <Button type="button" onClick={handleSuggestCategory} disabled={isSuggestingCategory || !descriptionValue} variant="outline" size="icon" aria-label="Suggest Category">
            {isSuggestingCategory ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
          </Button>
        </div>
        {errors.categoryId && <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>}
        <p className="text-xs text-muted-foreground mt-1">
          Enter a description then click the ✨ button for an AI-powered category suggestion!
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        {onCancel && <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Cancel</Button>}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {transaction ? 'Save Changes' : 'Add Transaction'}
        </Button>
      </div>
    </form>
  );
}

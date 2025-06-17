
"use client";

import type { Transaction } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Tag } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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


interface TransactionItemProps {
  transaction: Transaction;
  onEdit: (transaction: Transaction) => void;
}

export function TransactionItem({ transaction, onEdit }: TransactionItemProps) {
  const { deleteTransaction, getCategoryById } = useAppContext();
  const category = getCategoryById(transaction.categoryId);
  const IconComponent = category ? (LucideIcons[category.icon as keyof typeof LucideIcons] || Tag) : Tag;

  return (
    <>
      <div className="md:hidden flex flex-col justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-card">
        <div className="flex items-center justify-center flex-row gap-2">
          <div className="p-1 bg-muted rounded-full">
            <IconComponent className="h-6 w-6" style={{ color: category?.color || 'hsl(var(--foreground))' }} />
          </div>
          <div className='flex flex-1 flex-row gap-2 justify-between'>
            <p className="font-semibold capitalize text-card-foreground">{transaction.description}</p>
            {/* <div className="-mt-0.5"> */}
            {/* </div> */}
            <p className={`font-semibold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
              {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
          {category && <Badge variant="outline" style={{ borderColor: category.color, color: category.color }}>{category.name}</Badge>}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Delete transaction">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className='max-w-[380px] md:max-w-[500px] rounded-lg'>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this transaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTransaction(transaction.id)} className="bg-destructive hover:bg-destructive/90">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      <div className="hidden md:flex items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 bg-card">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-muted rounded-full">
            <IconComponent className="h-6 w-6" style={{ color: category?.color || 'hsl(var(--foreground))' }} />
          </div>
          <div>
            <p className="font-semibold text-card-foreground">{transaction.description}</p>
            <p className="text-sm text-muted-foreground">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {category && <Badge variant="outline" style={{ borderColor: category.color, color: category.color }}>{category.name}</Badge>}
          <p className={`font-bold text-lg ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
          </p>
          <Button variant="outline" size="icon" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
            <Pencil className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Delete transaction">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this transaction.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteTransaction(transaction.id)} className="bg-destructive hover:bg-destructive/90">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </>
  );
}

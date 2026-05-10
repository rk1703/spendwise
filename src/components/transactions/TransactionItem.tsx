
"use client";

import type { Transaction } from '@/lib/types';
import { useAppContext } from '@/context/AppContext';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, Tag, type LucideIcon } from 'lucide-react';
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
  const iconMap = LucideIcons as unknown as Record<string, LucideIcon>;
  const IconComponent = category ? (iconMap[category.icon] || Tag) : Tag;

  return (
    <>
      <div className="md:hidden flex flex-col justify-between p-4 glass-card shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm">
              <IconComponent className="h-6 w-6" style={{ color: category?.color || 'hsl(var(--foreground))' }} />
            </div>
            <div>
              <p className="font-semibold capitalize text-card-foreground leading-tight">{transaction.description}</p>
              <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className={`font-bold text-lg ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
            </p>
          </div>
        </div>
        <div className="flex justify-between items-center border-t border-border/50 pt-3">
          {category && <Badge variant="outline" className="rounded-full px-3" style={{ borderColor: category.color + '40', color: category.color, backgroundColor: category.color + '10' }}>{category.name}</Badge>}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
              <Pencil className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10" aria-label="Delete transaction">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className='glass max-w-[380px] md:max-w-[500px]'>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this transaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTransaction(transaction.id)} className="bg-destructive hover:bg-destructive/90 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
      
      <motion.div 
        whileHover={{ x: 5 }}
        className="hidden md:flex items-center justify-between p-4 glass-card shadow-sm hover:shadow-md transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          <div className="p-3 bg-background/50 backdrop-blur-sm rounded-2xl border border-border/50 shadow-sm">
            <IconComponent className="h-6 w-6" style={{ color: category?.color || 'hsl(var(--foreground))' }} />
          </div>
          <div>
            <p className="font-semibold text-card-foreground text-lg">{transaction.description}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">{format(new Date(transaction.date), 'MMM dd, yyyy')}</p>
              {category && <Badge variant="outline" className="rounded-full" style={{ borderColor: category.color + '40', color: category.color, backgroundColor: category.color + '10' }}>{category.name}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <p className={`font-bold text-xl ${transaction.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            {transaction.type === 'income' ? '+' : '-'}₹{transaction.amount.toFixed(2)}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-primary/10" onClick={() => onEdit(transaction)} aria-label="Edit transaction">
              <Pencil className="h-5 w-5" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-destructive/10" aria-label="Delete transaction">
                  <Trash2 className="h-5 w-5 text-destructive" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="glass">
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete this transaction.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => deleteTransaction(transaction.id)} className="bg-destructive hover:bg-destructive/90 text-white">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </motion.div>
    </>
  );
}

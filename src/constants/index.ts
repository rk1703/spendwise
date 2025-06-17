
import type { Category } from '@/lib/types';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', name: 'Food', icon: 'Utensils', color: 'hsl(var(--chart-1))' },
  { id: 'transport', name: 'Transportation', icon: 'Car', color: 'hsl(var(--chart-2))' },
  { id: 'housing', name: 'Housing', icon: 'Home', color: 'hsl(var(--chart-3))' },
  { id: 'shopping', name: 'Shopping', icon: 'ShoppingBag', color: 'hsl(var(--chart-4))' },
  { id: 'utilities', name: 'Utilities', icon: 'FileText', color: 'hsl(var(--chart-5))' },
  { id: 'health', name: 'Healthcare', icon: 'HeartPulse', color: 'hsl(var(--chart-1))' }, // Cycle to chart-1
  { id: 'entertainment', name: 'Entertainment', icon: 'Ticket', color: 'hsl(var(--chart-2))' }, // Cycle to chart-2
  { id: 'work', name: 'Work/Business', icon: 'Briefcase', color: 'hsl(var(--chart-3))' }, // Cycle to chart-3
  { id: 'education', name: 'Education', icon: 'GraduationCap', color: 'hsl(var(--chart-4))' }, // Cycle to chart-4
  { id: 'gifts', name: 'Gifts/Donations', icon: 'Gift', color: 'hsl(var(--chart-5))' }, // Cycle to chart-5
  { id: 'investments', name: 'Investments', icon: 'TrendingUp', color: 'hsl(var(--chart-1))' }, // Cycle to chart-1
  { id: 'other', name: 'Other', icon: 'Tags', color: 'hsl(var(--chart-2))' }, // Cycle to chart-2
];

export const APP_NAME = "SpendWise";

export const LOCAL_STORAGE_KEYS = {
  TRANSACTIONS: 'spendwise_transactions',
  CATEGORIES: 'spendwise_categories',
  BUDGETS: 'spendwise_budgets',
};

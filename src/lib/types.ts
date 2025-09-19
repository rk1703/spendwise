
import type { LucideIcon } from 'lucide-react';

export interface Category {
  id: string;
  name: string;
  icon: string; // Store only the icon name as a string
  color?: string; // Optional: for chart slices or category tags
}

export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  date: string; // ISO string date
  description: string;
  amount: number;
  categoryId: string;
  type: TransactionType;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'monthly'; // Or more granular like 'weekly'
}

export interface ChartDataPoint {
  name: string;
  value: number;
  fill?: string;
}

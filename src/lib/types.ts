
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

// --- Split Money (real multi-user groups) ---
export type SplitGroupRole = "owner" | "member";

export interface SplitGroup {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[]; // for quick "where array-contains uid" queries
  createdAt: string; // ISO string date
}

// Stored at `splitGroups/{groupId}/members/{uid}`
export interface SplitGroupMember {
  id: string; // same as uid (document id)
  uid: string;
  displayName?: string;
  email?: string;
  role: SplitGroupRole;
  joinedAt: string; // ISO string date
}

// Stored at `splitGroups/{groupId}/expenses/{expenseId}`
export interface SplitGroupExpense {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO string date
  paidByUid: string;
  splitBetweenUids: string[];
  createdAt: string; // ISO string date
  createdByUid: string;
}

// Stored at `splitGroups/{groupId}/invites/{inviteId}`
export interface SplitGroupInvite {
  id: string;
  createdAt: string; // ISO string date
  createdByUid: string;
  expiresAt: string; // ISO string date
  revoked: boolean;
}

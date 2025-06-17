
"use client";

import { useState } from 'react';
import { PageHeader } from '@/components/PageHeader';
import { TransactionForm } from '@/components/transactions/TransactionForm';
import { TransactionItem } from '@/components/transactions/TransactionItem';
import { Button } from '@/components/ui/button';
import { useAppContext } from '@/context/AppContext';
import type { Transaction } from '@/lib/types';
import { PlusCircle, ArrowLeftRight, Search, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const ALL_CATEGORIES_VALUE = "all_categories_filter_value";

export default function TransactionsPage() {
  const { transactions, categories } = useAppContext();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | undefined>(undefined);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState(''); // Initial empty string shows placeholder
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [sortBy, setSortBy] = useState<'dateDesc' | 'dateAsc' | 'amountDesc' | 'amountAsc'>('dateDesc');


  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleSave = () => {
    setIsFormOpen(false);
    setEditingTransaction(undefined);
  };

  const handleCancel = () => {
    setIsFormOpen(false);
    setEditingTransaction(undefined);
  }

  const filteredAndSortedTransactions = transactions
    .filter(t => {
      const searchTermMatch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = !filterCategory || filterCategory === ALL_CATEGORIES_VALUE ? true : t.categoryId === filterCategory;
      const typeMatch = filterType === 'all' ? true : t.type === filterType;
      return searchTermMatch && categoryMatch && typeMatch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'dateAsc':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'amountDesc':
          return b.amount - a.amount;
        case 'amountAsc':
          return a.amount - b.amount;
        case 'dateDesc':
        default:
          return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
    });

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Manage your income and expenses."
        icon={ArrowLeftRight}
        actions={
          <Dialog open={isFormOpen} onOpenChange={(open) => {
            if (!open) handleCancel(); else setIsFormOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTransaction(undefined); setIsFormOpen(true); }}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[380px] md:max-w-[500px] rounded-lg md:max-h-[100vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingTransaction ? 'Edit' : 'Add New'} Transaction</DialogTitle>
              </DialogHeader>
              <TransactionForm transaction={editingTransaction} onSave={handleSave} onCancel={handleCancel} />
            </DialogContent>
          </Dialog>
        }
      />

      <div className="mb-6 p-4 border rounded-lg bg-card shadow">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label htmlFor="search-transactions" className="mb-1 block text-sm font-medium">Search</Label>
            <div className="relative">
              <Input
                id="search-transactions"
                type="text"
                placeholder="Search descriptions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div>
            <Label htmlFor="filter-category" className="mb-1 block text-sm font-medium">Category</Label>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger id="filter-category">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES_VALUE}>All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="filter-type" className="mb-1 block text-sm font-medium">Type</Label>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as any)}>
              <SelectTrigger id="filter-type">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="sort-by" className="mb-1 block text-sm font-medium">Sort By</Label>
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as any)}>
              <SelectTrigger id="sort-by">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dateDesc">Date (Newest First)</SelectItem>
                <SelectItem value="dateAsc">Date (Oldest First)</SelectItem>
                <SelectItem value="amountDesc">Amount (High to Low)</SelectItem>
                <SelectItem value="amountAsc">Amount (Low to High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {filteredAndSortedTransactions.length > 0 ? (
        <div className="space-y-4">
          {filteredAndSortedTransactions.map((t) => (
            <TransactionItem key={t.id} transaction={t} onEdit={handleEdit} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10 ">
          <Filter className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Transactions Found</h3>
          <p className="text-muted-foreground">
            {transactions.length === 0 ? "You haven't added any transactions yet." : "Try adjusting your filters or add a new transaction."}
          </p>
          {transactions.length > 0 && (searchTerm || filterCategory !== '' || filterType !== 'all') && (
            <Button variant="link" onClick={() => { setSearchTerm(''); setFilterCategory(''); setFilterType('all'); }}>Clear Filters</Button>
          )}
        </div>
      )}
    </>
  );
}

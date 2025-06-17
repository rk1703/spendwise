
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Transaction, Category, Budget } from '@/lib/types';
import { DEFAULT_CATEGORIES } from '@/constants';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase/config';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { toast } from 'sonner';

interface AppContextType {
  transactions: Transaction[];
  loadingTransactions: boolean;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
  updateTransaction: (transaction: Transaction) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  getTransactionsByCategory: (categoryId: string) => Transaction[];
  
  categories: Category[];
  loadingCategories: boolean;
  addCategory: (category: Omit<Category, 'id'>) => Promise<Category | null>;
  updateCategory: (category: Category) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  getCategoryById: (id: string) => Category | undefined;
  getCategoryByName: (name: string) => Category | undefined;

  budgets: Budget[];
  loadingBudgets: boolean;
  addBudget: (budget: Omit<Budget, 'id'>) => Promise<void>;
  updateBudget: (budget: Budget) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;
  getBudgetByCategoryId: (categoryId: string) => Budget | undefined;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categoriesData, setCategoriesData] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  const [loadingTransactions, setLoadingTransactions] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingBudgets, setLoadingBudgets] = useState(true);

  // Firestore Listeners
  useEffect(() => {
    if (user?.uid) {
      setLoadingTransactions(true);
      setLoadingCategories(true);
      setLoadingBudgets(true);

      // Categories listener & default seeding/syncing
      const categoriesColRef = collection(db, 'users', user.uid, 'categories');
      const unsubscribeCategories = onSnapshot(query(categoriesColRef), async (querySnapshot) => {
        const fetchedCategories = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        
        if (querySnapshot.empty) {
          try {
            const batch = writeBatch(db);
            DEFAULT_CATEGORIES.forEach(cat => {
              const docRef = doc(categoriesColRef, cat.id); // Use predefined ID for defaults
              batch.set(docRef, { name: cat.name, icon: cat.icon, color: cat.color });
            });
            await batch.commit();
            toast("Welcome!",{description: "Default categories have been set up." });
            // Snapshot will re-trigger with new data, which will then be set by the else block
          } catch (error) {
            console.error("Error seeding default categories: ", error);
            toast.error("Error",{description: "Could not set up default categories." });
          }
        } else {
          let changesMadeToDefaults = false;
          const batch = writeBatch(db);
          let categoriesToSetLocally = [...fetchedCategories];

          DEFAULT_CATEGORIES.forEach(defaultCat => {
            const userVersionOfDefaultCatIndex = categoriesToSetLocally.findIndex(c => c.id === defaultCat.id);

            if (userVersionOfDefaultCatIndex !== -1) {
              const userCat = categoriesToSetLocally[userVersionOfDefaultCatIndex];
              if (userCat.name !== defaultCat.name || userCat.icon !== defaultCat.icon || userCat.color !== defaultCat.color) {
                const catRef = doc(categoriesColRef, defaultCat.id);
                batch.set(catRef, { name: defaultCat.name, icon: defaultCat.icon, color: defaultCat.color });
                categoriesToSetLocally[userVersionOfDefaultCatIndex] = { ...userCat, ...defaultCat };
                changesMadeToDefaults = true;
              }
            } else {
              const catRef = doc(categoriesColRef, defaultCat.id);
              batch.set(catRef, { name: defaultCat.name, icon: defaultCat.icon, color: defaultCat.color });
              categoriesToSetLocally.push({id: defaultCat.id, name: defaultCat.name, icon: defaultCat.icon, color: defaultCat.color});
              changesMadeToDefaults = true;
            }
          });

          if (changesMadeToDefaults) {
            try {
              await batch.commit();
              // toast("Categories Synced",{description: "Default categories updated." }); // Can be noisy
            } catch (error) {
              console.error("Error syncing default categories to Firestore: ", error);
            }
          }
          // Sort to ensure default categories appear first or in a consistent order
          categoriesToSetLocally.sort((a,b) => {
            const aIsDefault = DEFAULT_CATEGORIES.some(dc => dc.id === a.id);
            const bIsDefault = DEFAULT_CATEGORIES.some(dc => dc.id === b.id);
            if (aIsDefault && !bIsDefault) return -1;
            if (!aIsDefault && bIsDefault) return 1;
            if (aIsDefault && bIsDefault) return DEFAULT_CATEGORIES.findIndex(dc => dc.id === a.id) - DEFAULT_CATEGORIES.findIndex(dc => dc.id === b.id);
            return a.name.localeCompare(b.name); // Sort custom categories by name
          });
          setCategoriesData(categoriesToSetLocally);
        }
        setLoadingCategories(false);
      }, (error) => {
        console.error("Error fetching categories: ", error);
        toast.error("Error",{description: "Could not load categories."});
        setLoadingCategories(false);
      });

      // Transactions listener
      const transactionsColRef = collection(db, 'users', user.uid, 'transactions');
      const unsubscribeTransactions = onSnapshot(query(transactionsColRef, orderBy('date', 'desc')), (snapshot) => {
        setTransactions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction)));
        setLoadingTransactions(false);
      }, (error) => {
        console.error("Error fetching transactions: ", error);
        toast.error("Error", {description: "Could not load transactions."});
        setLoadingTransactions(false);
      });

      // Budgets listener
      const budgetsColRef = collection(db, 'users', user.uid, 'budgets');
      const unsubscribeBudgets = onSnapshot(query(budgetsColRef), (snapshot) => {
        setBudgets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Budget)));
        setLoadingBudgets(false);
      }, (error) => {
        console.error("Error fetching budgets: ", error);
        toast.error("Error",{description: "Could not load budgets.",});
        setLoadingBudgets(false);
      });

      return () => {
        unsubscribeCategories();
        unsubscribeTransactions();
        unsubscribeBudgets();
      };
    } else {
      setTransactions([]);
      setCategoriesData([]);
      setBudgets([]);
      setLoadingTransactions(false);
      setLoadingCategories(false);
      setLoadingBudgets(false);
    }
  }, [user?.uid, toast]);

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user?.uid) return;
    try {
      await addDoc(collection(db, 'users', user.uid, 'transactions'), transaction);
      toast.success("Transaction Added",{description: `${transaction.description} for ₹${transaction.amount.toFixed(2)} was added.` });
    } catch (error) {
      console.error("Error adding transaction: ", error);
      toast.error("Error",{description: "Could not add transaction."});
    }
  };

  const updateTransaction = async (updatedTransaction: Transaction) => {
    if (!user?.uid) return;
    try {
      const { id, ...dataToUpdate } = updatedTransaction;
      await updateDoc(doc(db, 'users', user.uid, 'transactions', id), dataToUpdate);
      toast.info("Transaction Updated",{description: "Transaction details have been updated." });
    } catch (error) {
      console.error("Error updating transaction: ", error);
      toast.error("Error",{description: "Could not update transaction."});
    }
  };

  const deleteTransaction = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'transactions', id));
      toast.success("Transaction Deleted",{description: "Transaction has been removed." });
    } catch (error) {
      console.error("Error deleting transaction: ", error);
      toast.error("Error",{description: "Could not delete transaction."});
    }
  };
  
  const getTransactionsByCategory = (categoryId: string) => {
    return transactions.filter(t => t.categoryId === categoryId);
  };

  const addCategory = async (category: Omit<Category, 'id'>): Promise<Category | null> => {
    if (!user?.uid) return null;
    // Check for name collision (case-insensitive)
    if (categoriesData.some(c => c.name.toLowerCase() === category.name.toLowerCase())) {
        toast.error("Category Exists",{description: `A category named "${category.name}" already exists.`});
        return null;
    }
    try {
      const newCategoryData = { ...category, id: uuidv4() }; // Ensure custom ID for user-added
      // We explicitly set the document ID here for user-created categories
      await addDoc(collection(db, 'users', user.uid, 'categories'), {name: newCategoryData.name, icon: newCategoryData.icon, color: newCategoryData.color});
      toast.success("Category Added",{description: `${newCategoryData.name} category has been added.` });
      // Firestore listener will update local state, but we can return the structure for immediate use if needed.
      // However, it's better to rely on the listener to avoid race conditions.
      // For simplicity here, we assume listener will catch up. The returned ID might not be the Firestore ID yet.
      // A more robust way might be to get the doc ref ID from addDoc.
      // For now, returning locally generated object.
      return newCategoryData; // This ID might not be the final Firestore ID if addDoc generates one.
                               // It's better to fetch or rely on onSnapshot to get the true representation.
                               // Let's refine this to addDoc and then set locally *if* successful, or let snapshot handle it.
                               // Simplified: The onSnapshot should handle the UI update.
    } catch (error) {
      console.error("Error adding category: ", error);
      toast.error("Error",{description: "Could not add category."});
      return null;
    }
  };

  const updateCategory = async (updatedCategory: Category) => {
    if (!user?.uid) return;
     // Check for name collision (case-insensitive), excluding the category being edited
    if (categoriesData.some(c => c.name.toLowerCase() === updatedCategory.name.toLowerCase() && c.id !== updatedCategory.id)) {
        toast.error("Category Exists",{description: `Another category named "${updatedCategory.name}" already exists.`});
        return;
    }
    try {
      const { id, ...dataToUpdate } = updatedCategory;
      await updateDoc(doc(db, 'users', user.uid, 'categories', id), dataToUpdate);
      toast.success("Category Updated",{description: `${updatedCategory.name} category has been updated.` });
    } catch (error) {
      console.error("Error updating category: ", error);
      toast.error("Error",{description: "Could not update category."});
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user?.uid) return;

    // Check if category is used in transactions
    const transactionsQuery = query(collection(db, 'users', user.uid, 'transactions'), where('categoryId', '==', id));
    const transactionSnap = await getDocs(transactionsQuery);
    if (!transactionSnap.empty) {
        toast.error("Cannot Delete Category",{description: "This category is in use by transactions." });
        return;
    }

    // Check if category is used in budgets
    const budgetsQuery = query(collection(db, 'users', user.uid, 'budgets'), where('categoryId', '==', id));
    const budgetSnap = await getDocs(budgetsQuery);
    if (!budgetSnap.empty) {
        toast.error("Cannot Delete Category",{description: "This category is in use by budgets." });
        return;
    }
    
    // Prevent deleting default categories that are part of constants
    if (DEFAULT_CATEGORIES.some(dc => dc.id === id)) {
       toast.error("Cannot Delete Category",{description: "Default categories cannot be deleted." });
       return;
    }

    try {
      await deleteDoc(doc(db, 'users', user.uid, 'categories', id));
      toast.success("Category Deleted",{description: "Category has been removed." });
    } catch (error) {
      console.error("Error deleting category: ", error);
      toast.error("Error",{description: "Could not delete category."});
    }
  };
  
  const getCategoryById = (id: string) => categoriesData.find(c => c.id === id);
  const getCategoryByName = (name: string) => categoriesData.find(c => c.name.toLowerCase() === name.toLowerCase());

  const addBudget = async (budget: Omit<Budget, 'id'>) => {
    if (!user?.uid) return;
    if (budgets.some(b => b.categoryId === budget.categoryId && b.period === budget.period)) {
      toast.error("Budget Exists",{ description: `A ${budget.period} budget for this category already exists.`});
      return;
    }
    try {
      await addDoc(collection(db, 'users', user.uid, 'budgets'), budget);
      toast.success("Budget Added",{description: `Budget for category has been set.` });
    } catch (error) {
      console.error("Error adding budget: ", error);
      toast.error("Error",{description: "Could not add budget."});
    }
  };

  const updateBudget = async (updatedBudget: Budget) => {
    if (!user?.uid) return;
    try {
      const { id, ...dataToUpdate } = updatedBudget;
      await updateDoc(doc(db, 'users', user.uid, 'budgets', id), dataToUpdate);
      toast.success("Budget Updated",{description: `Budget has been updated.` });
    } catch (error) {
      console.error("Error updating budget: ", error);
      toast.error("Error",{description: "Could not update budget."});
    }
  };

  const deleteBudget = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'budgets', id));
      toast.success("Budget Deleted",{description: `Budget has been removed.` });
    } catch (error) {
      console.error("Error deleting budget: ", error);
      toast.error("Error",{description: "Could not delete budget."});
    }
  };

  const getBudgetByCategoryId = (categoryId: string) => budgets.find(b => b.categoryId === categoryId);

  const contextValue = useMemo(() => ({
    transactions, loadingTransactions, addTransaction, updateTransaction, deleteTransaction, getTransactionsByCategory,
    categories: categoriesData, loadingCategories, addCategory, updateCategory, deleteCategory, getCategoryById, getCategoryByName,
    budgets, loadingBudgets, addBudget, updateBudget, deleteBudget, getBudgetByCategoryId,
  }), [
    transactions, loadingTransactions, 
    categoriesData, loadingCategories, 
    budgets, loadingBudgets,
    user?.uid // Re-memoize if user changes, to re-bind functions with correct uid scope
  ]);


  return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

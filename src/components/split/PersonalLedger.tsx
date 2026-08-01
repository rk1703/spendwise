"use client";

import React, { useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  BookOpen,
  UserPlus,
  Plus,
  Trash2,
  ArrowUpRight,
  ArrowDownLeft,
  Undo2,
  Loader2,
  CalendarIcon,
  PlusCircle,
  AlertCircle
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { db } from "@/lib/firebase/config";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot
} from "firebase/firestore";
import { toast } from "sonner";
import type { PersonalLendBorrow } from "@/lib/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface PersonalFriend {
  id: string;
  name: string;
  createdAt: string;
}

interface PersonalFriendMonthlyBalance {
  startingBalance: number;
  netChange: number;
  endingBalance: number;
}

function getMonthsInRange(minStr: string, maxStr: string): string[] {
  const months: string[] = [];
  const [minYear, minMonth] = minStr.split("-").map(Number);
  const [maxYear, maxMonth] = maxStr.split("-").map(Number);

  let year = minYear;
  let month = minMonth;

  while (year < maxYear || (year === maxYear && month <= maxMonth)) {
    const monthStr = `${year}-${String(month).padStart(2, "0")}`;
    months.push(monthStr);
    month++;
    if (month > 12) {
      month = 1;
      year++;
    }
  }
  return months;
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function computePersonalMonthlyBalances(
  transactions: PersonalLendBorrow[],
  friends: string[],
  currentDate: Date = new Date()
) {
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const currentMonthKey = format(currentDate, "yyyy-MM");
  const monthKeys = new Set<string>();
  monthKeys.add(currentMonthKey);

  sorted.forEach((t) => {
    try {
      if (t.date) {
        const mKey = format(new Date(t.date), "yyyy-MM");
        monthKeys.add(mKey);
      }
    } catch {
      // ignore invalid dates
    }
  });

  const sortedMonthKeys = Array.from(monthKeys).sort();
  const minMonthStr = sortedMonthKeys[0];
  const maxMonthStr = sortedMonthKeys[sortedMonthKeys.length - 1];

  const allMonths = getMonthsInRange(minMonthStr, maxMonthStr);

  const monthlyData: Record<string, Record<string, PersonalFriendMonthlyBalance>> = {};
  const runningBalances: Record<string, number> = {};
  friends.forEach((f) => {
    runningBalances[f] = 0;
  });

  allMonths.forEach((monthKey) => {
    monthlyData[monthKey] = {};
    const starting = { ...runningBalances };

    const changes: Record<string, number> = {};
    friends.forEach((f) => {
      changes[f] = 0;
    });

    const thisMonthTransactions = sorted.filter((t) => {
      try {
        return t.date && format(new Date(t.date), "yyyy-MM") === monthKey;
      } catch {
        return false;
      }
    });

    thisMonthTransactions.forEach((t) => {
      let change = 0;
      if (t.type === "lend") {
        change = t.amount;
      } else if (t.type === "borrow") {
        change = -t.amount;
      } else if (t.type === "repayment_to") {
        change = t.amount;
      } else if (t.type === "repayment_from") {
        change = -t.amount;
      }

      changes[t.friendName] = (changes[t.friendName] || 0) + change;
    });

    friends.forEach((f) => {
      const start = starting[f] || 0;
      const change = changes[f] || 0;
      const end = start + change;

      runningBalances[f] = round2(end);

      monthlyData[monthKey][f] = {
        startingBalance: round2(start),
        netChange: round2(change),
        endingBalance: round2(end),
      };
    });
  });

  return {
    allMonths,
    monthlyData,
  };
}

function formatMonthKey(key: string) {
  if (key === "all") return "All Time";
  try {
    const [year, month] = key.split("-").map(Number);
    const date = new Date(year, month - 1, 1);
    return format(date, "MMMM yyyy");
  } catch {
    return key;
  }
}

export function PersonalLedger() {
  const { user } = useAuth();

  const [friendsList, setFriendsList] = useState<PersonalFriend[]>([]);
  const [transactions, setTransactions] = useState<PersonalLendBorrow[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [loadingTransactions, setLoadingTransactions] = useState(true);

  const [selectedFriendName, setSelectedFriendName] = useState<string>("");
  const [newFriendName, setNewFriendName] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Form states
  const [txType, setTxType] = useState<"lend" | "borrow" | "repayment_to" | "repayment_from">("lend");
  const [txAmount, setTxAmount] = useState("");
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState<Date>(new Date());
  const [submittingTx, setSubmittingTx] = useState(false);

  // Fetch friends and transactions
  useEffect(() => {
    if (!user?.uid) {
      setFriendsList([]);
      setTransactions([]);
      setLoadingFriends(false);
      setLoadingTransactions(false);
      return;
    }

    setLoadingFriends(true);
    setLoadingTransactions(true);

    const friendsRef = collection(db, "users", user.uid, "friends");
    const unsubFriends = onSnapshot(
      friendsRef,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PersonalFriend, "id">),
        }));
        list.sort((a, b) => a.name.localeCompare(b.name));
        setFriendsList(list);
        setLoadingFriends(false);
      },
      (err) => {
        console.error("Error fetching friends list:", err);
        toast.error("Error", { description: "Could not load friends list." });
        setLoadingFriends(false);
      }
    );

    const txRef = collection(db, "users", user.uid, "personalLedger");
    const unsubTx = onSnapshot(
      txRef,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PersonalLendBorrow, "id">),
        }));
        setTransactions(list);
        setLoadingTransactions(false);
      },
      (err) => {
        console.error("Error fetching personal ledger:", err);
        toast.error("Error", { description: "Could not load personal ledger." });
        setLoadingTransactions(false);
      }
    );

    return () => {
      unsubFriends();
      unsubTx();
    };
  }, [user?.uid]);

  const friendNames = useMemo(() => friendsList.map((f) => f.name), [friendsList]);

  // Calculations
  const monthlyCalc = useMemo(() => {
    return computePersonalMonthlyBalances(transactions, friendNames);
  }, [transactions, friendNames]);

  // Set default selected friend if none selected
  useEffect(() => {
    if (!selectedFriendName && friendsList.length > 0) {
      setSelectedFriendName(friendsList[0].name);
    }
  }, [friendsList, selectedFriendName]);

  // Sync selectedMonth if it goes out of scope
  useEffect(() => {
    const currentMonthStr = format(new Date(), "yyyy-MM");
    if (selectedMonth === "all") return;

    if (monthlyCalc.allMonths.length > 0) {
      if (!monthlyCalc.allMonths.includes(selectedMonth)) {
        if (monthlyCalc.allMonths.includes(currentMonthStr)) {
          setSelectedMonth(currentMonthStr);
        } else {
          setSelectedMonth(monthlyCalc.allMonths[monthlyCalc.allMonths.length - 1]);
        }
      }
    } else {
      setSelectedMonth("all");
    }
  }, [monthlyCalc.allMonths, selectedMonth]);

  // Selected friend's current status and transactions
  const { friendEndingBalance, visibleTransactions } = useMemo(() => {
    let balance = 0;
    
    if (selectedMonth === "all") {
      // Net across all transactions for this friend
      transactions
        .filter((t) => t.friendName.toLowerCase() === selectedFriendName.toLowerCase())
        .forEach((t) => {
          if (t.type === "lend" || t.type === "repayment_to") {
            balance += t.amount;
          } else {
            balance -= t.amount;
          }
        });
    } else {
      balance = monthlyCalc.monthlyData[selectedMonth]?.[selectedFriendName]?.endingBalance ?? 0;
    }

    const filteredTx = transactions
      .filter((t) => {
        if (t.friendName.toLowerCase() !== selectedFriendName.toLowerCase()) return false;
        if (selectedMonth === "all") return true;
        try {
          return t.date && format(new Date(t.date), "yyyy-MM") === selectedMonth;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      friendEndingBalance: round2(balance),
      visibleTransactions: filteredTx,
    };
  }, [selectedFriendName, selectedMonth, transactions, monthlyCalc]);

  // Global Ledger Summary (across all friends)
  const ledgerSummary = useMemo(() => {
    let starting = 0;
    let change = 0;
    let ending = 0;

    if (selectedMonth === "all") {
      // Accumulate all-time ending balance of all friends
      friendNames.forEach((f) => {
        transactions
          .filter((t) => t.friendName.toLowerCase() === f.toLowerCase())
          .forEach((t) => {
            if (t.type === "lend" || t.type === "repayment_to") {
              ending += t.amount;
            } else {
              ending -= t.amount;
            }
          });
      });
    } else {
      friendNames.forEach((f) => {
        const mData = monthlyCalc.monthlyData[selectedMonth]?.[f] || { startingBalance: 0, netChange: 0, endingBalance: 0 };
        starting += mData.startingBalance;
        change += mData.netChange;
        ending += mData.endingBalance;
      });
    }

    return {
      startingBalance: round2(starting),
      netChange: round2(change),
      endingBalance: round2(ending),
    };
  }, [friendNames, selectedMonth, transactions, monthlyCalc]);

  // Helper to add a friend ledger
  const addFriend = async (name: string) => {
    if (!user?.uid) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    if (friendsList.some(f => f.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Already Exists", { description: `${trimmed} is already in your friends list.` });
      return;
    }
    try {
      await addDoc(collection(db, "users", user.uid, "friends"), {
        name: trimmed,
        createdAt: new Date().toISOString(),
      });
      toast.success("Friend Added", { description: `Created ledger for ${trimmed}.` });
    } catch (err) {
      console.error(err);
      toast.error("Error", { description: "Failed to add friend." });
    }
  };

  // Helper to delete a friend ledger and their transactions
  const deleteFriend = async (friendId: string, name: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendId));
      const txsToDelete = transactions.filter(t => t.friendName.toLowerCase() === name.toLowerCase());
      for (const tx of txsToDelete) {
        await deleteDoc(doc(db, "users", user.uid, "personalLedger", tx.id));
      }
      toast.success("Ledger Deleted", { description: `Removed ${name} and their transactions.` });
    } catch (err) {
      console.error(err);
      toast.error("Error", { description: "Failed to delete friend ledger." });
    }
  };

  // Handlers
  const handleAddFriendSubmit = async () => {
    const name = newFriendName.trim();
    if (!name) return;
    await addFriend(name);
    setNewFriendName("");
    setSelectedFriendName(name);
  };

  const handleAddTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !selectedFriendName) return;

    const amt = parseFloat(txAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Validation Error", { description: "Please enter a valid positive amount." });
      return;
    }

    setSubmittingTx(true);
    try {
      let desc = txDescription.trim();
      if (!desc) {
        if (txType === "lend") desc = `Lent money to ${selectedFriendName}`;
        else if (txType === "borrow") desc = `Borrowed money from ${selectedFriendName}`;
        else if (txType === "repayment_to") desc = `Repaid ${selectedFriendName}`;
        else if (txType === "repayment_from") desc = `Received repayment from ${selectedFriendName}`;
      }

      await addDoc(collection(db, "users", user.uid, "personalLedger"), {
        friendName: selectedFriendName,
        amount: amt,
        date: txDate.toISOString(),
        description: desc,
        type: txType,
        createdAt: new Date().toISOString(),
      });

      setTxAmount("");
      setTxDescription("");
      setTxDate(new Date());
      toast.success("Recorded", { description: "Transaction added to ledger." });
    } catch (err) {
      console.error("Error adding ledger transaction:", err);
      toast.error("Error", { description: "Could not add transaction." });
    } finally {
      setSubmittingTx(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "personalLedger", id));
      toast.success("Deleted", { description: "Transaction removed from ledger." });
    } catch (err) {
      console.error(err);
      toast.error("Error", { description: "Failed to delete transaction." });
    }
  };

  const isLoading = loadingFriends || loadingTransactions;

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
      {/* Sidebar: Friends List */}
      <Card className="shadow-lg h-fit">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-primary" />
              Friends
            </CardTitle>
            <CardDescription className="text-xs">Direct private ledger list.</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Add Friend">
                <UserPlus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[360px] rounded-lg">
              <DialogHeader>
                <DialogTitle>Start Friend Ledger</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="friend-name">Friend's Name</Label>
                  <Input
                    id="friend-name"
                    value={newFriendName}
                    onChange={(e) => setNewFriendName(e.target.value)}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <Button onClick={handleAddFriendSubmit} className="w-full">
                  Create Ledger
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : friendsList.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ledgers yet. Add a friend to start tracking personal lending/borrowing.</p>
          ) : (
            <div className="space-y-1">
              {friendsList.map((f) => {
                const isActive = f.name.toLowerCase() === selectedFriendName.toLowerCase();
                
                // Find balance
                let balVal = 0;
                if (selectedMonth === "all") {
                  transactions
                    .filter((t) => t.friendName.toLowerCase() === f.name.toLowerCase())
                    .forEach((t) => {
                      if (t.type === "lend" || t.type === "repayment_to") balVal += t.amount;
                      else balVal -= t.amount;
                    });
                } else {
                  balVal = monthlyCalc.monthlyData[selectedMonth]?.[f.name]?.endingBalance ?? 0;
                }

                return (
                  <div key={f.id} className="flex items-center gap-1">
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className="flex-1 justify-between text-left h-10 px-2.5"
                      onClick={() => setSelectedFriendName(f.name)}
                    >
                      <span className="truncate text-xs font-medium">{f.name}</span>
                      <span
                        className={cn(
                          "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                          balVal > 0
                            ? isActive ? "bg-white text-emerald-600 border-emerald-200" : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : balVal < 0
                            ? isActive ? "bg-white text-rose-600 border-rose-200" : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : isActive ? "bg-white text-muted-foreground border-border" : "bg-muted text-muted-foreground border-border"
                        )}
                      >
                        {balVal > 0 ? "+" : ""}₹{balVal.toFixed(0)}
                      </span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Delete Friend">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[380px] rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete friend ledger?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the ledger for {f.name} and remove all history. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => {
                              deleteFriend(f.id, f.name);
                              if (selectedFriendName === f.name) setSelectedFriendName("");
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main ledger content */}
      <div className="space-y-6">
        {/* Month Selector & Global Summary */}
        <div className="grid gap-6 md:grid-cols-[200px_1fr] items-start">
          <div className="space-y-2">
            <Label htmlFor="ledger-month-select" className="text-sm font-semibold text-muted-foreground">Ledger Period</Label>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger id="ledger-month-select" className="w-full bg-background border">
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                {[...monthlyCalc.allMonths].reverse().map((m) => (
                  <SelectItem key={m} value={m}>
                    {formatMonthKey(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card className="bg-gradient-to-br from-background via-accent/5 to-primary/5 border shadow-sm">
            <CardContent className="pt-6">
              {selectedMonth === "all" ? (
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overall Net Ledger Balance</p>
                    <h3 className="text-2xl font-bold tracking-tight mt-1">
                      <span className={cn(ledgerSummary.endingBalance > 0 ? "text-emerald-600" : ledgerSummary.endingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                        {ledgerSummary.endingBalance > 0 ? "+" : ""}₹{ledgerSummary.endingBalance.toFixed(2)}
                      </span>
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground max-w-sm">
                    {ledgerSummary.endingBalance > 0
                      ? "Others owe you money across all personal ledgers."
                      : ledgerSummary.endingBalance < 0
                      ? "You owe money to others across all personal ledgers."
                      : "You are fully settled up across all personal ledgers!"}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="font-semibold text-sm">Ledger Summary ({formatMonthKey(selectedMonth)})</h4>
                    <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">Accumulated Balance</span>
                  </div>
                  <div className="grid gap-4 grid-cols-3 text-center">
                    <div className="space-y-1 p-2.5 rounded-md bg-muted/40 border">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Carried Forward</p>
                      <p className={cn("text-sm font-bold mt-0.5", ledgerSummary.startingBalance > 0 ? "text-emerald-600" : ledgerSummary.startingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                        {ledgerSummary.startingBalance > 0 ? "+" : ""}₹{ledgerSummary.startingBalance.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1 p-2.5 rounded-md bg-muted/40 border">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Month Activity</p>
                      <p className={cn("text-sm font-bold mt-0.5", ledgerSummary.netChange > 0 ? "text-emerald-600" : ledgerSummary.netChange < 0 ? "text-rose-600" : "text-muted-foreground")}>
                        {ledgerSummary.netChange > 0 ? "+" : ""}₹{ledgerSummary.netChange.toFixed(2)}
                      </p>
                    </div>
                    <div className="space-y-1 p-2.5 rounded-md bg-primary/10 border border-primary/20">
                      <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Ending Balance</p>
                      <p className={cn("text-sm font-black mt-0.5", ledgerSummary.endingBalance > 0 ? "text-emerald-600" : ledgerSummary.endingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                        {ledgerSummary.endingBalance > 0 ? "+" : ""}₹{ledgerSummary.endingBalance.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Friend Details */}
        {!selectedFriendName ? (
          <Card className="border-dashed shadow-sm flex items-center justify-center p-12 text-center">
            <div className="space-y-2">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto" />
              <h4 className="font-semibold text-sm">No Ledger Selected</h4>
              <p className="text-xs text-muted-foreground max-w-xs">Select a friend from the left sidebar or start a new ledger to track transactions.</p>
            </div>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-[1fr_1.2fr] items-start">
            {/* Left: Add transaction */}
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-base">Record for {selectedFriendName}</CardTitle>
                <CardDescription className="text-xs">Write lending, borrowing, or repayment history.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTransactionSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tx-type">Transaction Type</Label>
                    <Select value={txType} onValueChange={(val: any) => setTxType(val)}>
                      <SelectTrigger id="tx-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lend">I lent money to {selectedFriendName}</SelectItem>
                        <SelectItem value="borrow">I borrowed money from {selectedFriendName}</SelectItem>
                        <SelectItem value="repayment_to">I repaid {selectedFriendName}</SelectItem>
                        <SelectItem value="repayment_from">{selectedFriendName} repaid me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="tx-amount">Amount</Label>
                      <Input
                        id="tx-amount"
                        type="number"
                        step="0.01"
                        value={txAmount}
                        onChange={(e) => setTxAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tx-date">Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal h-10"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {txDate ? format(txDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={txDate}
                            onSelect={(val) => val && setTxDate(val)}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tx-desc">Description (Optional)</Label>
                    <Input
                      id="tx-desc"
                      value={txDescription}
                      onChange={(e) => setTxDescription(e.target.value)}
                      placeholder="e.g. For movie tickets"
                    />
                  </div>

                  <Button type="submit" disabled={submittingTx} className="w-full">
                    {submittingTx ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Save Ledger Entry
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Right: Ledger History */}
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Ledger History</CardTitle>
                  <CardDescription className="text-xs">Direct statements.</CardDescription>
                </div>
                <span
                  className={cn(
                    "text-xs font-semibold px-2.5 py-1 rounded-full border shadow-sm",
                    friendEndingBalance > 0
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : friendEndingBalance < 0
                      ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      : "bg-muted text-muted-foreground border-border"
                  )}
                >
                  {friendEndingBalance > 0
                    ? `Owes you ₹${friendEndingBalance.toFixed(2)}`
                    : friendEndingBalance < 0
                    ? `You owe ₹${Math.abs(friendEndingBalance).toFixed(2)}`
                    : "Settled up"}
                </span>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[460px] overflow-y-auto">
                {visibleTransactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-6 text-center">No transactions recorded for this period.</p>
                ) : (
                  visibleTransactions.map((t) => {
                    let icon = <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
                    let amountColor = "text-emerald-600";
                    let borderClass = "border-emerald-500/20 bg-emerald-500/[0.02]";
                    let statusLabel = "";

                    if (t.type === "lend") {
                      icon = <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
                      amountColor = "text-emerald-600 font-bold";
                      borderClass = "border-emerald-500/20 bg-emerald-500/[0.01]";
                      statusLabel = "You lent";
                    } else if (t.type === "borrow") {
                      icon = <ArrowDownLeft className="h-4 w-4 text-rose-500" />;
                      amountColor = "text-rose-600 font-bold";
                      borderClass = "border-rose-500/20 bg-rose-500/[0.01]";
                      statusLabel = "You borrowed";
                    } else if (t.type === "repayment_to") {
                      icon = <Undo2 className="h-4 w-4 text-sky-500" />;
                      amountColor = "text-sky-600 font-bold";
                      borderClass = "border-sky-500/20 bg-sky-500/[0.01]";
                      statusLabel = "You repaid";
                    } else if (t.type === "repayment_from") {
                      icon = <Undo2 className="h-4 w-4 text-emerald-500" />;
                      amountColor = "text-emerald-600 font-bold";
                      borderClass = "border-emerald-500/20 bg-emerald-500/[0.01]";
                      statusLabel = "Repaid you";
                    }

                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "rounded-md border p-3 flex items-start justify-between gap-3 shadow-sm transition-all hover:shadow",
                          borderClass
                        )}
                      >
                        <div className="flex gap-2.5 items-start min-w-0">
                          <div className="p-1.5 rounded-full bg-background border mt-0.5">
                            {icon}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-xs truncate text-foreground">{t.description}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {format(new Date(t.date), "MMM dd, yyyy")} • <span className="font-medium">{statusLabel}</span>
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={cn("font-semibold text-xs", amountColor)}>₹{t.amount.toFixed(2)}</p>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="icon" variant="ghost" className="h-6 w-6 hover:text-destructive" aria-label="Delete Ledger Entry">
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="max-w-[360px] rounded-lg">
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete ledger entry?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will remove this record from your private ledger.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteTransaction(t.id)}
                                  className="bg-destructive hover:bg-destructive/90 text-white"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

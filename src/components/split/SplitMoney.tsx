"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Users, PlusCircle, Trash2, ReceiptIndianRupee, Loader2, Link as LinkIcon, Copy, ArrowUpRight, ArrowDownLeft, Undo2 } from "lucide-react";

import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { SplitGroupExpense, SplitGroupMember } from "@/lib/types";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@/components/ui/alert-dialog";

type Settlement = { fromMemberId: string; toMemberId: string; amount: number };

export type MemberMonthlyBalance = {
  startingBalance: number;
  netChange: number;
  endingBalance: number;
};

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

function computeMonthlyBalances(
  expenses: SplitGroupExpense[],
  members: SplitGroupMember[],
  currentDate: Date = new Date()
) {
  const sortedExpenses = [...expenses].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const currentMonthKey = format(currentDate, "yyyy-MM");
  const monthKeys = new Set<string>();
  monthKeys.add(currentMonthKey);

  sortedExpenses.forEach((e) => {
    try {
      if (e.date) {
        const mKey = format(new Date(e.date), "yyyy-MM");
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

  const monthlyData: Record<string, Record<string, MemberMonthlyBalance>> = {};
  const runningBalances: Record<string, number> = {};
  members.forEach((m) => {
    runningBalances[m.uid] = 0;
  });

  allMonths.forEach((monthKey) => {
    monthlyData[monthKey] = {};
    const starting = { ...runningBalances };

    const changes: Record<string, number> = {};
    members.forEach((m) => {
      changes[m.uid] = 0;
    });

    const thisMonthExpenses = sortedExpenses.filter((e) => {
      try {
        return e.date && format(new Date(e.date), "yyyy-MM") === monthKey;
      } catch {
        return false;
      }
    });

    thisMonthExpenses.forEach((e) => {
      const splitIds = Array.isArray(e.splitBetweenUids) ? e.splitBetweenUids : [];
      const n = splitIds.length || 1;
      const share = e.amount / n;

      changes[e.paidByUid] = (changes[e.paidByUid] || 0) + e.amount;
      splitIds.forEach((uid) => {
        changes[uid] = (changes[uid] || 0) - share;
      });
    });

    members.forEach((m) => {
      const start = starting[m.uid] || 0;
      const change = changes[m.uid] || 0;
      const end = start + change;
      runningBalances[m.uid] = round2(end);

      monthlyData[monthKey][m.uid] = {
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

const addExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({ required_error: "Date is required" }),
  paidByUid: z.string().min(1, "Payer is required"),
  splitBetweenUids: z.array(z.string()).min(1, "Select at least one person"),
});

type AddExpenseFormData = z.infer<typeof addExpenseSchema>;

function computeNetByMemberId(expenses: SplitGroupExpense[]) {
  const net: Record<string, number> = {};
  for (const e of expenses) {
    const splitIds = Array.isArray(e.splitBetweenUids) ? e.splitBetweenUids : [];
    const n = splitIds.length || 1;
    const share = e.amount / n;

    net[e.paidByUid] = (net[e.paidByUid] || 0) + e.amount;
    for (const memberId of splitIds) {
      net[memberId] = (net[memberId] || 0) - share;
    }
  }
  // normalize for display (avoid -0)
  Object.keys(net).forEach((k) => {
    net[k] = round2(net[k]);
    if (Object.is(net[k], -0)) net[k] = 0;
  });
  return net;
}

function computeSettlement(net: Record<string, number>) {
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0.009)
    .map(([id, v]) => ({ id, amount: v }))
    .sort((a, b) => b.amount - a.amount);

  const debtors = Object.entries(net)
    .filter(([, v]) => v < -0.009)
    .map(([id, v]) => ({ id, amount: -v }))
    .sort((a, b) => b.amount - a.amount);

  const settlements: Settlement[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const d = debtors[i];
    const c = creditors[j];
    const amt = Math.min(d.amount, c.amount);
    if (amt > 0.009) {
      settlements.push({ fromMemberId: d.id, toMemberId: c.id, amount: round2(amt) });
    }
    d.amount = round2(d.amount - amt);
    c.amount = round2(c.amount - amt);
    if (d.amount <= 0.009) i++;
    if (c.amount <= 0.009) j++;
  }
  return settlements;
}

export function SplitMoney() {
  const {
    splitGroups,
    loadingSplitGroups,
    deleteSplitGroup,
    createSplitGroup,
    createSplitInvite,
    addSplitGroupExpense,
    deleteSplitGroupExpense,
  } = useAppContext();
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [newGroupName, setNewGroupName] = useState("");
  const [members, setMembers] = useState<SplitGroupMember[]>([]);
  const [expenses, setExpenses] = useState<SplitGroupExpense[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [loadingExpenses, setLoadingExpenses] = useState(true);
  const [inviteUrl, setInviteUrl] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  useEffect(() => {
    const groupIdFromUrl = searchParams.get("groupId");
    if (groupIdFromUrl) setSelectedGroupId(groupIdFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  useEffect(() => {
    if (!selectedGroupId && splitGroups.length > 0) {
      setSelectedGroupId(splitGroups[0].id);
      return;
    }
    if (selectedGroupId && splitGroups.length > 0 && !splitGroups.some((g) => g.id === selectedGroupId)) {
      setSelectedGroupId(splitGroups[0].id);
    }
  }, [splitGroups, selectedGroupId]);

  const group = splitGroups.find((g) => g.id === selectedGroupId);
  useEffect(() => {
    setInviteUrl("");
    if (!selectedGroupId) {
      setMembers([]);
      setExpenses([]);
      setLoadingMembers(false);
      setLoadingExpenses(false);
      return;
    }

    setLoadingMembers(true);
    setLoadingExpenses(true);

    const membersRef = collection(db, "splitGroups", selectedGroupId, "members");
    const expensesRef = collection(db, "splitGroups", selectedGroupId, "expenses");

    // No orderBy to avoid index + permission issues; sort client-side.
    const unsubMembers = onSnapshot(
      membersRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SplitGroupMember, "id">) }));
        list.sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
        setMembers(list);
        setLoadingMembers(false);
      },
      (err) => {
        console.error("Error fetching split members:", err);
        toast.error("Error", { description: "Could not load group members." });
        setLoadingMembers(false);
      }
    );

    const unsubExpenses = onSnapshot(
      expensesRef,
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<SplitGroupExpense, "id">) }));
        list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setExpenses(list);
        setLoadingExpenses(false);
      },
      (err) => {
        console.error("Error fetching split expenses:", err);
        toast.error("Error", { description: "Could not load group expenses." });
        setLoadingExpenses(false);
      }
    );

    return () => {
      unsubMembers();
      unsubExpenses();
    };
  }, [selectedGroupId]);

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {};
    members.forEach((m) => {
      map[m.uid] = m.displayName || m.email || "User";
    });
    return map;
  }, [members]);

  const monthlyCalc = useMemo(() => {
    return computeMonthlyBalances(expenses, members);
  }, [expenses, members]);

  // Sync selectedMonth when expenses or group members load
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

  const { visibleExpenses, netByMemberId, settlement } = useMemo(() => {
    if (selectedMonth === "all") {
      const net = computeNetByMemberId(expenses);
      const setl = computeSettlement(net);
      return {
        visibleExpenses: expenses,
        netByMemberId: net,
        settlement: setl,
      };
    }

    const monthData = monthlyCalc.monthlyData[selectedMonth] || {};
    const endingBalances: Record<string, number> = {};
    members.forEach((m) => {
      endingBalances[m.uid] = monthData[m.uid]?.endingBalance ?? 0;
    });

    const setl = computeSettlement(endingBalances);
    const filtered = expenses.filter((e) => {
      try {
        return e.date && format(new Date(e.date), "yyyy-MM") === selectedMonth;
      } catch {
        return false;
      }
    });

    return {
      visibleExpenses: filtered,
      netByMemberId: endingBalances,
      settlement: setl,
    };
  }, [selectedMonth, expenses, members, monthlyCalc]);

  const isLoading = loadingSplitGroups || loadingMembers || loadingExpenses;

  const { control, handleSubmit, reset, watch, formState } = useForm<AddExpenseFormData>({
    resolver: zodResolver(addExpenseSchema),
    defaultValues: {
      description: "",
      amount: undefined,
      date: new Date(),
      paidByUid: "",
      splitBetweenUids: [],
    },
  });

  const paidByUid = watch("paidByUid");
  const splitBetweenUids = watch("splitBetweenUids");

  const onSubmitExpense = async (data: AddExpenseFormData) => {
    if (!selectedGroupId) return;
    const expense: Omit<SplitGroupExpense, "id" | "createdAt" | "createdByUid"> = {
      description: data.description.trim(),
      amount: data.amount,
      date: data.date.toISOString(),
      paidByUid: data.paidByUid,
      splitBetweenUids: data.splitBetweenUids,
    };
    await addSplitGroupExpense(selectedGroupId, expense);
    reset({ description: "", amount: undefined, date: new Date(), paidByUid: paidByUid, splitBetweenUids: splitBetweenUids });
  };

  // Local state for Lend / Borrow form
  const [lbType, setLbType] = useState<"lend" | "borrow" | "repay_to" | "repay_from">("lend");
  const [lbPartnerUid, setLbPartnerUid] = useState<string>("");
  const [lbAmount, setLbAmount] = useState<string>("");
  const [lbDescription, setLbDescription] = useState<string>("");
  const [lbDate, setLbDate] = useState<Date>(new Date());
  const [submittingLb, setSubmittingLb] = useState<boolean>(false);

  const onSubmitLendBorrow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupId || !user?.uid) return;
    if (!lbPartnerUid) {
      toast.error("Validation Error", { description: "Please select a group member." });
      return;
    }
    const amt = parseFloat(lbAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Validation Error", { description: "Amount must be a positive number." });
      return;
    }

    setSubmittingLb(true);
    try {
      let paidByUid = "";
      let splitBetweenUids: string[] = [];
      let txType: "lend_borrow" | "repayment" = "lend_borrow";
      let desc = lbDescription.trim();

      const partnerName = memberNameById[lbPartnerUid] || "Someone";

      if (lbType === "lend") {
        paidByUid = user.uid;
        splitBetweenUids = [lbPartnerUid];
        txType = "lend_borrow";
        if (!desc) desc = `Lent money to ${partnerName}`;
      } else if (lbType === "borrow") {
        paidByUid = lbPartnerUid;
        splitBetweenUids = [user.uid];
        txType = "lend_borrow";
        if (!desc) desc = `Borrowed money from ${partnerName}`;
      } else if (lbType === "repay_to") {
        paidByUid = user.uid;
        splitBetweenUids = [lbPartnerUid];
        txType = "repayment";
        if (!desc) desc = `Repaid ${partnerName}`;
      } else if (lbType === "repay_from") {
        paidByUid = lbPartnerUid;
        splitBetweenUids = [user.uid];
        txType = "repayment";
        if (!desc) desc = `Received repayment from ${partnerName}`;
      }

      const expense: Omit<SplitGroupExpense, "id" | "createdAt" | "createdByUid"> = {
        description: desc,
        amount: amt,
        date: lbDate.toISOString(),
        paidByUid,
        splitBetweenUids,
        type: txType,
      };

      await addSplitGroupExpense(selectedGroupId, expense);
      
      // Reset form fields
      setLbAmount("");
      setLbDescription("");
      setLbDate(new Date());
      toast.success("Success", { description: "Lend/Borrow transaction recorded." });
    } catch (err) {
      console.error("Error adding lend/borrow transaction:", err);
      toast.error("Error", { description: "Failed to record transaction." });
    } finally {
      setSubmittingLb(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Groups
            </CardTitle>
            <CardDescription>Create and manage shared-expense groups.</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" aria-label="Create group">
                <PlusCircle className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[380px] md:max-w-[500px] rounded-lg">
              <DialogHeader>
                <DialogTitle>Create Group</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="group-name">Group name</Label>
                  <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder='e.g., "Goa Trip"'
                  />
                </div>
                <Button
                  onClick={async () => {
                    await createSplitGroup(newGroupName);
                    setNewGroupName("");
                  }}
                  className="w-full"
                >
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : splitGroups.length === 0 ? (
            <p className="text-sm text-muted-foreground">No groups yet. Create one to start splitting expenses.</p>
          ) : (
            <div className="space-y-2">
              {splitGroups.map((g) => {
                const isActive = g.id === selectedGroupId;
                return (
                  <div key={g.id} className="flex items-center gap-2">
                    <Button
                      variant={isActive ? "default" : "outline"}
                      className="flex-1 justify-start"
                      onClick={() => setSelectedGroupId(g.id)}
                    >
                      {g.name}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="outline" aria-label="Delete group">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="max-w-[380px] md:max-w-[500px] rounded-lg">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete group?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will delete the group, its members, and all shared expenses. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await deleteSplitGroup(g.id);
                              if (selectedGroupId === g.id) setSelectedGroupId("");
                            }}
                            className="bg-destructive hover:bg-destructive/90"
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

      <div className="space-y-6">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ReceiptIndianRupee className="h-5 w-5 text-primary" />
              Split Money
            </CardTitle>
            <CardDescription>
              {group ? (
                <>
                  Group: <span className="font-medium text-foreground">{group.name}</span>
                </>
              ) : (
                "Select a group to manage shared expenses."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!group ? (
              <p className="text-sm text-muted-foreground">Create a group and select it to begin.</p>
            ) : (
              <>
                {/* Month Selector & Summary Dashboard */}
                <div className="grid gap-6 md:grid-cols-[200px_1fr] items-start">
                  <div className="space-y-2">
                    <Label htmlFor="month-select" className="text-sm font-semibold text-muted-foreground">Statement Period</Label>
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger id="month-select" className="w-full bg-background border">
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
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">All-Time Net Balance</p>
                            <h3 className="text-2xl font-bold tracking-tight mt-1">
                              {(() => {
                                const userVal = netByMemberId[user?.uid || ""] ?? 0;
                                return (
                                  <span className={cn(userVal > 0 ? "text-emerald-600" : userVal < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {userVal > 0 ? "+" : ""}₹{userVal.toFixed(2)}
                                  </span>
                                );
                              })()}
                            </h3>
                          </div>
                          <div className="text-xs text-muted-foreground max-w-md">
                            Showing the cumulative net balance across all expenses recorded in this group.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between border-b pb-2">
                            <h4 className="font-semibold text-sm">Monthly Summary ({formatMonthKey(selectedMonth)})</h4>
                            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">Carried Forward</span>
                          </div>
                          {(() => {
                            const uBal = monthlyCalc.monthlyData[selectedMonth]?.[user?.uid || ""] || { startingBalance: 0, netChange: 0, endingBalance: 0 };
                            return (
                              <div className="grid gap-4 grid-cols-3 text-center">
                                <div className="space-y-1 p-2.5 rounded-md bg-muted/40 border">
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Carried Forward</p>
                                  <p className={cn("text-sm font-bold mt-0.5", uBal.startingBalance > 0 ? "text-emerald-600" : uBal.startingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {uBal.startingBalance > 0 ? "+" : ""}₹{uBal.startingBalance.toFixed(2)}
                                  </p>
                                </div>
                                <div className="space-y-1 p-2.5 rounded-md bg-muted/40 border">
                                  <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">This Month Net</p>
                                  <p className={cn("text-sm font-bold mt-0.5", uBal.netChange > 0 ? "text-emerald-600" : uBal.netChange < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {uBal.netChange > 0 ? "+" : ""}₹{uBal.netChange.toFixed(2)}
                                  </p>
                                </div>
                                <div className="space-y-1 p-2.5 rounded-md bg-primary/10 border border-primary/20">
                                  <p className="text-[10px] uppercase font-bold text-primary tracking-wider">Ending Balance</p>
                                  <p className={cn("text-sm font-black mt-0.5", uBal.endingBalance > 0 ? "text-emerald-600" : uBal.endingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {uBal.endingBalance > 0 ? "+" : ""}₹{uBal.endingBalance.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <LinkIcon className="h-4 w-4 text-primary" />
                      Invite link
                    </CardTitle>
                    <CardDescription>Invite other signed-in users to join this group.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={inviteUrl} readOnly placeholder="Generate an invite link…" />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          if (!selectedGroupId) return;
                          const res = await createSplitInvite(selectedGroupId);
                          if (res?.inviteUrl) setInviteUrl(res.inviteUrl);
                        }}
                      >
                        Generate
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        aria-label="Copy invite link"
                        onClick={async () => {
                          if (!inviteUrl) return;
                          try {
                            await navigator.clipboard.writeText(inviteUrl);
                            toast.success("Copied", { description: "Invite link copied to clipboard." });
                          } catch {
                            toast.error("Copy failed", { description: "Could not copy the link. Please copy manually." });
                          }
                        }}
                        disabled={!inviteUrl}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Anyone with the link can join (until it expires). Links currently expire in 7 days.
                    </p>
                  </CardContent>
                </Card>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Members</CardTitle>
                      <CardDescription>All users who have joined this group.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members found. Generate an invite link and join from another account.</p>
                      ) : (
                        <div className="space-y-2">
                          {members.map((m) => {
                            const label = m.displayName || m.email || "User";
                            const uid = m.uid;
                            const isYou = uid === user?.uid;
                            
                            if (selectedMonth === "all") {
                              const netVal = netByMemberId[uid] ?? 0;
                              return (
                                <div key={m.id} className="flex items-center justify-between rounded-md border p-3 bg-card hover:bg-accent/5 transition-colors">
                                  <p className="font-medium text-sm">
                                    {label} {isYou ? <span className="text-xs text-muted-foreground font-normal">(You)</span> : null}
                                  </p>
                                  <p className={cn("font-semibold text-sm", netVal > 0 ? "text-emerald-600" : netVal < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {netVal > 0 ? "+" : ""}₹{netVal.toFixed(2)}
                                  </p>
                                </div>
                              );
                            }

                            const balances = monthlyCalc.monthlyData[selectedMonth]?.[uid] || { startingBalance: 0, netChange: 0, endingBalance: 0 };
                            return (
                              <div key={m.id} className="rounded-md border p-3 bg-card space-y-2 hover:bg-accent/5 transition-colors">
                                <div className="flex items-center justify-between">
                                  <p className="font-medium text-sm">
                                    {label} {isYou ? <span className="text-xs text-muted-foreground font-normal">(You)</span> : null}
                                  </p>
                                  <p className={cn("font-semibold text-sm", balances.endingBalance > 0 ? "text-emerald-600" : balances.endingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                    {balances.endingBalance > 0 ? "+" : ""}₹{balances.endingBalance.toFixed(2)}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground border-t pt-1.5">
                                  <div>
                                    <span>Carried forward: </span>
                                    <span className={cn("font-medium", balances.startingBalance > 0 ? "text-emerald-600" : balances.startingBalance < 0 ? "text-rose-600" : "text-muted-foreground")}>
                                      ₹{balances.startingBalance.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-right">
                                    <span>This month: </span>
                                    <span className={cn("font-medium", balances.netChange >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                      {balances.netChange >= 0 ? "+" : ""}₹{balances.netChange.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                           <Card className="shadow-sm">
                    <Tabs defaultValue="expense" className="w-full">
                      <CardHeader className="pb-2">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="expense">Split Expense</TabsTrigger>
                          <TabsTrigger value="lend_borrow">Lend / Borrow</TabsTrigger>
                        </TabsList>
                      </CardHeader>
                      
                      <TabsContent value="expense" className="mt-0">
                        <CardHeader className="pt-2">
                          <CardTitle className="text-base">Add Split Expense</CardTitle>
                          <CardDescription>Record a shared expense split between members.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {members.length < 2 ? (
                            <p className="text-sm text-muted-foreground">Add at least 2 members to add shared expenses.</p>
                          ) : (
                            <form onSubmit={handleSubmit(onSubmitExpense)} className="space-y-4">
                              <div>
                                <Label htmlFor="split-desc">Description</Label>
                                <Controller
                                  name="description"
                                  control={control}
                                  render={({ field }) => (
                                    <Textarea id="split-desc" {...field} placeholder="e.g., Dinner at restaurant" className="h-20" />
                                  )}
                                />
                                {formState.errors.description && (
                                  <p className="text-sm text-destructive mt-1">{formState.errors.description.message}</p>
                                )}
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                  <Label htmlFor="split-amount">Amount</Label>
                                  <Controller
                                    name="amount"
                                    control={control}
                                    render={({ field }) => <Input id="split-amount" type="number" step="0.01" {...field} placeholder="0.00" />}
                                  />
                                  {formState.errors.amount && (
                                    <p className="text-sm text-destructive mt-1">{formState.errors.amount.message}</p>
                                  )}
                                </div>
                                <div>
                                  <Label htmlFor="split-date">Date</Label>
                                  <Controller
                                    name="date"
                                    control={control}
                                    render={({ field }) => (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="outline"
                                            className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                                          >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                      </Popover>
                                    )}
                                  />
                                  {formState.errors.date && (
                                    <p className="text-sm text-destructive mt-1">{formState.errors.date.message}</p>
                                  )}
                                </div>
                              </div>

                              <div>
                                <Label htmlFor="paid-by">Paid by</Label>
                                <Controller
                                  name="paidByUid"
                                  control={control}
                                  render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                      <SelectTrigger id="paid-by">
                                        <SelectValue placeholder="Select payer" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {members.map((m) => (
                                          <SelectItem key={m.id} value={m.uid}>
                                            {m.displayName || m.email || "User"}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {formState.errors.paidByUid && (
                                  <p className="text-sm text-destructive mt-1">{formState.errors.paidByUid.message}</p>
                                )}
                              </div>

                              <div>
                                <Label>Split between</Label>
                                <Controller
                                  name="splitBetweenUids"
                                  control={control}
                                  render={({ field }) => (
                                    <div className="mt-2 space-y-2">
                                      {members.map((m) => {
                                        const checked = field.value.includes(m.uid);
                                        return (
                                          <label key={m.id} className="flex items-center gap-2 text-sm">
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(v) => {
                                                const isChecked = Boolean(v);
                                                if (isChecked) field.onChange([...field.value, m.uid]);
                                                else field.onChange(field.value.filter((id) => id !== m.uid));
                                              }}
                                            />
                                            <span>{m.displayName || m.email || "User"}</span>
                                          </label>
                                        );
                                      })}
                                    </div>
                                  )}
                                />
                                {formState.errors.splitBetweenUids && (
                                  <p className="text-sm text-destructive mt-1">{formState.errors.splitBetweenUids.message}</p>
                                )}
                                {splitBetweenUids.length > 0 && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    Each share:{" "}
                                    <span className="font-medium text-foreground">
                                      ₹
                                      {formState.isSubmitting
                                        ? "—"
                                        : (() => {
                                            const amount = Number(watch("amount") || 0);
                                            const n = splitBetweenUids.length || 1;
                                            return (amount / n).toFixed(2);
                                          })()}
                                    </span>
                                  </p>
                                )}
                              </div>

                              <Button type="submit" disabled={formState.isSubmitting}>
                                {formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Add Expense
                              </Button>
                            </form>
                          )}
                        </CardContent>
                      </TabsContent>

                      <TabsContent value="lend_borrow" className="mt-0">
                        <CardHeader className="pt-2">
                          <CardTitle className="text-base">Lend or Borrow</CardTitle>
                          <CardDescription>Direct transactions or repayments between two people.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          {members.length < 2 ? (
                            <p className="text-sm text-muted-foreground">Add at least 2 members to record transactions.</p>
                          ) : (
                            <form onSubmit={onSubmitLendBorrow} className="space-y-4">
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="lb-type">Transaction Type</Label>
                                  <Select value={lbType} onValueChange={(val: any) => setLbType(val)}>
                                    <SelectTrigger id="lb-type">
                                      <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="lend">I lent money to...</SelectItem>
                                      <SelectItem value="borrow">I borrowed money from...</SelectItem>
                                      <SelectItem value="repay_to">I repaid...</SelectItem>
                                      <SelectItem value="repay_from">I was repaid by...</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="lb-partner">With Whom</Label>
                                  <Select value={lbPartnerUid} onValueChange={setLbPartnerUid}>
                                    <SelectTrigger id="lb-partner">
                                      <SelectValue placeholder="Select member" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {members
                                        .filter((m) => m.uid !== user?.uid)
                                        .map((m) => (
                                          <SelectItem key={m.id} value={m.uid}>
                                            {m.displayName || m.email || "User"}
                                          </SelectItem>
                                        ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                  <Label htmlFor="lb-amount">Amount</Label>
                                  <Input
                                    id="lb-amount"
                                    type="number"
                                    step="0.01"
                                    value={lbAmount}
                                    onChange={(e) => setLbAmount(e.target.value)}
                                    placeholder="0.00"
                                    required
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="lb-date">Date</Label>
                                  <Popover>
                                    <PopoverTrigger asChild>
                                      <Button
                                        variant="outline"
                                        className="w-full justify-start text-left font-normal"
                                      >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {lbDate ? format(lbDate, "PPP") : <span>Pick a date</span>}
                                      </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0">
                                      <Calendar
                                        mode="single"
                                        selected={lbDate}
                                        onSelect={(val) => val && setLbDate(val)}
                                        initialFocus
                                      />
                                    </PopoverContent>
                                  </Popover>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="lb-desc">Description (Optional)</Label>
                                <Input
                                  id="lb-desc"
                                  value={lbDescription}
                                  onChange={(e) => setLbDescription(e.target.value)}
                                  placeholder="Leave blank for automatic description"
                                />
                              </div>

                              <Button type="submit" disabled={submittingLb} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
                                {submittingLb ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Transaction
                              </Button>
                            </form>
                          )}
                        </CardContent>
                      </TabsContent>
                    </Tabs>
                  </Card>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Settlement</CardTitle>
                      <CardDescription>Suggested payments to settle up.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {expenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No expenses yet.</p>
                      ) : settlement.length === 0 ? (
                        <p className="text-sm text-muted-foreground">All settled. Nobody owes anything.</p>
                      ) : (
                        <ul className="space-y-2">
                          {settlement.map((s, idx) => (
                            <li key={idx} className="rounded-md border p-3 text-sm">
                              <span className="font-medium">{memberNameById[s.fromMemberId] || "Someone"}</span> pays{" "}
                              <span className="font-medium">{memberNameById[s.toMemberId] || "Someone"}</span>{" "}
                              <span className="font-semibold">₹{s.amount.toFixed(2)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Expenses</CardTitle>
                      <CardDescription>Transactions recorded in this group.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {expenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No expenses yet.</p>
                      ) : visibleExpenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No transactions recorded in this period.</p>
                      ) : (
                        visibleExpenses.map((e) => {
                          const payer = memberNameById[e.paidByUid] || "Unknown";
                          const isPayerYou = e.paidByUid === user?.uid;
                          const recipients = e.splitBetweenUids || [];
                          const isRecipientYou = recipients.includes(user?.uid || "");
                          const recipientNames = recipients
                            .map((id) => memberNameById[id] || "Unknown")
                            .join(", ");

                          // Determine type and display info
                          let icon = <ReceiptIndianRupee className="h-4 w-4 text-primary" />;
                          let title = e.description;
                          let subtext = (
                            <>
                              Paid by <span className="font-semibold text-foreground">{payer}</span> • Split: <span className="font-medium text-foreground">{recipientNames || "—"}</span>
                            </>
                          );
                          let amountColor = "text-foreground";
                          let borderClass = "border-border bg-card";

                          if (e.type === "lend_borrow") {
                            const partnerUid = isPayerYou ? recipients[0] : e.paidByUid;
                            const partnerName = memberNameById[partnerUid] || "Someone";
                            
                            if (isPayerYou) {
                              icon = <ArrowUpRight className="h-4 w-4 text-emerald-500" />;
                              title = e.description || `Lent money to ${partnerName}`;
                              subtext = <>Direct loan to <span className="font-semibold text-foreground">{partnerName}</span></>;
                              amountColor = "text-emerald-600 font-bold";
                              borderClass = "border-emerald-500/20 bg-emerald-500/[0.02]";
                            } else {
                              icon = <ArrowDownLeft className="h-4 w-4 text-rose-500" />;
                              title = e.description || `Borrowed from ${partnerName}`;
                              subtext = <>Direct loan from <span className="font-semibold text-foreground">{partnerName}</span></>;
                              amountColor = "text-rose-600 font-bold";
                              borderClass = "border-rose-500/20 bg-rose-500/[0.02]";
                            }
                          } else if (e.type === "repayment") {
                            const partnerUid = isPayerYou ? recipients[0] : e.paidByUid;
                            const partnerName = memberNameById[partnerUid] || "Someone";
                            
                            icon = <Undo2 className="h-4 w-4 text-sky-500" />;
                            amountColor = "text-sky-600 font-bold";
                            borderClass = "border-sky-500/20 bg-sky-500/[0.02]";
                            
                            if (isPayerYou) {
                              title = e.description || `Repaid ${partnerName}`;
                              subtext = <>You repaid <span className="font-semibold text-foreground">{partnerName}</span></>;
                            } else {
                              title = e.description || `Received repayment from ${partnerName}`;
                              subtext = <><span className="font-semibold text-foreground">{partnerName}</span> repaid you</>;
                              amountColor = "text-emerald-600 font-bold";
                            }
                          }

                          return (
                            <div key={e.id} className={cn("rounded-md border p-3 flex items-start justify-between gap-3 shadow-sm transition-all hover:shadow", borderClass)}>
                              <div className="flex gap-2.5 items-start min-w-0">
                                <div className="p-1.5 rounded-full bg-background border mt-0.5">
                                  {icon}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-sm truncate text-foreground">{title}</p>
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    {format(new Date(e.date), "MMM dd, yyyy")} • {subtext}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <p className={cn("font-semibold text-sm", amountColor)}>₹{e.amount.toFixed(2)}</p>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="outline" aria-label="Delete transaction" className="h-7 w-7">
                                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="max-w-[380px] md:max-w-[500px] rounded-lg">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
                                      <AlertDialogDescription>This will remove the transaction from the group.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteSplitGroupExpense(selectedGroupId, e.id)}
                                        className="bg-destructive hover:bg-destructive/90"
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
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}


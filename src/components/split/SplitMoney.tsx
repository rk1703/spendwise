"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { Users, PlusCircle, Trash2, ReceiptIndianRupee, Loader2, Link as LinkIcon, Copy } from "lucide-react";

import { useAppContext } from "@/context/AppContext";
import { useAuth } from "@/context/AuthContext";
import type { SplitGroupExpense, SplitGroupMember } from "@/lib/types";
import { db } from "@/lib/firebase/config";
import { collection, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const addExpenseSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().positive("Amount must be positive"),
  date: z.date({ required_error: "Date is required" }),
  paidByUid: z.string().min(1, "Payer is required"),
  splitBetweenUids: z.array(z.string()).min(1, "Select at least one person"),
});

type AddExpenseFormData = z.infer<typeof addExpenseSchema>;

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

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

  const netByMemberId = useMemo(() => computeNetByMemberId(expenses), [expenses]);
  const settlement = useMemo(() => computeSettlement(netByMemberId), [netByMemberId]);

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
                            return (
                            <div key={m.id} className="flex items-center justify-between rounded-md border p-3">
                              <div>
                                <p className="font-medium">
                                  {label} {isYou ? <span className="text-xs text-muted-foreground">(You)</span> : null}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Net:{" "}
                                  <span className={cn((netByMemberId[uid] ?? 0) >= 0 ? "text-green-600" : "text-red-600")}>
                                    ₹{(netByMemberId[uid] ?? 0).toFixed(2)}
                                  </span>
                                </p>
                              </div>
                            </div>
                          )})}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-base">Add Expense</CardTitle>
                      <CardDescription>Record a shared expense and split it.</CardDescription>
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
                      <CardDescription>All shared expenses in this group.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {expenses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No expenses yet.</p>
                      ) : (
                        expenses.map((e) => {
                          const payer = memberNameById[e.paidByUid] || "Unknown";
                          const splitNames = (e.splitBetweenUids || [])
                            .map((id) => memberNameById[id] || "Unknown")
                            .join(", ");
                          return (
                            <div key={e.id} className="rounded-md border p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{e.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(new Date(e.date), "MMM dd, yyyy")} • Paid by <span className="font-medium">{payer}</span>
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Split: <span className="font-medium">{splitNames || "—"}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold">₹{e.amount.toFixed(2)}</p>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="icon" variant="outline" aria-label="Delete expense">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent className="max-w-[380px] md:max-w-[500px] rounded-lg">
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete expense?</AlertDialogTitle>
                                        <AlertDialogDescription>This will remove the expense from the group.</AlertDialogDescription>
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


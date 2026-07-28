"use client";

import React, { useState, useMemo } from "react";
import { useAppContext } from "@/context/AppContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, CalendarDays, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  parseISO
} from "date-fns";

export function FinancialCalendar() {
  const { transactions, categories } = useAppContext();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // State for clicked day details Dialog
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Navigate months
  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleGoToday = () => setCurrentMonth(new Date());

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = useMemo(() => {
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [startDate, endDate]);

  // Aggregate monthly totals and daily transactions
  const { dailyTotals, maxIncome, maxExpense, monthTotals } = useMemo(() => {
    const dailyData: Record<string, { income: number; expense: number; list: typeof transactions }> = {};
    let maxInc = 0;
    let maxExp = 0;
    let totalIncome = 0;
    let totalExpense = 0;

    // Filter transactions only for the active month's calendar view span
    transactions.forEach((tx) => {
      const txDate = parseISO(tx.date);
      const dayKey = format(txDate, "yyyy-MM-dd");

      // Aggregate only if it falls in the current calendar grid
      if (txDate >= startDate && txDate <= endDate) {
        if (!dailyData[dayKey]) {
          dailyData[dayKey] = { income: 0, expense: 0, list: [] };
        }

        dailyData[dayKey].list.push(tx);

        if (tx.type === "income") {
          dailyData[dayKey].income += tx.amount;
          if (isSameMonth(txDate, currentMonth)) {
            totalIncome += tx.amount;
          }
        } else {
          dailyData[dayKey].expense += tx.amount;
          if (isSameMonth(txDate, currentMonth)) {
            totalExpense += tx.amount;
          }
        }
      }
    });

    // Find monthly maximums to normalize color intensities
    Object.keys(dailyData).forEach((key) => {
      const date = parseISO(key);
      if (isSameMonth(date, currentMonth)) {
        const day = dailyData[key];
        const net = day.income - day.expense;
        if (net > 0) {
          if (net > maxInc) maxInc = net;
        } else {
          const absNet = Math.abs(net);
          if (absNet > maxExp) maxExp = absNet;
        }
      }
    });

    return {
      dailyTotals: dailyData,
      maxIncome: maxInc,
      maxExpense: maxExp,
      monthTotals: { income: totalIncome, expense: totalExpense }
    };
  }, [transactions, currentMonth, startDate, endDate]);

  const handleDayClick = (day: Date) => {
    // Only allow dialog for days in the current month
    if (!isSameMonth(day, currentMonth)) return;
    
    setSelectedDay(day);
    setIsDialogOpen(true);
  };

  // Get active day transactions for the Dialog
  const selectedDayTransactions = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return dailyTotals[key]?.list || [];
  }, [selectedDay, dailyTotals]);

  // Determine styling based on Income vs Expense intensity
  const getCellStyles = (day: Date) => {
    const isCurrentMonth = isSameMonth(day, currentMonth);
    if (!isCurrentMonth) {
      return "bg-muted/10 text-muted-foreground/20 border border-border/10 cursor-not-allowed min-h-[70px] md:min-h-[90px] p-1";
    }

    const key = format(day, "yyyy-MM-dd");
    const data = dailyTotals[key];

    if (!data || (data.income === 0 && data.expense === 0)) {
      return "bg-card hover:bg-muted/50 border border-border/50 text-foreground transition-all duration-200 cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
    }

    const net = data.income - data.expense;

    if (net > 0) {
      // Net Income -> Green Shading
      const ratio = maxIncome > 0 ? net / maxIncome : 0;
      if (ratio <= 0.25) {
        return "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      if (ratio <= 0.5) {
        return "bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-500/30 text-emerald-900 dark:text-emerald-200 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      if (ratio <= 0.75) {
        return "bg-emerald-500/45 hover:bg-emerald-500/55 border border-emerald-500/50 text-emerald-950 dark:text-emerald-100 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      return "bg-emerald-500/75 hover:bg-emerald-500/85 border border-emerald-600 text-white transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
    } else {
      // Net Expense -> Red Shading
      const ratio = maxExpense > 0 ? Math.abs(net) / maxExpense : 0;
      if (ratio <= 0.25) {
        return "bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-800 dark:text-rose-300 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      if (ratio <= 0.5) {
        return "bg-rose-500/25 hover:bg-rose-500/35 border border-rose-500/30 text-rose-900 dark:text-rose-200 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      if (ratio <= 0.75) {
        return "bg-rose-500/45 hover:bg-rose-500/55 border border-rose-500/50 text-rose-950 dark:text-rose-100 transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
      }
      return "bg-rose-500/75 hover:bg-rose-500/85 border border-rose-600 text-white transition-all cursor-pointer min-h-[70px] md:min-h-[90px] p-1";
    }
  };

  const getDayTextColor = (day: Date, type: "income" | "expense") => {
    const key = format(day, "yyyy-MM-dd");
    const data = dailyTotals[key];
    if (!data) return "";

    const net = data.income - data.expense;
    const isHighIntensity = net > 0 
      ? (maxIncome > 0 && net / maxIncome > 0.5) 
      : (maxExpense > 0 && Math.abs(net) / maxExpense > 0.5);

    if (isHighIntensity) {
      return "text-white/90";
    }

    return type === "income" 
      ? "text-emerald-600 dark:text-emerald-400" 
      : "text-rose-600 dark:text-rose-400";
  };

  const getCategoryDetails = (catId: string) => {
    return categories.find(c => c.id === catId) || { name: "Other", color: "#6b7280" };
  };

  return (
    <Card className="shadow-lg border-border/50">
      <CardHeader className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-center md:space-y-0 pb-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="text-primary w-5 h-5" />
            Financial Calendar
          </CardTitle>
          <CardDescription>
            Heatmap of monthly transactions. Emerald fields represent net income, rose fields represent net expenses.
          </CardDescription>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground mr-2">
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500/30" />
              <span>Net Income</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500/30" />
              <span>Net Expense</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 border border-border/50 rounded-md p-1 bg-muted/20">
            <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-semibold px-2 min-w-[100px] text-center font-heading">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={handleGoToday}>
            Today
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Month Summary Stats */}
        <div className="hidden md:grid grid-cols-3 gap-4 mb-6 p-4 rounded-lg bg-muted/30 border border-border/40">
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Month Income</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-heading">
              <TrendingUp className="w-4 h-4" />
              ₹{monthTotals.income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div>
            <span className="text-xs text-muted-foreground block mb-1">Month Expenses</span>
            <span className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1 font-heading">
              <TrendingDown className="w-4 h-4" />
              ₹{monthTotals.expense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="col-span-1 border-l border-border/50 pl-4">
            <span className="text-xs text-muted-foreground block mb-1">Month Balance</span>
            <span className={`text-lg font-bold flex items-center gap-1 font-heading ${
              monthTotals.income - monthTotals.expense >= 0 
                ? "text-emerald-600 dark:text-emerald-400" 
                : "text-rose-600 dark:text-rose-400"
            }`}>
              <ArrowRightLeft className="w-4 h-4" />
              ₹{(monthTotals.income - monthTotals.expense).toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Weekday headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="text-center text-xs font-semibold py-2 text-muted-foreground font-heading border-b border-border/20">
              {day}
            </div>
          ))}

          {/* Calendar cell items */}
          {days.map((day) => {
            const dateKey = format(day, "yyyy-MM-dd");
            const totals = dailyTotals[dateKey];
            const isToday = isSameDay(day, new Date());
            const hasIncome = totals && totals.income > 0;
            const hasExpense = totals && totals.expense > 0;

            return (
              <div
                key={day.toString()}
                onClick={() => handleDayClick(day)}
                className={`relative flex flex-col justify-between rounded border transition-all duration-300 ${getCellStyles(day)}`}
              >
                {/* Day number & Today indicator */}
                <div className="flex justify-between items-center w-full">
                  <span className={`text-xs font-bold p-0.5 min-w-[20px] text-center rounded-full font-heading ${
                    isToday 
                      ? "bg-primary text-primary-foreground font-bold" 
                      : ""
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>

                {/* Daily totals displays */}
                {isSameMonth(day, currentMonth) && totals && (
                  <div className="mt-2 space-y-0.5 text-right w-full pr-0.5">
                    {hasIncome && (
                      <div className={`text-[10px] md:text-xs font-semibold leading-tight ${getDayTextColor(day, "income")}`}>
                        +₹{totals.income.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </div>
                    )}
                    {hasExpense && (
                      <div className={`text-[10px] md:text-xs font-semibold leading-tight ${getDayTextColor(day, "expense")}`}>
                        -₹{totals.expense.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Transaction Details Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarDays className="text-primary w-5 h-5" />
              Transactions on {selectedDay ? format(selectedDay, "dd MMM yyyy") : ""}
            </DialogTitle>
            <DialogDescription>
              Detailed view of your earnings and spends for this day.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[300px] mt-4 pr-3">
            {selectedDayTransactions.length > 0 ? (
              <div className="space-y-3">
                {selectedDayTransactions.map((tx) => {
                  const catDetails = getCategoryDetails(tx.categoryId);
                  return (
                    <div 
                      key={tx.id} 
                      className="flex justify-between items-center p-3 bg-muted/40 rounded-lg border border-border/40 hover:bg-muted/60 transition-colors"
                    >
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-semibold">{tx.description}</span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="inline-block w-2.5 h-2.5 rounded-full" 
                            style={{ backgroundColor: catDetails.color }}
                          />
                          <span className="text-xs text-muted-foreground">{catDetails.name}</span>
                        </div>
                      </div>
                      <Badge className={`text-sm font-bold shadow-sm ${
                        tx.type === "income" 
                          ? "bg-emerald-100 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200" 
                          : "bg-rose-100 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200"
                      }`} variant="outline">
                        {tx.type === "income" ? "+" : "-"} ₹{tx.amount.toLocaleString("en-IN")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No transactions recorded on this day.
              </div>
            )}
          </ScrollArea>
          
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

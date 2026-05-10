"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Loader2, RefreshCcw } from "lucide-react";
import { summarizeSpending } from "@/ai/flows/summarize-spending";
import { useAppContext } from "@/context/AppContext";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function AIInsightCard() {
  const { transactions, loadingTransactions } = useAppContext();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateSummary = async () => {
    if (transactions.length === 0) return;
    setLoading(true);
    try {
      const spendingData = transactions
        .filter((t) => t.type === "expense")
        .map((t) => ({ amount: t.amount, category: t.categoryId, description: t.description }));
      
      const result = await summarizeSpending({ 
        spendingData: JSON.stringify(spendingData) 
      });
      setSummary(result.summary);
    } catch (error) {
      console.error("Error generating AI summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // Removed auto-triggering useEffect to save quota on free tier.
  // Users must now click the refresh button or a "Generate" button to get insights.

  return (
    <Card className="glass-card relative overflow-hidden border-primary/20 bg-primary/5">
      <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
        <Sparkles className="h-12 w-12 text-primary" />
      </div>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          AI Spending Insights
        </CardTitle>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-6 w-6" 
          onClick={generateSummary}
          disabled={loading || loadingTransactions || transactions.length === 0}
        >
          <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </CardHeader>
      <CardContent>
        <AnimatePresence mode="wait">
          {loading || loadingTransactions ? (
            <motion.div 
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-muted-foreground py-2"
            >
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">Analyzing your spending patterns...</span>
            </motion.div>
          ) : summary ? (
            <motion.p 
              key="summary"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm leading-relaxed text-foreground"
            >
              {summary}
            </motion.p>
          ) : transactions.length > 0 ? (
            <motion.div
              key="initial"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-3 py-4"
            >
              <p className="text-sm text-muted-foreground text-center">
                Discover patterns in your spending with AI.
              </p>
              <Button 
                onClick={generateSummary} 
                size="sm" 
                variant="outline"
                className="gap-2 border-primary/50 hover:bg-primary/10"
              >
                <Sparkles className="h-3 w-3" />
                Generate Insights
              </Button>
            </motion.div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Add some transactions to get AI insights.
            </p>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}

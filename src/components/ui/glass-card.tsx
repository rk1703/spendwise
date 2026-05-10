"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface GlassCardProps extends React.ComponentProps<typeof Card> {
  children: React.ReactNode;
  animate?: boolean;
  delay?: number;
  gradient?: boolean;
}

export function GlassCard({ 
  children, 
  className, 
  animate = true, 
  delay = 0, 
  gradient = false,
  ...props 
}: GlassCardProps) {
  const CardComponent = (
    <Card 
      className={cn("glass-card relative overflow-hidden", className)} 
      {...props}
    >
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
      )}
      {children}
    </Card>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
      >
        {CardComponent}
      </motion.div>
    );
  }

  return CardComponent;
}

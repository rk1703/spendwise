"use client";

import React from "react";
import { useTheme } from "next-themes";
import { useColorTheme, ColorTheme } from "@/context/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Palette, Moon, Sun, Monitor } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const { colorTheme, setColorTheme } = useColorTheme();

  const colorThemes: { name: string; value: ColorTheme; bgClass: string }[] = [
    { name: "Default", value: "default", bgClass: "bg-slate-900 dark:bg-slate-50" },
    { name: "Rose", value: "theme-rose", bgClass: "bg-rose-500" },
    { name: "Blue", value: "theme-blue", bgClass: "bg-blue-500" },
    { name: "Green", value: "theme-green", bgClass: "bg-green-600" },
    { name: "Orange", value: "theme-orange", bgClass: "bg-orange-500" },
    { name: "Pink", value: "theme-pink", bgClass: "bg-pink-500" },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="text-primary w-5 h-5" />
          Theme & Appearance
        </CardTitle>
        <CardDescription>Customize the look and feel of SpendWise.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Light / Dark Mode Toggle */}
        <div>
          <h3 className="text-sm font-medium mb-3">Mode</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setTheme("light")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
                theme === "light"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              } transition-colors`}
            >
              <Sun className="w-4 h-4" />
              <span className="text-sm font-medium">Light</span>
            </button>
            <button
              onClick={() => setTheme("dark")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
                theme === "dark"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              } transition-colors`}
            >
              <Moon className="w-4 h-4" />
              <span className="text-sm font-medium">Dark</span>
            </button>
            <button
              onClick={() => setTheme("system")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border ${
                theme === "system"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              } transition-colors`}
            >
              <Monitor className="w-4 h-4" />
              <span className="text-sm font-medium">System</span>
            </button>
          </div>
        </div>

        {/* Color Theme Selector */}
        <div>
          <h3 className="text-sm font-medium mb-3">Color</h3>
          <div className="flex flex-wrap gap-3">
            {colorThemes.map((ct) => (
              <button
                key={ct.value}
                onClick={() => setColorTheme(ct.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-md border ${
                  colorTheme === ct.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                } transition-colors`}
              >
                <div className={`w-4 h-4 rounded-full ${ct.bgClass}`} />
                <span className="text-sm font-medium">{ct.name}</span>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

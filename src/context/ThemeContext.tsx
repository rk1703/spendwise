"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type ColorTheme = "default" | "theme-rose" | "theme-blue" | "theme-green" | "theme-orange" | "theme-pink";

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeContextProvider({ children }: { children: React.ReactNode }) {
  const [colorTheme, setColorThemeState] = useState<ColorTheme>("default");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("spendwise-color-theme") as ColorTheme;
    if (savedTheme) {
      setColorThemeState(savedTheme);
    }
  }, []);

  const setColorTheme = (theme: ColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem("spendwise-color-theme", theme);
  };

  useEffect(() => {
    if (!mounted) return;
    
    const body = document.body;
    // Remove all existing theme classes
    body.classList.remove("theme-rose", "theme-blue", "theme-green", "theme-orange", "theme-pink");
    
    // Add the new theme class if it's not default
    if (colorTheme !== "default") {
      body.classList.add(colorTheme);
    }
  }, [colorTheme, mounted]);

  return (
    <ThemeContext.Provider value={{ colorTheme, setColorTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useColorTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useColorTheme must be used within a ThemeContextProvider");
  }
  return context;
}

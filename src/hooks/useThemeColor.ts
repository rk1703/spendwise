import { useEffect } from "react";
import { useTheme } from "next-themes";

export function useThemeColor() {
  const { theme, resolvedTheme } = useTheme();

  useEffect(() => {
    const meta = document.querySelector("meta[name=theme-color]");
    if (!meta) return;

    const currentTheme = theme === "system" ? resolvedTheme : theme;

    if (currentTheme === "dark") {
      meta.setAttribute("content", "#000000"); // dark mode status bar
    } else {
      meta.setAttribute("content", "#ffffff"); // light mode status bar
    }
  }, [theme, resolvedTheme]);
}

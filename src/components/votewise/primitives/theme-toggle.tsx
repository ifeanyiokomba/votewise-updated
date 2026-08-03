"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { Moon, Sun, Monitor, Contrast, Type, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // next-themes mounted guard — avoids hydration mismatch on the icon
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const toggleAccessibility = (cls: string) => {
    if (typeof document === "undefined") return;
    const html = document.documentElement;
    html.classList.toggle(cls);
  };

  if (!mounted) {
    return <div className="size-9 rounded-md bg-muted/40" />;
  }

  const isDark = theme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Toggle theme">
          {isDark ? <Moon className="size-4" /> : <Sun className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Appearance</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="size-4" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="size-4" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="size-4" /> System
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Accessibility</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => toggleAccessibility("high-contrast")}>
          <Contrast className="size-4" /> High contrast
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleAccessibility("large-text")}>
          <Type className="size-4" /> Large text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => toggleAccessibility("reduce-motion")}>
          <Minus className="size-4" /> Reduced motion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

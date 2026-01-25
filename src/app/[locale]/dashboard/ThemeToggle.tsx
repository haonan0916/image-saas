"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocale } from "@/hooks/useLocale";

export function ThemeToggle() {
  const { dict } = useLocale();
const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  const [ready, setReady] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReady(true);
  }, []);

  return (
    <Button
      onClick={() => {
        setTheme(isDark ? "light" : "dark");
      }}
    >
      {ready ? isDark ? <Sun /> : <Moon /> : <Sun />}
    </Button>
  );
}

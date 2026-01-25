"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { useLocale } from "@/hooks/useLocale";

type Props = Parameters<typeof NextThemeProvider>[0];

export function ThemeProvider(props: Props) {
  const { dict } = useLocale();
return <NextThemeProvider {...props}></NextThemeProvider>;
}

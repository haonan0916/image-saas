"use client";

import { ThemeProvider as NextThemeProvider } from "next-themes";
import { ReactNode } from "react";

interface ThemeProviderProps {
    children: ReactNode;
    attribute?: string;
    defaultTheme?: string;
    enableSystem?: boolean;
    disableTransitionOnChange?: boolean;
}

export function ThemeProvider({
    children,
    attribute = "data-theme",
    defaultTheme = "system",
    enableSystem = true,
    disableTransitionOnChange = true,
    ...props
}: ThemeProviderProps) {
    return (
        <NextThemeProvider
            attribute={attribute}
            defaultTheme={defaultTheme}
            enableSystem={enableSystem}
            disableTransitionOnChange={disableTransitionOnChange}
            {...props}
        >
            {children}
        </NextThemeProvider>
    );
}
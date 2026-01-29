"use client";

import { ReactNode } from "react";
import { useLocale } from "@/hooks/useLocale";
import { LocalizedLink } from "@/components/ui/localized-link";
import { Button } from "@/components/ui/button";
import { ChevronRight, Book, Code, Zap, Settings, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";

interface DocsLayoutProps {
  children: ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const { dict, locale } = useLocale();

  const navigation = [
    {
      title: dict.docs.quickStart.title,
      href: "/docs#quickstart",
      icon: Zap,
    },
    {
      title: dict.docs.installation.title,
      href: "/docs#installation",
      icon: Settings,
    },
    {
      title: dict.docs.authentication.title,
      href: "/docs#authentication",
      icon: Settings,
    },
    {
      title: dict.docs.usage.title,
      href: "/docs#usage",
      icon: Code,
    },
    {
      title: "Framework Integration",
      href: "/docs#examples",
      icon: Code,
    },
    {
      title: dict.docs.api.title,
      href: "/docs#api",
      icon: Book,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <LocalizedLink href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="font-bold text-lg">{dict.dashboard.title}</span>
            </LocalizedLink>
            
            <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
              <LocalizedLink
                href="/docs"
                className="transition-colors hover:text-foreground/80 text-foreground"
              >
                {dict.docs.title}
              </LocalizedLink>
            </nav>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <LanguageSwitcher currentLocale={locale} />
              <Button asChild variant="outline" size="sm">
                <LocalizedLink href="/dashboard">
                  {dict.navigation.dashboard}
                </LocalizedLink>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex gap-8 py-8">
          {/* Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 space-y-2">
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <LocalizedLink
                    key={item.href}
                    href={item.href}
                    className="group flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    <item.icon className="mr-3 h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                    <ChevronRight className="ml-auto h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </LocalizedLink>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0">
            <div className="max-w-4xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
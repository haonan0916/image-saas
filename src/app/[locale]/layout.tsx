import type { Metadata } from "next";
import { TrpcProvider } from "../TrpcProvider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalChatButtonI18n } from "@/components/layout/GlobalChatButtonI18n";
import { getDictionary } from "@/lib/dictionaries";
import { Locale } from "@/dictionaries";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { HtmlLangProvider } from "@/components/layout/HtmlLangProvider";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const dict = await getDictionary(locale);

  return {
    title: dict.dashboard.title,
    description: dict.dashboard.description,
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;

  return (
    <>
      <HtmlLangProvider />
      <Toaster />
      <TrpcProvider>
        <div className="fixed top-4 right-4 z-50">
          <LanguageSwitcher currentLocale={locale} />
        </div>
        {children}
        <GlobalChatButtonI18n />
      </TrpcProvider>
    </>
  );
}

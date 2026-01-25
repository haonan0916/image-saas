"use client";

import { useParams } from "next/navigation";
import { Locale } from "@/dictionaries";
import { getDictionarySync } from "@/lib/dictionaries";

export function useLocale() {
  const params = useParams();
  const locale = params.locale as Locale;
  
  return {
    locale,
    dict: getDictionarySync(locale),
  };
}
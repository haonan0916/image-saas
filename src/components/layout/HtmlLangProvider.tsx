"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import { Locale } from "@/dictionaries";

export function HtmlLangProvider() {
  const params = useParams();
  const locale = params.locale as Locale;

  useEffect(() => {
    if (locale && typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
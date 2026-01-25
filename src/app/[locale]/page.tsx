import { redirect } from "next/navigation";
import { Locale } from "@/dictionaries";

export default async function LocaleHome({
  params,
}: {
  params: Promise<{ locale: Locale }>;
}) {
  const { locale } = await params;
  redirect(`/${locale}/dashboard`);
}
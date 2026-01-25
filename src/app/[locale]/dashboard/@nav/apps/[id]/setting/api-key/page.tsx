"use client";
import { use } from "react";
import { BreadCrumb } from "../breadcrumb";
import { useLocale } from "@/hooks/useLocale";

export default function AppDashboardNav({ params, }: {
  params: Promise<{ id: string }>;
}) {
  const { dict } = useLocale();
  const { id } = use(params);
  return (
    <div className="flex justify-between items-center">
      <BreadCrumb id={id} leaf="API Key"></BreadCrumb>
    </div>
  );
}

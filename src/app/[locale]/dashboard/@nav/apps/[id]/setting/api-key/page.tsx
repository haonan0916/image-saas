"use client";
import { use } from "react";
import { BreadCrumb } from "../breadcrumb";
import { useLocale } from "@/hooks/useLocale";

export default function AppDashboardNav({ params, }: {
  params: Promise<{ id: string }>;
}) {
  // 先调用所有 hooks
  const { dict } = useLocale();

  // 然后使用 use() 解析 Promise
  const { id } = use(params);

  return (
    <div className="flex justify-between items-center">
      <BreadCrumb id={id} leaf="API Key"></BreadCrumb>
    </div>
  );
}

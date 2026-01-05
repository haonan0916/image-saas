"use client";
import { use } from "react";
import { BreadCrumb } from "../breadcrumb";

export default function AppDashboardNav({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <div className="flex justify-between items-center">
      <BreadCrumb id={id} leaf="Storage"></BreadCrumb>
    </div>
  );
}

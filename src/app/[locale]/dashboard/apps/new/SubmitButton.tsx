"use client";
import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";
import { useLocale } from "@/hooks/useLocale";

export function SubmitButton() {
  const status = useFormStatus();
  const { dict } = useLocale();

  return (
    <Button type="submit" disabled={status.pending}>
      {dict.common.submit}
    </Button>
  );
}

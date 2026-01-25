"use client";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/hooks/useLocale";

export default function CreateAppError({ error,
  reset, }: {

  error: Error;
  reset: () => void;

}) {
  const { dict } = useLocale();
  return (
    <div>
      <div className="w-64 p-8 mx-auto flex justify-center items-center flex-col">
        <span>Save failed</span>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}

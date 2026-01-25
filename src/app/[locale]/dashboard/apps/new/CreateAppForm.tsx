"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { trpcClientReact } from "@/utils/api";
import { useLocale } from "@/hooks/useLocale";
import { toast } from "sonner";
import { Locale } from "@/dictionaries";

export function CreateAppForm() {
  const { dict } = useLocale();
  const router = useRouter();
  const params = useParams();
  const locale = params.locale as Locale;
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  
  const createAppMutation = trpcClientReact.app.createApp.useMutation({
    onSuccess: (newApp) => {
      toast.success(dict.common.success);
      router.push(`/${locale}/dashboard/apps/${newApp.id}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error(dict.common.error);
      return;
    }
    
    createAppMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <div className="h-full flex justify-center items-center">
      <form className="w-full max-w-md flex flex-col gap-4" onSubmit={handleSubmit}>
        <h1 className="text-center text-2xl font-bold">{dict.dashboard.createApp}</h1>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={dict.dashboard.appName}
          minLength={3}
          required
        />
        <Textarea 
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={dict.dashboard.appDescription}
        />
        <Button 
          type="submit" 
          disabled={createAppMutation.isPending}
        >
          {createAppMutation.isPending ? dict.common.loading : dict.common.submit}
        </Button>
      </form>
    </div>
  );
}
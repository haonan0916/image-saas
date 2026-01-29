"use client";

import { useLocale } from "@/hooks/useLocale";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function InstallationSection() {
  const { dict } = useLocale();

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {dict.docs.installation.title}
        </h2>
        <p className="text-muted-foreground">
          {dict.docs.installation.subtitle}
        </p>
      </div>

      <Tabs defaultValue="npm" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="npm">npm</TabsTrigger>
          <TabsTrigger value="yarn">yarn</TabsTrigger>
          <TabsTrigger value="pnpm">pnpm</TabsTrigger>
        </TabsList>
        
        <TabsContent value="npm" className="space-y-4">
          <CodeBlock
            code={dict.docs.installation.npm}
            language="bash"
            filename="Terminal"
          />
        </TabsContent>
        
        <TabsContent value="yarn" className="space-y-4">
          <CodeBlock
            code={dict.docs.installation.yarn}
            language="bash"
            filename="Terminal"
          />
        </TabsContent>
        
        <TabsContent value="pnpm" className="space-y-4">
          <CodeBlock
            code={dict.docs.installation.pnpm}
            language="bash"
            filename="Terminal"
          />
        </TabsContent>
      </Tabs>

      <div className="rounded-lg border bg-muted/50 p-4">
        <h4 className="font-medium mb-2">Package Overview</h4>
        <ul className="space-y-2 text-sm text-muted-foreground">
          <li><code className="bg-muted px-1.5 py-0.5 rounded">@image-saas/api</code> - API client for making requests</li>
          <li><code className="bg-muted px-1.5 py-0.5 rounded">@image-saas/uploader</code> - File upload utilities</li>
          <li><code className="bg-muted px-1.5 py-0.5 rounded">@image-saas/upload-button</code> - Pre-built upload components</li>
        </ul>
      </div>
    </section>
  );
}
"use client";

import { useLocale } from "@/hooks/useLocale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, Settings, Upload } from "lucide-react";

export function QuickStartSection() {
  const { dict } = useLocale();

  const steps = [
    {
      icon: Download,
      title: dict.docs.quickStart.step1.title,
      description: dict.docs.quickStart.step1.description,
      badge: "1",
    },
    {
      icon: Settings,
      title: dict.docs.quickStart.step2.title,
      description: dict.docs.quickStart.step2.description,
      badge: "2",
    },
    {
      icon: Upload,
      title: dict.docs.quickStart.step3.title,
      description: dict.docs.quickStart.step3.description,
      badge: "3",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          {dict.docs.title}
        </h1>
        <p className="text-xl text-muted-foreground">
          {dict.docs.subtitle}
        </p>
      </div>

      <div className="space-y-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {dict.docs.quickStart.title}
        </h2>
        <p className="text-muted-foreground">
          {dict.docs.quickStart.subtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {steps.map((step, index) => (
          <Card key={index} className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="h-5 w-5 text-primary" />
                </div>
                <Badge variant="secondary" className="absolute -top-2 -right-2">
                  {step.badge}
                </Badge>
              </div>
              <CardTitle className="text-lg">{step.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
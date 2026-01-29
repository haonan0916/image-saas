"use client";

import { useLocale } from "@/hooks/useLocale";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Star } from "lucide-react";
import { LocalizedLink } from "@/components/ui/localized-link";

export function PricingSection() {
  const { dict } = useLocale();

  const plans = [
    {
      name: dict.home.pricing.free.title,
      price: dict.home.pricing.free.price,
      period: dict.home.pricing.free.period,
      features: dict.home.pricing.free.features,
      popular: false,
      cta: dict.home.hero.getStarted,
      href: "/dashboard",
    },
    {
      name: dict.home.pricing.pro.title,
      price: dict.home.pricing.pro.price,
      period: dict.home.pricing.pro.period,
      features: dict.home.pricing.pro.features,
      popular: true,
      cta: dict.home.cta.button,
      href: "/dashboard",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-muted/20">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/3 right-1/3 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        {/* 标题部分 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {dict.home.pricing.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.home.pricing.subtitle}
          </p>
        </motion.div>

        {/* 价格卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <Card className={`h-full ${
                plan.popular 
                  ? 'border-primary shadow-lg shadow-primary/10 scale-105' 
                  : 'border-border'
              } hover:shadow-xl transition-all duration-300`}>
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-bold mb-2">
                    {plan.name}
                  </CardTitle>
                  <div className="flex items-baseline justify-center gap-1">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <motion.li
                        key={featureIndex}
                        initial={{ opacity: 0, x: -10 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: featureIndex * 0.1 }}
                        viewport={{ once: true }}
                        className="flex items-center gap-3"
                      >
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Check className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                  
                  <Button 
                    asChild 
                    className={`w-full ${
                      plan.popular 
                        ? 'bg-primary hover:bg-primary/90' 
                        : 'variant-outline'
                    }`}
                    variant={plan.popular ? 'default' : 'outline'}
                  >
                    <LocalizedLink href={plan.href}>
                      {plan.cta}
                    </LocalizedLink>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 底部说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            All plans include API access, documentation, and email support.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Enterprise plans available with custom pricing and SLA.
          </p>
        </motion.div>
      </div>
    </section>
  );
}
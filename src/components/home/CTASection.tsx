"use client";

import { useLocale } from "@/hooks/useLocale";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { LocalizedLink } from "@/components/ui/localized-link";

export function CTASection() {
  const { dict } = useLocale();

  return (
    <section className="py-24 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-blue-500/5">
        <motion.div
          className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        <motion.div
          className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1.2, 1, 1.2],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="container relative z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center max-w-4xl mx-auto"
        >
          {/* 装饰图标 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-8"
          >
            <Sparkles className="w-8 h-8 text-primary" />
          </motion.div>

          {/* 标题 */}
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            viewport={{ once: true }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6"
          >
            {dict.home.cta.title}
          </motion.h2>

          {/* 副标题 */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            viewport={{ once: true }}
            className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto"
          >
            {dict.home.cta.subtitle}
          </motion.p>

          {/* 按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            viewport={{ once: true }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <Button asChild size="lg" className="group text-lg px-8 py-6">
              <LocalizedLink href="/dashboard">
                {dict.home.cta.button}
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </LocalizedLink>
            </Button>
            
            <Button variant="ghost" size="lg" className="text-lg px-8 py-6">
              <LocalizedLink href="/docs">
                View Documentation
              </LocalizedLink>
            </Button>
          </motion.div>

          {/* 信任指标 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            viewport={{ once: true }}
            className="mt-16 pt-8 border-t border-border/50"
          >
            <p className="text-sm text-muted-foreground mb-6">
              Trusted by developers worldwide
            </p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              {/* 这里可以添加客户logo或者信任标识 */}
              <div className="text-2xl font-bold text-muted-foreground">500+</div>
              <div className="text-sm text-muted-foreground">Active Developers</div>
              <div className="w-px h-8 bg-border" />
              <div className="text-2xl font-bold text-muted-foreground">10K+</div>
              <div className="text-sm text-muted-foreground">Images Processed</div>
              <div className="w-px h-8 bg-border" />
              <div className="text-2xl font-bold text-muted-foreground">99.9%</div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
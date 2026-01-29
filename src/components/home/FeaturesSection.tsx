"use client";

import { useLocale } from "@/hooks/useLocale";
import { motion } from "framer-motion";
import { 
  Cloud, 
  Brain, 
  Code, 
  Shield, 
  Zap, 
  TrendingUp,
  LucideIcon
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

function FeatureCard({ icon: Icon, title, description, index }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
      viewport={{ once: true }}
      className="group"
    >
      <Card className="h-full border-0 bg-card/50 backdrop-blur-sm hover:bg-card/80 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5">
        <CardContent className="p-6">
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            transition={{ type: "spring", stiffness: 300 }}
            className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors"
          >
            <Icon className="w-6 h-6 text-primary" />
          </motion.div>
          
          <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
            {title}
          </h3>
          
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function FeaturesSection() {
  const { dict } = useLocale();

  const features = [
    {
      icon: Cloud,
      title: dict.home.features.multiCloud.title,
      description: dict.home.features.multiCloud.description,
    },
    {
      icon: Brain,
      title: dict.home.features.aiProcessing.title,
      description: dict.home.features.aiProcessing.description,
    },
    {
      icon: Code,
      title: dict.home.features.apiFirst.title,
      description: dict.home.features.apiFirst.description,
    },
    {
      icon: Shield,
      title: dict.home.features.dataOwnership.title,
      description: dict.home.features.dataOwnership.description,
    },
    {
      icon: Zap,
      title: dict.home.features.realtime.title,
      description: dict.home.features.realtime.description,
    },
    {
      icon: TrendingUp,
      title: dict.home.features.scalable.title,
      description: dict.home.features.scalable.description,
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/20" />
      <motion.div
        className="absolute top-1/2 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
        animate={{
          x: [-100, 100, -100],
          y: [-50, 50, -50],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

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
            {dict.home.features.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.home.features.subtitle}
          </p>
        </motion.div>

        {/* 功能网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.title}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              index={index}
            />
          ))}
        </div>

        {/* 底部装饰线 */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
          viewport={{ once: true }}
          className="w-24 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full mx-auto mt-16"
        />
      </div>
    </section>
  );
}
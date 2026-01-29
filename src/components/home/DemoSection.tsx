"use client";

import { useLocale } from "@/hooks/useLocale";
import { motion } from "framer-motion";
import { ImageCompare } from "@/components/ui/image-compare";
import { Card, CardContent } from "@/components/ui/card";

export function DemoSection() {
  const { dict } = useLocale();

  // 示例图片 - 你可以替换为实际的去雾前后对比图
  const demoImages = [
    {
      before: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&crop=center&auto=format&q=80", // 雾霾风景图
      after: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop&crop=center&auto=format&q=80&sat=2&con=1.2", // 清晰风景图
      title: "Landscape Dehazing",
    },
    {
      before: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&crop=center&auto=format&q=60&blur=2",
      after: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop&crop=center&auto=format&q=80", 
      title: "Urban Scene Enhancement",
    },
    {
      before: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop&crop=center&auto=format&q=60&blur=1",
      after: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&h=600&fit=crop&crop=center&auto=format&q=80",
      title: "Portrait Clarity",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-muted/30">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute top-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 12,
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
            {dict.home.demo.title}
          </h2>
          <p className="text-lg text-muted-foreground mb-2">
            {dict.home.demo.subtitle}
          </p>
          <p className="text-sm text-muted-foreground/80">
            {dict.home.demo.beforeAfter}
          </p>
        </motion.div>

        {/* 主要演示 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto mb-16"
        >
          <Card className="overflow-hidden border-0 shadow-2xl">
            <CardContent className="p-0">
              <div className="aspect-video">
                <ImageCompare
                  beforeImage={demoImages[0].before}
                  afterImage={demoImages[0].after}
                  className="rounded-lg"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 更多示例 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {demoImages.slice(1).map((demo, index) => (
            <motion.div
              key={demo.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
            >
              <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
                <CardContent className="p-0">
                  <div className="aspect-video">
                    <ImageCompare
                      beforeImage={demo.before}
                      afterImage={demo.after}
                      className="rounded-lg"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-center">{demo.title}</h3>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* 技术指标 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mt-16 pt-8 border-t border-border/50"
        >
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">98%</div>
            <div className="text-sm text-muted-foreground">Clarity Improvement</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">&lt;3s</div>
            <div className="text-sm text-muted-foreground">Processing Time</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">4K</div>
            <div className="text-sm text-muted-foreground">Max Resolution</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary mb-1">24/7</div>
            <div className="text-sm text-muted-foreground">Availability</div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
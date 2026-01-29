"use client";

import { useLocale } from "@/hooks/useLocale";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Download, Settings, Upload } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function IntegrationSection() {
  const { dict } = useLocale();
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const codeExamples = {
    install: {
      npm: "npm install @image-saas/api @image-saas/uploader",
      yarn: "yarn add @image-saas/api @image-saas/uploader",
      pnpm: "pnpm add @image-saas/api @image-saas/uploader",
    },
    configure: `import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';

const apiClient = createApiClient({
  apiKey: 'your-api-key',
  // or use signed token for server-side
  signedToken: 'your-signed-token'
});

const uploader = createUploader(async (file) => {
  return apiClient.file.createPresignedUrl.mutate({
    filename: file.name,
    contentType: file.type,
    size: file.size
  });
});`,
    upload: `// Upload and process image
uploader.on('upload-success', (file, response) => {
  console.log('Upload successful:', response.uploadURL);
  
  // Trigger dehazing process
  apiClient.task.createDehazeTask.mutate({
    fileId: response.fileId,
    modelId: 'default-dehaze-model'
  }).then(task => {
    console.log('Dehazing task created:', task.id);
  });
});

// Add file to uploader
uploader.addFile({
  data: selectedFile,
  name: selectedFile.name
});

// Start upload
uploader.upload();`,
  };

  const steps = [
    {
      icon: Download,
      title: dict.home.integration.steps.install,
      description: "Install our SDK using your preferred package manager",
    },
    {
      icon: Settings,
      title: dict.home.integration.steps.configure,
      description: "Configure API client with your credentials",
    },
    {
      icon: Upload,
      title: dict.home.integration.steps.upload,
      description: "Upload images and trigger processing tasks",
    },
  ];

  return (
    <section className="py-24 relative overflow-hidden">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-b from-background to-muted/10" />
      <motion.div
        className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{
          duration: 15,
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
            {dict.home.integration.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.home.integration.subtitle}
          </p>
        </motion.div>

        {/* 步骤指南 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
              >
                <step.icon className="w-8 h-8 text-primary" />
              </motion.div>
              <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
              <p className="text-muted-foreground text-sm">{step.description}</p>
              <div className="w-8 h-1 bg-primary/20 rounded-full mx-auto mt-4" />
            </motion.div>
          ))}
        </div>

        {/* 代码示例 */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto"
        >
          <Card className="overflow-hidden border-0 shadow-xl bg-card/50 backdrop-blur-sm">
            <CardContent className="p-0">
              <Tabs defaultValue="install" className="w-full">
                <div className="border-b border-border/50 px-6 py-4">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="install" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Install
                    </TabsTrigger>
                    <TabsTrigger value="configure" className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configure
                    </TabsTrigger>
                    <TabsTrigger value="upload" className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Upload
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="install" className="p-6 space-y-4">
                  <div className="space-y-3">
                    {Object.entries(codeExamples.install).map(([manager, command]) => (
                      <div key={manager} className="relative">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="secondary" className="text-xs">
                            {manager.toUpperCase()}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(command, `install-${manager}`)}
                            className="h-8 w-8 p-0"
                          >
                            {copiedCode === `install-${manager}` ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="bg-muted/50 rounded-lg p-3 text-sm overflow-x-auto">
                          <code>{command}</code>
                        </pre>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="configure" className="p-6">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">TypeScript</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(codeExamples.configure, 'configure')}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === 'configure' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto">
                      <code className="language-typescript">{codeExamples.configure}</code>
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="upload" className="p-6">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant="secondary">JavaScript</Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(codeExamples.upload, 'upload')}
                        className="h-8 w-8 p-0"
                      >
                        {copiedCode === 'upload' ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <pre className="bg-muted/50 rounded-lg p-4 text-sm overflow-x-auto">
                      <code className="language-javascript">{codeExamples.upload}</code>
                    </pre>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        {/* 支持的框架 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          viewport={{ once: true }}
          className="text-center mt-16"
        >
          <p className="text-muted-foreground mb-6">Supports popular frameworks</p>
          <div className="flex flex-wrap justify-center gap-4">
            {['React', 'Vue', 'Angular', 'Svelte', 'Next.js', 'Nuxt'].map((framework) => (
              <Badge key={framework} variant="outline" className="px-4 py-2">
                {framework}
              </Badge>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
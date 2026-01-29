"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import { useLocale } from "@/hooks/useLocale";
import { CodeBlock } from "@/components/ui/code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Settings, Upload, Key, Shield } from "lucide-react";

export default function DocsPage() {
  return (
    <DocsLayout>
      <DocsContent />
    </DocsLayout>
  );
}

function DocsContent() {
  const { dict } = useLocale();

  const installationExamples = {
    npm: dict.docs.installation.npm,
    yarn: dict.docs.installation.yarn,
    pnpm: dict.docs.installation.pnpm,
  };

  const basicExample = `import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';

// Initialize API client
const apiClient = createApiClient({
  apiKey: 'your-api-key-here'
});

// Create uploader with presigned URL generation
const uploader = createUploader(async (file) => {
  return apiClient.file.createPresignedUrl.mutate({
    filename: file.name,
    contentType: file.type,
    size: file.size
  });
});

// Handle upload success
uploader.on('upload-success', (file, response) => {
  console.log('File uploaded:', response.uploadURL);
});

// Add file and start upload
uploader.addFile({
  data: selectedFile,
  name: selectedFile.name
});

uploader.upload();`;

  const authApiKeyExample = `import { createApiClient } from '@image-saas/api';

const apiClient = createApiClient({
  apiKey: 'your-api-key-here'
});

// Use the client
const result = await apiClient.file.createPresignedUrl.mutate({
  filename: 'example.jpg',
  contentType: 'image/jpeg',
  size: 1024000
});`;

  const authTokenExample = `import { createApiClient } from '@image-saas/api';

// Server-side: Generate signed token
const signedToken = jwt.sign(
  { userId: 'user-123', appId: 'app-456' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// Client-side: Use signed token
const apiClient = createApiClient({
  signedToken: signedToken
});`;

  const reactExample = `import React, { useState } from 'react';
import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';

function ImageUploader() {
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState('');

  const apiClient = createApiClient({
    apiKey: process.env.NEXT_PUBLIC_API_KEY
  });

  const uploader = createUploader(async (file) => {
    return apiClient.file.createPresignedUrl.mutate({
      filename: file.name,
      contentType: file.type,
      size: file.size
    });
  });

  uploader.on('upload-success', (file, response) => {
    setUploadedUrl(response.uploadURL);
    setUploading(false);
  });

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploading(true);
      uploader.addFile({ data: file, name: file.name });
      uploader.upload();
    }
  };

  return (
    <div>
      <input
        type="file"
        onChange={handleFileSelect}
        accept="image/*"
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {uploadedUrl && (
        <img src={uploadedUrl} alt="Uploaded" style={{ maxWidth: '300px' }} />
      )}
    </div>
  );
}

export default ImageUploader;`;

  const vueExample = `<template>
  <div>
    <input
      type="file"
      @change="handleFileSelect"
      accept="image/*"
      :disabled="uploading"
    />
    <p v-if="uploading">Uploading...</p>
    <img
      v-if="uploadedUrl"
      :src="uploadedUrl"
      alt="Uploaded"
      style="max-width: 300px"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';

const uploading = ref(false);
const uploadedUrl = ref('');

const apiClient = createApiClient({
  apiKey: import.meta.env.VITE_API_KEY
});

const uploader = createUploader(async (file) => {
  return apiClient.file.createPresignedUrl.mutate({
    filename: file.name,
    contentType: file.type,
    size: file.size
  });
});

uploader.on('upload-success', (file, response) => {
  uploadedUrl.value = response.uploadURL;
  uploading.value = false;
});

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    uploading.value = true;
    uploader.addFile({ data: file, name: file.name });
    uploader.upload();
  }
};
</script>`;

  return (
    <div className="space-y-16">
      {/* Header */}
      <section className="space-y-6">
        <div className="space-y-3">
          <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
            {dict.docs.title}
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl">
            {dict.docs.subtitle}
          </p>
        </div>
      </section>

      {/* Quick Start */}
      <section id="quickstart" className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            {dict.docs.quickStart.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.docs.quickStart.subtitle}
          </p>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Download className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  1
                </Badge>
              </div>
              <CardTitle className="text-xl">{dict.docs.quickStart.step1.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {dict.docs.quickStart.step1.description}
              </p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Settings className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  2
                </Badge>
              </div>
              <CardTitle className="text-xl">{dict.docs.quickStart.step2.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {dict.docs.quickStart.step2.description}
              </p>
            </CardContent>
          </Card>

          <Card className="relative">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <Badge variant="secondary" className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center">
                  3
                </Badge>
              </div>
              <CardTitle className="text-xl">{dict.docs.quickStart.step3.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {dict.docs.quickStart.step3.description}
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Installation */}
      <section id="installation" className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            {dict.docs.installation.title}
          </h2>
          <p className="text-lg text-muted-foreground">
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
              code={installationExamples.npm}
              language="bash"
              filename="Terminal"
            />
          </TabsContent>
          
          <TabsContent value="yarn" className="space-y-4">
            <CodeBlock
              code={installationExamples.yarn}
              language="bash"
              filename="Terminal"
            />
          </TabsContent>
          
          <TabsContent value="pnpm" className="space-y-4">
            <CodeBlock
              code={installationExamples.pnpm}
              language="bash"
              filename="Terminal"
            />
          </TabsContent>
        </Tabs>

        <div className="rounded-lg border bg-muted/50 p-6">
          <h4 className="font-semibold mb-4">Package Overview</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">@image-saas/api</code>
              <p className="text-sm text-muted-foreground">API client for making requests</p>
            </div>
            <div className="space-y-2">
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">@image-saas/uploader</code>
              <p className="text-sm text-muted-foreground">File upload utilities</p>
            </div>
            <div className="space-y-2">
              <code className="bg-muted px-2 py-1 rounded text-sm font-mono">@image-saas/upload-button</code>
              <p className="text-sm text-muted-foreground">Pre-built upload components</p>
            </div>
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section id="authentication" className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            {dict.docs.authentication.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.docs.authentication.subtitle}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10">
                  <Key className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl">
                  {dict.docs.authentication.apiKey.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {dict.docs.authentication.apiKey.description}
              </p>
              <div className="space-y-2">
                <h5 className="font-medium">Best for:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Client-side applications</li>
                  <li>• Simple integrations</li>
                  <li>• Development and testing</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
                  <Shield className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-xl">
                  {dict.docs.authentication.signedToken.title}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                {dict.docs.authentication.signedToken.description}
              </p>
              <div className="space-y-2">
                <h5 className="font-medium">Best for:</h5>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Server-side applications</li>
                  <li>• Enhanced security</li>
                  <li>• Production environments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">API Key Authentication</h3>
            <CodeBlock
              code={authApiKeyExample}
              language="typescript"
              filename="client.ts"
            />
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Signed Token Authentication</h3>
            <CodeBlock
              code={authTokenExample}
              language="typescript"
              filename="auth.ts"
            />
          </div>
        </div>

        <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-6">
          <h4 className="font-semibold mb-3 text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
            🔒 Security Best Practices
          </h4>
          <ul className="space-y-2 text-sm text-yellow-700 dark:text-yellow-300">
            <li>• Never expose API keys in client-side code</li>
            <li>• Use signed tokens for production applications</li>
            <li>• Rotate API keys regularly</li>
            <li>• Set appropriate token expiration times</li>
          </ul>
        </div>
      </section>

      {/* Basic Usage */}
      <section id="usage" className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            {dict.docs.usage.title}
          </h2>
          <p className="text-lg text-muted-foreground">
            {dict.docs.usage.subtitle}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">{dict.docs.usage.basicUpload.title}</CardTitle>
            <p className="text-muted-foreground">
              {dict.docs.usage.basicUpload.description}
            </p>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={basicExample}
              language="typescript"
              filename="upload.ts"
            />
          </CardContent>
        </Card>
      </section>

      {/* Framework Integration */}
      <section id="examples" className="space-y-8">
        <div className="space-y-4">
          <h2 className="scroll-m-20 text-3xl font-semibold tracking-tight">
            Framework Integration
          </h2>
          <p className="text-lg text-muted-foreground">
            Cross-framework integration examples
          </p>
        </div>
        
        <Tabs defaultValue="react" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="react">React</TabsTrigger>
            <TabsTrigger value="vue">Vue</TabsTrigger>
          </TabsList>
          
          <TabsContent value="react" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{dict.docs.usage.reactIntegration.title}</CardTitle>
                <p className="text-muted-foreground">
                  {dict.docs.usage.reactIntegration.description}
                </p>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  code={reactExample}
                  language="tsx"
                  filename="ImageUploader.tsx"
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="vue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{dict.docs.usage.vueIntegration.title}</CardTitle>
                <p className="text-muted-foreground">
                  {dict.docs.usage.vueIntegration.description}
                </p>
              </CardHeader>
              <CardContent>
                <CodeBlock
                  code={vueExample}
                  language="vue"
                  filename="ImageUploader.vue"
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>

      {/* Pro Tips */}
      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-6">
        <h4 className="font-semibold mb-3 text-blue-800 dark:text-blue-200 flex items-center gap-2">
          💡 Pro Tips
        </h4>
        <ul className="space-y-2 text-sm text-blue-700 dark:text-blue-300">
          <li>• Use error handling for upload failures</li>
          <li>• Implement progress tracking for better UX</li>
          <li>• Consider file size limits and validation</li>
          <li>• Cache API clients for better performance</li>
        </ul>
      </div>
    </div>
  );
}
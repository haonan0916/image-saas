"use client";

import { useLocale } from "@/hooks/useLocale";
import { CodeBlock } from "@/components/ui/code-block";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UsageSection() {
  const { dict } = useLocale();

  const basicUploadExample = `import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';

// Initialize API client
const apiClient = createApiClient({
  apiKey: 'your-api-key'
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

  const dehazeTaskExample = `import { createApiClient } from '@image-saas/api';

const apiClient = createApiClient({
  signedToken: 'your-signed-token'
});

// Create a dehazing task
const task = await apiClient.task.createDehazeTask.mutate({
  fileId: 'uploaded-file-id',
  modelId: 'default-dehaze-model',
  settings: {
    strength: 0.8,
    preserveColors: true
  }
});

console.log('Task created:', task.id);

// Check task status
const status = await apiClient.task.getTaskStatus.query({
  taskId: task.id
});

console.log('Task status:', status.status);`;

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

  const vueComponentExample = `<template>
  <div>
    <VueUploadButton
      :uploader="uploader"
      @file-uploaded="onFileUploaded"
    >
      Click to Upload
    </VueUploadButton>
    <img v-if="uploadedUrl" :src="uploadedUrl" alt="Uploaded" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { createApiClient } from '@image-saas/api';
import { createUploader } from '@image-saas/uploader';
import { UploaderButtonWithUploader } from '@image-saas/upload-button';
import { connect } from '@image-saas/preact-vue-connect';

// Create Vue-compatible upload button
const VueUploadButton = connect(UploaderButtonWithUploader);

const uploadedUrl = ref('');

const apiClient = createApiClient({
  signedToken: 'your-signed-token'
});

const uploader = createUploader(async (file) => {
  return apiClient.file.createPresignedUrl.mutate({
    filename: file.name,
    contentType: file.type,
    size: file.size
  });
});

const onFileUploaded = (url: string) => {
  uploadedUrl.value = url;
};
</script>`;

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {dict.docs.usage.title}
        </h2>
        <p className="text-muted-foreground">
          {dict.docs.usage.subtitle}
        </p>
      </div>

      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>{dict.docs.usage.basicUpload.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dict.docs.usage.basicUpload.description}
            </p>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={basicUploadExample}
              language="typescript"
              filename="upload.ts"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{dict.docs.usage.dehazeTask.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {dict.docs.usage.dehazeTask.description}
            </p>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={dehazeTaskExample}
              language="typescript"
              filename="dehaze.ts"
            />
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-xl font-semibold">Framework Integration</h3>
          
          <Tabs defaultValue="react" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="react">React</TabsTrigger>
              <TabsTrigger value="vue">Vue</TabsTrigger>
              <TabsTrigger value="vue-component">Vue + Components</TabsTrigger>
            </TabsList>
            
            <TabsContent value="react" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{dict.docs.usage.reactIntegration.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
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
                  <CardTitle>{dict.docs.usage.vueIntegration.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
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

            <TabsContent value="vue-component" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Vue + Pre-built Components</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Using our cross-framework upload components in Vue
                  </p>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    code={vueComponentExample}
                    language="vue"
                    filename="UploadComponent.vue"
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <div className="rounded-lg border bg-blue-50 dark:bg-blue-950/20 p-4">
        <h4 className="font-medium mb-2 text-blue-800 dark:text-blue-200">
          💡 Pro Tips
        </h4>
        <ul className="space-y-1 text-sm text-blue-700 dark:text-blue-300">
          <li>• Use error handling for upload failures</li>
          <li>• Implement progress tracking for better UX</li>
          <li>• Consider file size limits and validation</li>
          <li>• Cache API clients for better performance</li>
        </ul>
      </div>
    </section>
  );
}
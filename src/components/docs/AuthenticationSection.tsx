"use client";

import { useLocale } from "@/hooks/useLocale";
import { CodeBlock } from "@/components/ui/code-block";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Shield } from "lucide-react";

export function AuthenticationSection() {
  const { dict } = useLocale();

  const apiKeyExample = `import { createApiClient } from '@image-saas/api';

const apiClient = createApiClient({
  apiKey: 'your-api-key-here'
});

// Use the client
const result = await apiClient.file.createPresignedUrl.mutate({
  filename: 'example.jpg',
  contentType: 'image/jpeg',
  size: 1024000
});`;

  const signedTokenExample = `import { createApiClient } from '@image-saas/api';

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

  const serverExample = `// Next.js API Route example
import jwt from 'jsonwebtoken';

export async function POST(request: Request) {
  const { userId, appId } = await request.json();
  
  const signedToken = jwt.sign(
    { userId, appId },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );
  
  return Response.json({ signedToken });
}`;

  return (
    <section className="space-y-6">
      <div className="space-y-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          {dict.docs.authentication.title}
        </h2>
        <p className="text-muted-foreground">
          {dict.docs.authentication.subtitle}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <Key className="h-5 w-5 text-blue-500" />
              </div>
              <CardTitle className="text-lg">
                {dict.docs.authentication.apiKey.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dict.docs.authentication.apiKey.description}
            </p>
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Best for:</h5>
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
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <Shield className="h-5 w-5 text-green-500" />
              </div>
              <CardTitle className="text-lg">
                {dict.docs.authentication.signedToken.title}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {dict.docs.authentication.signedToken.description}
            </p>
            <div className="space-y-2">
              <h5 className="font-medium text-sm">Best for:</h5>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Server-side applications</li>
                <li>• Enhanced security</li>
                <li>• Production environments</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-semibold">API Key Authentication</h3>
        <CodeBlock
          code={apiKeyExample}
          language="typescript"
          filename="client.ts"
        />

        <h3 className="text-xl font-semibold">Signed Token Authentication</h3>
        <CodeBlock
          code={signedTokenExample}
          language="typescript"
          filename="auth.ts"
        />

        <h4 className="text-lg font-medium">Server-side Token Generation</h4>
        <CodeBlock
          code={serverExample}
          language="typescript"
          filename="app/api/auth/token/route.ts"
        />
      </div>

      <div className="rounded-lg border bg-yellow-50 dark:bg-yellow-950/20 p-4">
        <h4 className="font-medium mb-2 text-yellow-800 dark:text-yellow-200">
          🔒 Security Best Practices
        </h4>
        <ul className="space-y-1 text-sm text-yellow-700 dark:text-yellow-300">
          <li>• Never expose API keys in client-side code</li>
          <li>• Use signed tokens for production applications</li>
          <li>• Rotate API keys regularly</li>
          <li>• Set appropriate token expiration times</li>
        </ul>
      </div>
    </section>
  );
}
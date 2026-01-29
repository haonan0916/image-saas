"use client";

import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { useMounted } from '@/hooks/useMounted';

interface CodeBlockProps {
  code: string;
  language: string;
  filename?: string;
  showLineNumbers?: boolean;
  className?: string;
}

export function CodeBlock({
  code,
  language,
  filename,
  showLineNumbers = true,
  className = "",
}: CodeBlockProps) {
  const { theme } = useTheme();
  const mounted = useMounted();
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  if (!mounted) {
    return (
      <div className={`relative rounded-lg bg-muted ${className}`}>
        {filename && (
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-medium text-muted-foreground">
              {filename}
            </span>
          </div>
        )}
        <pre className="p-4 overflow-x-auto">
          <code className="text-sm">{code}</code>
        </pre>
      </div>
    );
  }

  return (
    <div className={`relative rounded-lg overflow-hidden border border-border ${className}`}>
      {filename && (
        <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
          <span className="text-sm font-medium text-muted-foreground">
            {filename}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-8 w-8 p-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        </div>
      )}
      
      <div className="relative group">
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : oneLight}
          showLineNumbers={showLineNumbers}
          customStyle={{
            margin: 0,
            padding: '1rem',
            background: 'transparent',
            fontSize: '0.875rem',
          }}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: theme === 'dark' ? '#6b7280' : '#9ca3af',
            userSelect: 'none',
          }}
        >
          {code}
        </SyntaxHighlighter>
        
        {!filename && (
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="absolute top-2 right-2 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
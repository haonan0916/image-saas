import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TrpcProvider } from "./TrpcProvider";
import { Toaster } from "@/components/ui/sonner";
import { GlobalChatButton } from "@/components/layout/GlobalChatButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Image SaaS",
  description: "Image processing SaaS application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Toaster />
        <TrpcProvider>
          {children}
          <GlobalChatButton />
        </TrpcProvider>
      </body>
    </html>
  );
}

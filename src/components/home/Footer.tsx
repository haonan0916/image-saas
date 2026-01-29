"use client";

import { useLocale } from "@/hooks/useLocale";
import { Sparkles, Github, Twitter, Mail } from "lucide-react";
import { LocalizedLink } from "@/components/ui/localized-link";

export function Footer() {
  const { dict } = useLocale();

  const footerSections = [
    {
      title: "Product",
      links: [
        { name: "Features", href: "#features" },
        { name: "Pricing", href: "#pricing" },
        { name: "API", href: "/docs/api" },
        { name: "Changelog", href: "/changelog" },
      ],
    },
    {
      title: "Resources",
      links: [
        { name: "Documentation", href: "/docs" },
        { name: "Guides", href: "/guides" },
        { name: "Examples", href: "/examples" },
        { name: "Status", href: "/status" },
      ],
    },
    {
      title: "Company",
      links: [
        { name: "About", href: "/about" },
        { name: "Blog", href: "/blog" },
        { name: "Careers", href: "/careers" },
        { name: "Contact", href: "/contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { name: "Privacy", href: "/privacy" },
        { name: "Terms", href: "/terms" },
        { name: "Security", href: "/security" },
        { name: "Cookies", href: "/cookies" },
      ],
    },
  ];

  return (
    <footer className="bg-muted/30 border-t border-border/50">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand section */}
          <div className="lg:col-span-2">
            <LocalizedLink href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xl font-bold">
                {dict.dashboard.title}
              </span>
            </LocalizedLink>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              {dict.dashboard.description}
            </p>
            <div className="flex items-center gap-4">
              <LocalizedLink
                href="https://github.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-5 h-5" />
              </LocalizedLink>
              <LocalizedLink
                href="https://twitter.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </LocalizedLink>
              <LocalizedLink
                href="mailto:contact@example.com"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="w-5 h-5" />
              </LocalizedLink>
            </div>
          </div>

          {/* Links sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h3 className="font-semibold mb-4">{section.title}</h3>
              <ul className="space-y-3">
                {section.links.map((link) => (
                  <li key={link.name}>
                    <LocalizedLink
                      href={link.href}
                      className="text-muted-foreground hover:text-foreground transition-colors text-sm"
                    >
                      {link.name}
                    </LocalizedLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom section */}
        <div className="border-t border-border/50 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © 2024 {dict.dashboard.title}. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <LocalizedLink
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Privacy Policy
            </LocalizedLink>
            <LocalizedLink
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              Terms of Service
            </LocalizedLink>
          </div>
        </div>
      </div>
    </footer>
  );
}
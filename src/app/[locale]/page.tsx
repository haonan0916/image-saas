import { Navbar } from "@/components/home/Navbar";
import { Footer } from "@/components/home/Footer";
import { HeroSection } from "@/components/home/HeroSection";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { DemoSection } from "@/components/home/DemoSection";
import { IntegrationSection } from "@/components/home/IntegrationSection";
import { PricingSection } from "@/components/home/PricingSection";
import { CTASection } from "@/components/home/CTASection";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen">
        <HeroSection />
        <div id="features">
          <FeaturesSection />
        </div>
        <div id="demo">
          <DemoSection />
        </div>
        <div id="integration">
          <IntegrationSection />
        </div>
        <div id="pricing">
          <PricingSection />
        </div>
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import { Hero } from "@/components/hero/Hero";
import { HomeAuditSection, HomeBuildsSection, HomeProblemSection } from "@/components/sections/HomeLeadGenerationSections";
import InteractiveByDesign  from "@/components/sections/InteractiveByDesign";
import { BusinessConsoleSection } from "@/components/sections/BusinessConsoleSection";
import { CapabilityMatrix } from "@/components/sections/CapabilityMatrix";
import WorkPreview from "@/components/sections/WorkPreview";
import { WhoWeWorkWith } from "@/components/sections/WhoWeWorkWith";
import { FitCTA } from "@/components/sections/FitCTA";
import FitSectionClient from "@/components/sections/FitSectionClient";
import  WorkingTogether from "@/components/sections/WorkingTogether";
import { DifferentiationSection } from "@/components/sections/DifferentiationSection";
import  Footer  from "@/components/sections/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEL3 Interactive | Custom Business Platforms, Portals, Dashboards & AI Workflows",
  description:
    "CEL3 Interactive builds custom websites, client portals, business consoles, dashboards, booking systems, payment workflows, and AI-assisted operations tools for businesses that have outgrown disconnected software.",
};


export default function Page() {
  return (
    <MotionProvider>
      <main className="min-h-screen bg-black text-white">
        <NavBar />
        <Hero />
        <HomeProblemSection />
        <HomeBuildsSection />
        <InteractiveByDesign />
        <BusinessConsoleSection />
        <HomeAuditSection />
        <CapabilityMatrix />
        <DifferentiationSection />
        <FitCTA />
        <WhoWeWorkWith />
        <WorkPreview />
        <WorkingTogether />
        <FitSectionClient />
        <Footer />
      </main>
    </MotionProvider>
  );
}

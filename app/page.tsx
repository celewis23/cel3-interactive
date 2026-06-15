import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import { Hero } from "@/components/hero/Hero";
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
  title: "CEL3 Interactive | Custom Business Platforms & Operations Systems",
  description:
    "CEL3 Interactive builds custom websites, business consoles, ecommerce systems, booking platforms, client portals, and AI-enhanced operations tools.",
};


export default function Page() {
  return (
    <MotionProvider>
      <main className="min-h-screen bg-black text-white">
        <NavBar />
        <Hero />
        <InteractiveByDesign />
        <BusinessConsoleSection />
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

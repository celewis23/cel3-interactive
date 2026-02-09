import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import { Hero } from "@/components/hero/Hero";
import InteractiveByDesign  from "@/components/sections/InteractiveByDesign";
import { CapabilityMatrix } from "@/components/sections/CapabilityMatrix";
import WorkPreview from "@/components/sections/WorkPreview";
import { WhoWeWorkWith } from "@/components/sections/WhoWeWorkWith";
import { FitCTA } from "@/components/sections/FitCTA";
import FitSectionClient from "@/components/sections/FitSectionClient";
import { FitFlow } from "@/components/sections/FitFlow";
import  WorkingTogether from "@/components/sections/WorkingTogether";
import  Footer  from "@/components/sections/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEL3 Interactive | Custom Web Applications, CRMs & Interactive Platforms",
  description:
    "CEL3 Interactive designs and builds custom web applications, CRMs, dashboards, and interactive digital experiences for teams ready to invest in forward-thinking technology.",
};


export default function Page() {
  return (
    <MotionProvider>
      <main className="min-h-screen bg-black text-white">
        <NavBar />
        <Hero />
        <InteractiveByDesign />
        <CapabilityMatrix />
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


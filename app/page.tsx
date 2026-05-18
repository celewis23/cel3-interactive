import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import { Hero } from "@/components/hero/Hero";
import InteractiveByDesign  from "@/components/sections/InteractiveByDesign";
import { CapabilityMatrix } from "@/components/sections/CapabilityMatrix";
import WorkPreview from "@/components/sections/WorkPreview";
import { WhoWeWorkWith } from "@/components/sections/WhoWeWorkWith";
import { FitCTA } from "@/components/sections/FitCTA";
import FitSectionClient from "@/components/sections/FitSectionClient";
import  WorkingTogether from "@/components/sections/WorkingTogether";
import  Footer  from "@/components/sections/Footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "CEL3 Interactive | Practical Web, CRM & IT Solutions",
  description:
    "CEL3 Interactive helps businesses improve websites, workflows, CRMs, dashboards, and digital operations with practical technology solutions.",
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

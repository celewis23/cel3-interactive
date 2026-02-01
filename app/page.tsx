import { MotionProvider } from "@/components/motion/MotionProvider";
import { NavBar } from "@/components/nav/NavBar";
import { Hero } from "@/components/hero/Hero";
import InteractiveByDesign  from "@/components/sections/InteractiveByDesign";
import { CapabilityMatrix } from "@/components/sections/CapabilityMatrix";
import WorkPreview from "@/components/sections/WorkPreview";
import { WhoWeWorkWith } from "@/components/sections/WhoWeWorkWith";
import { FitCTA } from "@/components/sections/FitCTA";
import { FitFlow } from "@/components/sections/FitFlow";
import { Footer } from "@/components/sections/Footer";

export default function Page() {
  return (
    <MotionProvider>
      <main className="min-h-screen bg-black text-white">
        <NavBar />
        <Hero />
        <InteractiveByDesign />
        <CapabilityMatrix />
        <WorkPreview />
        <WhoWeWorkWith />
        <FitCTA />
        <FitFlow />
        <Footer />
      </main>
    </MotionProvider>
  );
}
console.log("Sanity Project:", process.env.NEXT_PUBLIC_SANITY_PROJECT_ID);

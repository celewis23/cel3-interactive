import { PageStructuredData } from "@/components/seo/StructuredData";
import { publicPageMetadata } from "@/lib/seo/site";
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

export const metadata = publicPageMetadata("/");


export default function Page() {
  return (
    <main className="min-h-screen bg-black text-white">
      <PageStructuredData path="/" />
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
    </main>
  );
}

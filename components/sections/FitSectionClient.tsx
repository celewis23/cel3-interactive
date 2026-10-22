"use client";

import dynamic from "next/dynamic";

const FitSection = dynamic(() => import("./FitSection"), {
  ssr: true,
});

export default function FitSectionClient() {
  return <FitSection />;
}

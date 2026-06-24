import type { PlatformBuilderFeature, PlatformRecommendation } from "./types";

type PackageRule = {
  setup: string;
  monthly: string;
  timeline: string;
  value: number;
};

const PACKAGE_RULES: Record<string, PackageRule> = {
  "Foundation Website": {
    setup: "$499 - $1,500",
    monthly: "$49/month",
    timeline: "2 - 4 weeks",
    value: 1500,
  },
  "Business Website": {
    setup: "$1,500 - $4,000",
    monthly: "$99/month",
    timeline: "3 - 6 weeks",
    value: 4000,
  },
  "Business Platform": {
    setup: "$2,500 - $7,500",
    monthly: "$149/month",
    timeline: "5 - 9 weeks",
    value: 7500,
  },
  "Business Platform Pro": {
    setup: "$5,000 - $12,000",
    monthly: "$249/month",
    timeline: "7 - 12 weeks",
    value: 12000,
  },
  "Ecommerce Business System": {
    setup: "$5,000 - $15,000",
    monthly: "$299/month",
    timeline: "8 - 14 weeks",
    value: 15000,
  },
  "Business Operating System": {
    setup: "$10,000 - $50,000+",
    monthly: "$399 - $999+/month",
    timeline: "10 - 20+ weeks",
    value: 50000,
  },
  "Native Mobile App": {
    setup: "$7,500 - $50,000+",
    monthly: "$49 - $199/month maintenance",
    timeline: "12 - 24+ weeks",
    value: 50000,
  },
};

export function recommendPlatformPackage(features: PlatformBuilderFeature[]): PlatformRecommendation {
  const ids = new Set(features.map((feature) => feature.id));
  const tags = new Set(features.flatMap((feature) => feature.tags));
  const sectionCounts = features.reduce<Record<string, number>>((acc, feature) => {
    acc[feature.section] = (acc[feature.section] ?? 0) + 1;
    return acc;
  }, {});

  let packageName = "Foundation Website";
  if (features.length >= 3 || ids.has("multi-page-website") || ids.has("blog-resource-center")) {
    packageName = "Business Website";
  }
  if ((sectionCounts["business-tools"] ?? 0) >= 2 || tags.has("portal") || tags.has("platform")) {
    packageName = "Business Platform";
  }
  if ((sectionCounts["communication-tools"] ?? 0) >= 3 || (sectionCounts["ai-tools"] ?? 0) >= 2 || tags.has("automation") || tags.has("team")) {
    packageName = "Business Platform Pro";
  }
  if ((sectionCounts.ecommerce ?? 0) >= 2 || ids.has("online-store") || ids.has("subscriptions") || ids.has("memberships")) {
    packageName = "Ecommerce Business System";
  }
  if ((sectionCounts["custom-software"] ?? 0) >= 2 || tags.has("custom") || tags.has("saas") || tags.has("operating-system")) {
    packageName = "Business Operating System";
  }
  if (tags.has("native")) {
    packageName = "Native Mobile App";
  }

  const rule = PACKAGE_RULES[packageName];
  const customConsultationRequired =
    features.some((feature) => feature.requiresCustomReview) ||
    packageName === "Business Operating System" ||
    packageName === "Native Mobile App";

  const aiUsageRecommendation = getAiUsageRecommendation(features);
  const priorityScore = getPriorityScore(features, packageName, customConsultationRequired);

  return {
    packageName,
    setupInvestmentRange: rule.setup,
    monthlyInvestmentRange: rule.monthly,
    timelineEstimate: rule.timeline,
    aiUsageRecommendation,
    customConsultationRequired,
    priorityScore,
    estimatedValue: rule.value,
  };
}

function getAiUsageRecommendation(features: PlatformBuilderFeature[]) {
  const aiCount = features.filter((feature) => feature.tags.includes("ai")).length;
  const hasByok = features.some((feature) => feature.tags.includes("byok"));
  if (hasByok) {
    return "Client-owned AI provider account recommended for higher usage and direct usage control.";
  }
  if (aiCount >= 5) {
    return "Enterprise AI setup recommended after discovery, with CEL3-managed tools or client-owned provider keys.";
  }
  if (aiCount >= 3) {
    return "Pro AI usage recommended for content, email, support, and lead workflows.";
  }
  if (aiCount >= 1) {
    return "Starter or Growth AI usage recommended, depending on expected monthly activity.";
  }
  return "AI can be added later. No AI usage package is required for the selected platform.";
}

function getPriorityScore(features: PlatformBuilderFeature[], packageName: string, customConsultationRequired: boolean) {
  const base = Math.min(features.length * 5, 45);
  const packageBoost = packageName === "Foundation Website" ? 10 : packageName === "Business Website" ? 20 : packageName === "Business Platform" ? 35 : 45;
  const customBoost = customConsultationRequired ? 10 : 0;
  const aiBoost = features.some((feature) => feature.tags.includes("ai")) ? 5 : 0;
  return Math.min(base + packageBoost + customBoost + aiBoost, 100);
}

export type PlatformBuilderSectionId =
  | "business-goal"
  | "website-foundation"
  | "business-tools"
  | "communication-tools"
  | "ai-tools"
  | "ecommerce"
  | "mobile-experience"
  | "custom-software";

export type PlatformBuilderFeature = {
  id: string;
  section: PlatformBuilderSectionId;
  title: string;
  description: string;
  benefit: string;
  icon: string;
  estimatedImpact: string;
  recommendedFor?: string;
  tags: string[];
  requiresCustomReview?: boolean;
  dependencies?: string[];
};

export type PlatformBuilderSection = {
  id: PlatformBuilderSectionId;
  title: string;
  eyebrow: string;
  description: string;
  features: PlatformBuilderFeature[];
};

export type PlatformContactInput = {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
  budgetComfortRange: string;
  desiredTimeline: string;
  projectNotes: string;
  website?: string;
  businessType?: string;
  preferredContactMethod?: string;
};

export type PlatformRecommendation = {
  packageName: string;
  setupInvestmentRange: string;
  monthlyInvestmentRange: string;
  timelineEstimate: string;
  aiUsageRecommendation: string;
  customConsultationRequired: boolean;
  priorityScore: number;
  estimatedValue: number;
};

export type PlatformBuilderSubmission = {
  selectedFeatureIds: string[];
  contact: PlatformContactInput;
};

export type PlatformBuilderResult = {
  leadId: string;
  proposalId: string;
  recommendedPackage: string;
  setupInvestmentRange: string;
  monthlyInvestmentRange: string;
  timelineEstimate: string;
  aiUsageRecommendation: string;
  customConsultationRequired: boolean;
  featureCount: number;
  proposalDownloadUrl: string;
  emailStatus: "sent" | "partial" | "failed";
};

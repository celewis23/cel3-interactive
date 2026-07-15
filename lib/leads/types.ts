export type LeadCandidateStatus =
  | "review"
  | "approved"
  | "rejected"
  | "sent"
  | "contacted"
  | "followed-up"
  | "meeting"
  | "closed"
  | "lost";

export type LeadGeneratorFrequency = "daily" | "weekly" | "monthly";

export type LeadGeneratorSettings = {
  _id: string;
  _type: "leadGeneratorSettings";
  enabled: boolean;
  frequency: LeadGeneratorFrequency;
  dayOfWeek: number;
  dayOfMonth: number;
  time: string;
  timezone: string;
  maxPerRun: number;
  searchLocations: string[];
  searchCategories: string[];
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunMessage: string | null;
};

export type LeadCandidate = {
  _id: string;
  _type: "leadCandidate";
  _createdAt?: string;
  businessName: string;
  niche: string;
  city: string;
  region: "Richmond" | "Tidewater" | "Hampton Roads" | "Virginia";
  address: string | null;
  phone: string | null;
  email: string | null;
  /** All public emails discovered for the business; email is the primary, the rest get CC'd. */
  emails: string[] | null;
  contactUrl: string | null;
  website: string | null;
  sourceUrl: string;
  status: LeadCandidateStatus;
  openStatus: "open" | "verify";
  fitScore: number;
  leadSource: string;
  currentSnapshot: string;
  gapAssessment: string;
  howCel3CanHelp: string;
  emailSubject: string;
  emailBodyHtml: string;
  notes: string | null;
  reviewedAt: string | null;
  approvedPipelineContactId: string | null;
  emailedAt: string | null;
};

export type LeadCandidateInput = Omit<LeadCandidate, "_id" | "_type" | "_createdAt"> & {
  _id?: string;
};

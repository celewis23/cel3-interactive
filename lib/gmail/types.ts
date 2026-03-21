export type GmailMessageHeader = {
  from: string;
  to: string;
  cc: string;
  subject: string;
  date: string;
  messageId: string;
  inReplyTo: string;
  references: string;
};

export type GmailMessageParsed = {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  internalDate: number; // unix ms
  headers: GmailMessageHeader;
  bodyText: string;
  bodyHtml: string | null;
  isRead: boolean;
};

export type GmailThreadSummary = {
  id: string;
  snippet: string;
  historyId: string;
  messageCount: number;
  subject: string;
  from: string;
  date: number; // unix ms
  isRead: boolean;
  labelIds: string[];
};

export type GmailThreadDetail = {
  id: string;
  historyId: string;
  snippet: string;
  messages: GmailMessageParsed[];
};

export type GmailLabel = {
  id: string;
  name: string;
  type: string;
  messagesTotal?: number | null;
  messagesUnread?: number | null;
  threadsTotal?: number | null;
  threadsUnread?: number | null;
};

export type GmailProfile = {
  emailAddress: string;
  messagesTotal: number;
  threadsTotal: number;
  historyId: string;
};

export type GmailConnectionStatus = {
  connected: boolean;
  email?: string;
  connectedAt?: string;
};

export type GmailThreadLink = {
  _id: string;
  _type: "gmailThreadLink";
  gmailThreadId: string;
  linkedRecordType: "fitRequest" | "assessmentBooking";
  linkedRecordId: string;
  linkedRecordName: string;
  linkedAt: string;
  subject: string;
};

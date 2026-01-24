export type SanitySlug = { current: string };

export type WorkCard = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  featured?: boolean;
  client?: string;
  industry?: string;
  heroImage?: any;
};

export type WorkDetail = {
  _id: string;
  title: string;
  slug: string;
  summary?: string;
  featured?: boolean;
  client?: string;
  industry?: string;
  timeline?: string;
  stack?: string[];
  results?: string[];
  heroImage?: any;
  gallery?: any[];
  body?: any[];
  services?: { _id: string; title: string; slug: string }[];
};

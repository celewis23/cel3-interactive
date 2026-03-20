export type FieldType =
  | "text" | "textarea" | "number" | "email" | "phone" | "date"
  | "dropdown" | "checkbox" | "radio" | "file_upload" | "section_header";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Short Text",
  textarea: "Long Text",
  number: "Number",
  email: "Email",
  phone: "Phone",
  date: "Date",
  dropdown: "Dropdown",
  checkbox: "Checkboxes",
  radio: "Multiple Choice",
  file_upload: "File Upload",
  section_header: "Section Header",
};

export type FormField = {
  id: string;
  _key: string;
  label: string;
  fieldType: FieldType;
  placeholder: string;
  helpText: string;
  isRequired: boolean;
  options: string[];
  acceptedFileTypes: string;
  maxFileSizeMb: number;
  sortOrder: number;
};

export type Cel3Form = {
  _id: string;
  title: string;
  description: string;
  slug: string;
  isPublic: boolean;
  isActive: boolean;
  fields: FormField[];
  _createdAt: string;
  _updatedAt: string;
};

export type FormNotification = {
  _id: string;
  formId: string;
  emailAddress: string;
  label: string;
  isActive: boolean;
  notifyOnEverySubmission: boolean;
  includeFileLinks: boolean;
  sortOrder: number;
};

export type FormSubmission = {
  _id: string;
  formId: string;
  submittedAt: string;
  ipAddress: string;
  answersJson: string;
  filesJson: string;
};

export function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function makeField(sortOrder = 0): FormField {
  const id = crypto.randomUUID();
  return {
    id,
    _key: id,
    label: "",
    fieldType: "text",
    placeholder: "",
    helpText: "",
    isRequired: false,
    options: [],
    acceptedFileTypes: "image/*,audio/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip",
    maxFileSizeMb: 10,
    sortOrder,
  };
}

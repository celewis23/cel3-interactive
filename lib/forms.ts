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

export type ConditionalOperator = "equals" | "not_equals" | "is_empty" | "is_not_empty";

export type ConditionalLogic = {
  enabled: boolean;
  /** "show" = render only when condition is met; "hide" = render only when condition is NOT met */
  action: "show" | "hide";
  /** ID of the field whose answer drives this condition */
  fieldId: string;
  operator: ConditionalOperator;
  /** The value to compare against (unused for is_empty / is_not_empty) */
  value: string;
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
  conditionalLogic?: ConditionalLogic;
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

/**
 * Returns true if a field should be visible given the current set of answers.
 * Answers are keyed by field ID; values are strings or string arrays (checkboxes).
 * Used by both the public form renderer (client) and the submit API (server).
 */
export function isFieldVisible(
  field: FormField,
  answers: Record<string, string | string[] | unknown>,
): boolean {
  const cl = field.conditionalLogic;
  if (!cl?.enabled || !cl.fieldId) return true;

  const raw = answers[cl.fieldId];
  const answer = raw as string | string[] | undefined;

  let conditionMet: boolean;
  switch (cl.operator) {
    case "equals":
      conditionMet = Array.isArray(answer)
        ? answer.includes(cl.value)
        : String(answer ?? "") === cl.value;
      break;
    case "not_equals":
      conditionMet = Array.isArray(answer)
        ? !answer.includes(cl.value)
        : String(answer ?? "") !== cl.value;
      break;
    case "is_empty":
      conditionMet = !answer || (Array.isArray(answer) ? answer.length === 0 : !String(answer).trim());
      break;
    case "is_not_empty":
      conditionMet = !!(answer && (Array.isArray(answer) ? answer.length > 0 : String(answer).trim()));
      break;
    default:
      conditionMet = false;
  }

  return cl.action === "show" ? conditionMet : !conditionMet;
}

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

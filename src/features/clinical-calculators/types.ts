export type CalculatorSlug =
  | "pesi";

export type ResultTone = "default" | "success" | "warning" | "danger" | "info";

export type FieldOption = {
  label: string;
  value: string;
  description?: string;
};

export type FieldVisibilityRule = {
  field: string;
  equals?: string | boolean;
  notEquals?: string | boolean;
};

export type CalculatorField = {
  name: string;
  label: string;
  type: "number" | "select" | "checkbox" | "text";
  sectionId: string;
  description?: string;
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "text";
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  optional?: boolean;
  colSpan?: 1 | 2;
  options?: FieldOption[];
  visibility?: FieldVisibilityRule[];
};

export type CalculatorSection = {
  id: string;
  title: string;
  description?: string;
};

export type ReferenceLink = {
  label: string;
  href: string;
};

export type VariantTabs = {
  fieldName: string;
  options: FieldOption[];
};

export type ResultRow = {
  label: string;
  value: string;
};

export type DetailPanel = {
  title: string;
  tone?: ResultTone;
  description?: string;
  bullets?: string[];
  rows?: ResultRow[];
};

export type CalculatorResult = {
  headline: {
    label: string;
    value: string;
    status: string;
    tone: ResultTone;
    description?: string;
  };
  interpretation: DetailPanel;
  calculation: DetailPanel;
  extraPanels?: DetailPanel[];
};

export type CalculatorManifest = {
  slug: CalculatorSlug;
  title: string;
  shortTitle: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  heroEyebrow: string;
  heroDescription: string;
  heroHighlights: string[];
  resultMetricLabel: string;
  actionLabel: string;
  note?: string;
  limitations: string[];
  references: ReferenceLink[];
  variantTabs?: VariantTabs;
  sections: CalculatorSection[];
  fields: CalculatorField[];
  initialValues: Record<string, string | boolean>;
};

export type CalculatorEngine = {
  parse: (payload: unknown) => {
    success: true;
    data: Record<string, unknown>;
  } | {
    success: false;
    fieldErrors: Record<string, string>;
  };
  compute: (values: Record<string, unknown>) => CalculatorResult;
};

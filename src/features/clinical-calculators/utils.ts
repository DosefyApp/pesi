import type {
  CalculatorField,
  CalculatorManifest,
  CalculatorResult,
  CalculatorSlug,
  FieldVisibilityRule,
  ResultTone,
} from "@/features/clinical-calculators/types";

export function formatDecimal(value: number, digits = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatInteger(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function visibilityMatches(
  rules: FieldVisibilityRule[] | undefined,
  values: Record<string, string | boolean>,
) {
  if (!rules?.length) {
    return true;
  }

  return rules.every((rule) => {
    const currentValue = values[rule.field];

    if (rule.equals !== undefined) {
      return currentValue === rule.equals;
    }

    if (rule.notEquals !== undefined) {
      return currentValue !== rule.notEquals;
    }

    return true;
  });
}

export function groupFieldsBySection(manifest: CalculatorManifest) {
  const bySection = new Map<string, CalculatorField[]>();

  for (const section of manifest.sections) {
    bySection.set(section.id, []);
  }

  for (const field of manifest.fields) {
    const bucket = bySection.get(field.sectionId);
    if (bucket) {
      bucket.push(field);
    }
  }

  return bySection;
}

export function toneClasses(tone: ResultTone) {
  switch (tone) {
    case "success":
      return {
        badge: "border-emerald-200 bg-emerald-100 text-emerald-700",
        panel: "border-emerald-200 bg-emerald-50",
      };
    case "warning":
      return {
        badge: "border-amber-200 bg-amber-100 text-amber-700",
        panel: "border-amber-200 bg-amber-50",
      };
    case "danger":
      return {
        badge: "border-rose-200 bg-rose-100 text-rose-700",
        panel: "border-rose-200 bg-rose-50",
      };
    case "info":
      return {
        badge: "border-blue-200 bg-blue-100 text-blue-700",
        panel: "border-cyan-200 bg-cyan-50",
      };
    default:
      return {
        badge: "border-slate-200 bg-slate-100 text-slate-700",
        panel: "border-slate-200 bg-slate-50",
      };
  }
}

export function isCalculatorSlug(value: string): value is CalculatorSlug {
  return ["pesi"].includes(value);
}

export function normalizeFieldErrors(fieldErrors: Record<string, string[] | undefined>) {
  return Object.fromEntries(
    Object.entries(fieldErrors)
      .filter(([, value]) => value?.length)
      .map(([key, value]) => [key, value?.[0] ?? "Valor inválido."]),
  );
}

export function withStandardPanels(
  result: Omit<CalculatorResult, "extraPanels"> & { extraPanels?: CalculatorResult["extraPanels"] },
) {
  return result;
}

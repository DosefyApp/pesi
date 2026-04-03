"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertCircle,
  Calculator,
  CheckCircle,
  ClipboardList,
  FileText,
  FlaskConical,
  Info,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { CalculatorManifest, CalculatorResult } from "@/features/clinical-calculators/types";
import { groupFieldsBySection, toneClasses, visibilityMatches } from "@/features/clinical-calculators/utils";

type Props = {
  manifest: CalculatorManifest;
};

export function CalculatorPageClient({ manifest }: Props) {
  const [values, setValues] = useState<Record<string, string | boolean>>(manifest.initialValues);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<CalculatorResult | null>(null);

  const groupedFields = useMemo(() => groupFieldsBySection(manifest), [manifest]);

  const handleChange = (name: string, nextValue: string | boolean) => {
    setValues((current) => ({ ...current, [name]: nextValue }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setFormError(null);

    const payload = Object.fromEntries(
      Object.entries(values)
        .filter(([key, value]) => {
          if (manifest.variantTabs?.fieldName === key) {
            return true;
          }

          const field = manifest.fields.find((item) => item.name === key);

          if (!field || !visibilityMatches(field.visibility, values)) {
            return false;
          }

          if (field.type === "checkbox") {
            return true;
          }

          return !(field.optional && value === "");
        })
        .map(([key, value]) => [key, value]),
    );

    try {
      const response = await fetch("/api/calculate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const body = (await response.json()) as
        | { result: CalculatorResult }
        | { message?: string; fieldErrors?: Record<string, string> };

      if (!response.ok) {
        setResult(null);
        setFieldErrors("fieldErrors" in body ? body.fieldErrors ?? {} : {});
        setFormError(("message" in body && body.message) ? body.message : "Não foi possível processar os dados informados.");
        return;
      }

      setFieldErrors({});
      setResult("result" in body ? body.result : null);
    } catch {
      setFormError("Falha de conexão ao calcular. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="w-full space-y-4">
          <a
            href="https://www.dosefy.com.br/app/calculadoras"
            className="inline-flex items-center gap-2.5 rounded-xl px-5 py-2.5 font-semibold text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(0,0,0,0.22)] active:translate-y-0 active:shadow-[0_3px_10px_rgba(0,0,0,0.15)]"
            style={{ background: "linear-gradient(90deg, #2575f6, #43b5ff)" }}
          >
            <span className="text-xl leading-none">←</span>
            <span>Voltar</span>
          </a>

          <header
            className="w-full rounded-2xl p-3.5 shadow-[0_4px_12px_rgba(0,0,0,0.12)] md:p-5"
            style={{ background: "linear-gradient(90deg, #2575f6, #43b5ff)" }}
          >
            <div className="flex items-center gap-3.5">
              <img
                src="/logo-dosefy.jpeg"
                alt="Logo Dosefy"
                className="h-10 w-10 flex-shrink-0 rounded-full shadow-[0_0_0_3px_rgba(255,255,255,0.18)]"
              />

              <div className="flex flex-col">
                <h1 className="text-base font-semibold leading-tight text-white md:text-lg">{manifest.shortTitle}</h1>
                <p className="mt-0.5 text-xs text-[#e5f3ff] md:text-sm">{manifest.description}</p>
              </div>
            </div>
          </header>
        </div>

        <IntroCard manifest={manifest} />

        {manifest.note ? (
          <SectionCard title="Resumo clínico" icon={<Info className="h-5 w-5" />}>
            <p className="text-sm leading-7 text-muted-foreground">{manifest.note}</p>
          </SectionCard>
        ) : null}

        {manifest.variantTabs ? (
          <SectionCard title="Versão do cálculo" icon={<FileText className="h-5 w-5" />}>
            <div className={cn("grid gap-3", getOptionGridClass(manifest.variantTabs.options.length))}>
              {manifest.variantTabs.options.map((option) => {
                const active = values[manifest.variantTabs!.fieldName] === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleChange(manifest.variantTabs!.fieldName, option.value)}
                    className={cn(
                      "rounded-xl border px-4 py-4 text-left transition-all",
                      active
                        ? "border-[#4f97dd] bg-[#4f97dd] text-white shadow-sm"
                        : "border-border bg-background text-foreground hover:border-[#4f97dd]/40 hover:bg-muted/40",
                    )}
                  >
                    <span className={cn("block text-sm font-semibold", active ? "text-white" : "text-foreground")}>{option.label}</span>
                    {option.description ? (
                      <span className={cn("mt-1 block text-sm leading-6", active ? "text-blue-50" : "text-muted-foreground")}>{option.description}</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </SectionCard>
        ) : null}

        <SectionCard title={manifest.shortTitle} description={manifest.description} icon={<Calculator className="h-5 w-5" />}>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {manifest.sections.map((section) => {
              const sectionFields = (groupedFields.get(section.id) ?? []).filter((field) =>
                visibilityMatches(field.visibility, values),
              );

              if (!sectionFields.length) {
                return null;
              }

              return (
                <section key={section.id} className="space-y-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                    {section.description ? (
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{section.description}</p>
                    ) : null}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    {sectionFields.map((field) => {
                      const error = fieldErrors[field.name];
                      const sharedClassName = cn(
                        "mt-2 w-full rounded-xl border bg-background px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10",
                        error ? "border-destructive focus:ring-destructive/10" : "border-border",
                      );

                      return (
                        <label
                          key={field.name}
                          className={cn(
                            "block rounded-xl border border-border/60 bg-muted/30 p-4",
                            field.colSpan === 2 && "md:col-span-2",
                          )}
                        >
                          {field.type === "checkbox" ? (
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={Boolean(values[field.name])}
                                onChange={(event) => handleChange(field.name, event.target.checked)}
                                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                              />
                              <div>
                                <span className="text-sm font-semibold text-foreground">{field.label}</span>
                                {field.description ? (
                                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{field.description}</p>
                                ) : null}
                                {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
                              </div>
                            </div>
                          ) : (
                            <>
                              <span className="text-sm font-semibold text-foreground">{field.label}</span>
                              {field.description ? (
                                <p className="mt-1 text-sm leading-6 text-muted-foreground">{field.description}</p>
                              ) : null}
                              {field.type === "select" ? (
                                <div className={cn("mt-2 grid gap-3", getOptionGridClass(getSelectableOptions(field.options).length, field.colSpan))}>
                                  {getSelectableOptions(field.options).map((option) => {
                                    const active = String(values[field.name] ?? "") === option.value;

                                    return (
                                      <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => handleChange(field.name, option.value)}
                                        className={cn(
                                          "rounded-xl border px-4 py-4 text-left transition-all",
                                          active
                                            ? "border-[#4f97dd] bg-[#4f97dd] text-white shadow-sm"
                                            : "border-border bg-background text-foreground hover:border-[#4f97dd]/40 hover:bg-muted/40",
                                        )}
                                      >
                                        <div className="flex items-start justify-between gap-3">
                                          <span className={cn("text-sm font-semibold", active ? "text-white" : "text-foreground")}>
                                            {option.label}
                                          </span>
                                          {option.description ? (
                                            <span className={cn("text-sm font-semibold", active ? "text-white" : "text-foreground")}>
                                              {option.description}
                                            </span>
                                          ) : null}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="relative">
                                  <input
                                    type={field.type === "number" ? "number" : "text"}
                                    inputMode={field.inputMode}
                                    value={String(values[field.name] ?? "")}
                                    onChange={(event) => handleChange(field.name, event.target.value)}
                                    placeholder={field.placeholder}
                                    min={field.min}
                                    max={field.max}
                                    step={field.step}
                                    className={cn(sharedClassName, field.suffix && "pr-20")}
                                  />
                                  {field.suffix ? (
                                    <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                      {field.suffix}
                                    </span>
                                  ) : null}
                                </div>
                              )}
                              {error ? <p className="mt-2 text-sm text-destructive">{error}</p> : null}
                            </>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {formError ? (
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {formError}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_25px_-15px_rgba(37,117,246,0.9)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {submitting ? "Calculando..." : manifest.actionLabel}
            </button>
          </form>
        </SectionCard>

        {result ? <ResultPanels result={result} /> : null}

        {manifest.heroHighlights.length ? (
          <SectionCard title="Pontos-chave" icon={<ClipboardList className="h-5 w-5" />}>
            <BulletList items={manifest.heroHighlights} />
          </SectionCard>
        ) : null}

        <SectionCard title="Limitações" icon={<AlertCircle className="h-5 w-5" />}>
          <BulletList items={manifest.limitations} />
        </SectionCard>

        <SectionCard title="Referências" icon={<FlaskConical className="h-5 w-5" />}>
          <div className="space-y-3">
            {manifest.references.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:border-primary/30 hover:text-primary"
              >
                {item.label}
              </a>
            ))}
          </div>
        </SectionCard>

        <div className="pt-4 text-center text-sm text-muted-foreground">
          <p>⚠️ {manifest.note ?? "Ferramenta de apoio à decisão. Não substitui julgamento clínico."}</p>
        </div>
      </div>
    </main>
  );
}

function IntroCard({ manifest }: { manifest: CalculatorManifest }) {
  return (
    <section className="rounded-xl border border-border/50 bg-card p-6 shadow-[var(--shadow-card)]">
      <h2 className="mb-2 text-2xl font-bold text-foreground">{manifest.title}</h2>
      <p className="text-muted-foreground">{manifest.heroDescription}</p>
    </section>
  );
}

function ResultPanels({ result }: { result: CalculatorResult }) {
  return (
    <div className="space-y-6">
      <ResultHeadline result={result} />
      <ResultPanel panel={result.interpretation} icon={<Info className="h-5 w-5" />} />
      <ResultPanel panel={result.calculation} icon={<Calculator className="h-5 w-5" />} />
      {result.extraPanels?.map((panel) => (
        <ResultPanel key={panel.title} panel={panel} icon={<ClipboardList className="h-5 w-5" />} />
      ))}
    </div>
  );
}

function ResultHeadline({ result }: { result: CalculatorResult }) {
  const palette = toneClasses(result.headline.tone);
  const levelIcon = result.headline.tone === "success" ? <CheckCircle className="h-5 w-5 text-emerald-600" /> : result.headline.tone === "danger" ? <AlertCircle className="h-5 w-5 text-red-600" /> : <Info className="h-5 w-5 text-blue-600" />;

  return (
    <section className={cn("rounded-xl border p-6 shadow-[var(--shadow-card)]", palette.panel)}>
      <div className="flex items-center justify-between gap-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-foreground">
          {levelIcon}
          Interpretação do Resultado
        </h3>
        <span className={cn("rounded-full px-3 py-1 text-xs font-bold", palette.badge)}>{result.headline.status}</span>
      </div>

      <div className="mt-4 rounded-lg bg-background/70 p-4">
        <p className="text-sm font-medium text-muted-foreground">{result.headline.label}</p>
        <p className="mt-1 text-3xl font-bold text-foreground">{result.headline.value}</p>
      </div>

      {result.headline.description ? (
        <p className="mt-4 text-sm leading-7 text-foreground/80">{result.headline.description}</p>
      ) : null}
    </section>
  );
}

function ResultPanel({
  panel,
  icon,
}: {
  panel: NonNullable<CalculatorResult["extraPanels"]>[number] | CalculatorResult["interpretation"] | CalculatorResult["calculation"];
  icon: ReactNode;
}) {
  const palette = toneClasses(panel.tone ?? "default");

  return (
    <SectionCard title={panel.title} icon={icon} tone={panel.tone ? palette.panel : undefined}>
      {panel.description ? <p className="text-sm leading-7 text-muted-foreground">{panel.description}</p> : null}

      {panel.rows?.length ? (
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <tbody className="divide-y divide-border bg-card">
              {panel.rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-muted-foreground">{row.label}</td>
                  <td className="px-4 py-3 text-right text-foreground">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {panel.bullets?.length ? <div className="mt-4"><BulletList items={panel.bullets} /></div> : null}
    </SectionCard>
  );
}

function SectionCard({
  title,
  description,
  icon,
  tone,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border border-border/50 bg-card p-6 shadow-[var(--shadow-card)]", tone)}>
      <div className="mb-4 flex items-center gap-3">
        {icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-muted text-primary">
            {icon}
          </div>
        ) : null}
        <div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-6 text-foreground/80">
          <span className="mt-2 h-2 w-2 rounded-full bg-primary/50" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function getSelectableOptions(options: CalculatorManifest["fields"][number]["options"]) {
  return (options ?? []).filter((option) => option.value !== "");
}

function getOptionGridClass(optionCount: number, colSpan?: 1 | 2) {
  if (optionCount <= 2) {
    return "sm:grid-cols-2";
  }

  if (optionCount === 3) {
    return "md:grid-cols-3";
  }

  if (optionCount === 4) {
    return colSpan === 2 ? "md:grid-cols-2" : "xl:grid-cols-2";
  }

  return "md:grid-cols-2";
}

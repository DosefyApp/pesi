"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Calculator, ClipboardList, FlaskConical, Info, Loader2 } from "lucide-react";
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
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">{manifest.heroEyebrow}</p>
          <div className="max-w-4xl space-y-3 text-left">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-slate-950 sm:text-5xl">{manifest.title}</h1>
            <p className="text-base leading-7 text-slate-600">{manifest.heroDescription}</p>
          </div>
        </section>

        <header className="calc-header">
          <a href="https://www.dosefy.com.br/app/calculadoras" className="btn-voltar-left">
            <span className="btn-voltar-left__icon">←</span>
            Voltar
          </a>

          <div className="calc-header__content">
            <img
              src="/logo-dosefy.png"
              alt="Logo Dosefy"
              className="calc-header__logo"
            />

            <div className="calc-header__text">
              <span className="calc-header__title">
                {manifest.shortTitle}
              </span>
              <span className="calc-header__subtitle">
                {manifest.description}
              </span>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {manifest.heroHighlights.map((item) => (
            <article key={item} className="surface-card px-5 py-4">
              <p className="text-sm leading-6 text-slate-700">{item}</p>
            </article>
          ))}
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <section className="surface-card px-6 py-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <Calculator className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{manifest.shortTitle}</h2>
                <p className="text-sm text-slate-500">{manifest.description}</p>
              </div>
            </div>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {manifest.variantTabs ? (
                <section className="space-y-3">
                  <div>
                    <h3 className="text-base font-semibold text-slate-950">Versão do cálculo</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">Escolha a variante clínica que deseja calcular.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {manifest.variantTabs.options.map((option) => {
                      const active = values[manifest.variantTabs!.fieldName] === option.value;

                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => handleChange(manifest.variantTabs!.fieldName, option.value)}
                          className={cn(
                            "rounded-[24px] border px-4 py-4 text-left transition",
                            active
                              ? "border-blue-300 bg-blue-50 shadow-sm"
                              : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
                          )}
                        >
                          <span className="block text-sm font-semibold text-slate-950">{option.label}</span>
                          {option.description ? (
                            <span className="mt-1 block text-sm leading-6 text-slate-500">{option.description}</span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </section>
              ) : null}

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
                      <h3 className="text-base font-semibold text-slate-950">{section.title}</h3>
                      {section.description ? (
                        <p className="mt-1 text-sm leading-6 text-slate-500">{section.description}</p>
                      ) : null}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {sectionFields.map((field) => {
                        const error = fieldErrors[field.name];
                        const sharedClassName = cn(
                          "mt-2 w-full rounded-2xl border bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100",
                          error ? "border-rose-300 focus:border-rose-400 focus:ring-rose-100" : "border-slate-200",
                        );

                        return (
                          <label
                            key={field.name}
                            className={cn(
                              "block rounded-[24px] border border-slate-100 bg-slate-50/80 p-4",
                              field.colSpan === 2 && "md:col-span-2",
                            )}
                          >
                            {field.type === "checkbox" ? (
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  checked={Boolean(values[field.name])}
                                  onChange={(event) => handleChange(field.name, event.target.checked)}
                                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-semibold text-slate-900">{field.label}</span>
                                  {field.description ? (
                                    <p className="mt-1 text-sm leading-6 text-slate-500">{field.description}</p>
                                  ) : null}
                                  {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
                                </div>
                              </div>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-slate-900">{field.label}</span>
                                {field.description ? (
                                  <p className="mt-1 text-sm leading-6 text-slate-500">{field.description}</p>
                                ) : null}
                                {field.type === "select" ? (
                                  <select
                                    value={String(values[field.name] ?? "")}
                                    onChange={(event) => handleChange(field.name, event.target.value)}
                                    className={sharedClassName}
                                  >
                                    {field.options?.map((option) => (
                                      <option key={option.value} value={option.value}>
                                        {option.label}
                                      </option>
                                    ))}
                                  </select>
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
                                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                                        {field.suffix}
                                      </span>
                                    ) : null}
                                  </div>
                                )}
                                {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
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
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{formError}</div>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-400"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                {submitting ? "Calculando..." : manifest.actionLabel}
              </button>
            </form>
          </section>

          <aside className="space-y-6">
            {manifest.note ? (
              <InfoCard
                icon={<Info className="h-5 w-5" />}
                title="Observação clínica"
                body={manifest.note}
                tone="info"
              />
            ) : null}

            {result ? <ResultPanels result={result} /> : null}

            <InfoCard
              icon={<ClipboardList className="h-5 w-5" />}
              title="Limitações"
              tone="warning"
              bullets={manifest.limitations}
            />

            <InfoCard
              icon={<FlaskConical className="h-5 w-5" />}
              title="Referências"
              tone="default"
              links={manifest.references}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function ResultPanels({ result }: { result: CalculatorResult }) {
  return (
    <div className="space-y-6">
      <ResultHeadline result={result} />
      <ResultPanel panel={result.interpretation} />
      <ResultPanel panel={result.calculation} />
      {result.extraPanels?.map((panel) => (
        <ResultPanel key={panel.title} panel={panel} />
      ))}
    </div>
  );
}

function ResultHeadline({ result }: { result: CalculatorResult }) {
  const palette = toneClasses(result.headline.tone);

  return (
    <section className={cn("rounded-[28px] border p-6 shadow-sm", palette.panel)}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Resultado</p>
          <h2 className="mt-3 text-base font-semibold text-slate-900">{result.headline.label}</h2>
          <p className="mt-3 text-4xl font-semibold tracking-[-0.05em] text-slate-950">{result.headline.value}</p>
        </div>
        <span className={cn("inline-flex rounded-full border px-3 py-1 text-xs font-semibold", palette.badge)}>
          {result.headline.status}
        </span>
      </div>
      {result.headline.description ? (
        <p className="mt-4 text-sm leading-6 text-slate-600">{result.headline.description}</p>
      ) : null}
    </section>
  );
}

function ResultPanel({ panel }: { panel: NonNullable<CalculatorResult["extraPanels"]>[number] | CalculatorResult["interpretation"] | CalculatorResult["calculation"] }) {
  const palette = toneClasses(panel.tone ?? "default");

  return (
    <section className={cn("rounded-[28px] border bg-white p-6 shadow-sm", panel.tone ? palette.panel : "border-slate-200")}>
      <h3 className="text-base font-semibold text-slate-950">{panel.title}</h3>
      {panel.description ? <p className="mt-3 text-sm leading-7 text-slate-600">{panel.description}</p> : null}

      {panel.rows?.length ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <tbody className="divide-y divide-slate-200 bg-white">
              {panel.rows.map((row) => (
                <tr key={row.label}>
                  <td className="px-4 py-3 font-medium text-slate-600">{row.label}</td>
                  <td className="px-4 py-3 text-right text-slate-900">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {panel.bullets?.length ? (
        <ul className="mt-4 space-y-2">
          {panel.bullets.map((bullet) => (
            <li key={bullet} className="flex gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-2 h-2 w-2 rounded-full bg-slate-300" />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function InfoCard({
  icon,
  title,
  body,
  bullets,
  links,
  tone,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  bullets?: string[];
  links?: Array<{ label: string; href: string }>;
  tone: "default" | "warning" | "info";
}) {
  const palette = toneClasses(tone);

  return (
    <section className={cn("rounded-[28px] border bg-white p-6 shadow-sm", palette.panel)}>
      <div className="flex items-center gap-3">
        <div className={cn("flex h-10 w-10 items-center justify-center rounded-2xl", tone === "warning" ? "bg-amber-100 text-amber-700" : tone === "info" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-700")}>
          {icon}
        </div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      </div>

      {body ? <p className="mt-4 text-sm leading-7 text-slate-600">{body}</p> : null}

      {bullets?.length ? (
        <ul className="mt-4 space-y-2">
          {bullets.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
              <span className="mt-2 h-2 w-2 rounded-full bg-slate-300" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {links?.length ? (
        <div className="mt-4 space-y-3">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="block rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-blue-200 hover:text-blue-700"
            >
              {item.label}
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

import { Check } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";

interface PipelineStep {
  label: string;
  state: "done" | "current" | "pending";
}

export function getEditorialSteps(edition: NewsletterEdition): PipelineStep[] {
  const hasArticles = edition.article_count > 0;
  const isReady = edition.status === "ready";
  const isPublished = edition.status === "published";

  return [
    {
      label: "Discover",
      state: "done" as const,
    },
    {
      label: "Select",
      state: hasArticles ? ("done" as const) : ("current" as const),
    },
    {
      label: "Compose",
      state: isReady || isPublished
        ? ("done" as const)
        : hasArticles
          ? ("current" as const)
          : ("pending" as const),
    },
    {
      label: "Review",
      state: isPublished
        ? ("done" as const)
        : isReady
          ? ("current" as const)
          : ("pending" as const),
    },
    {
      label: "Ready",
      state: isPublished ? ("done" as const) : ("pending" as const),
    },
  ];
}

export function EditorialPipeline({ edition }: { edition: NewsletterEdition }) {
  const steps = getEditorialSteps(edition);

  return (
    <div className="flex items-stretch gap-0 rounded-lg border border-[var(--color-border)]/10 bg-white/[0.02]" role="progressbar" aria-label="Editorial pipeline" aria-valuemin={0} aria-valuemax={100} aria-valuenow={steps.filter((s) => s.state === "done").length * 25}>
      {steps.map((step, i) => (
        <div key={step.label} className="flex flex-1 items-center gap-2 px-3 py-2">
          <div
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium transition-all duration-[var(--duration-base)] ${
              step.state === "done"
                ? "bg-[var(--color-accent-success)] text-white shadow-sm shadow-[var(--color-accent-success)]/30"
                : step.state === "current"
                  ? "bg-[var(--color-accent-primary)]/15 text-[var(--color-accent-primary)] ring-1 ring-[var(--color-accent-primary)]/40"
                  : "bg-white/[0.04] text-[var(--color-text-muted)]"
            }`}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            {step.state === "done" ? (
              <Check size={9} strokeWidth={3} />
            ) : (
              <span>{i + 1}</span>
            )}
          </div>
          <span
            className={`text-[11px] font-medium leading-tight ${
              step.state === "done"
                ? "text-[var(--color-accent-success)]"
                : step.state === "current"
                  ? "text-[var(--color-accent-primary)]"
                  : "text-[var(--color-text-muted)]"
            }`}
          >
            {step.label}
          </span>
          {i < steps.length - 1 && (
            <div className="ml-auto">
              <div
                className={`h-px w-6 ${
                  steps[i + 1].state === "done" || (step.state === "done" && steps[i + 1].state === "current")
                    ? "bg-[var(--color-accent-success)]/40"
                    : "bg-white/[0.08]"
                }`}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

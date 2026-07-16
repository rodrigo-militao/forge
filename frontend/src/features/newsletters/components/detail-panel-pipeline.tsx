import { Check } from "lucide-react";
import type { NewsletterEdition } from "../../../api/client";

export const statusConfig: Record<string, { labelKey: string; className: string }> = {
  building: { labelKey: "newsletters.building", className: "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)]" },
  ready: { labelKey: "newsletters.ready", className: "bg-[var(--color-accent-success)]/20 text-[var(--color-accent-success)]" },
  published: { labelKey: "newsletters.published", className: "bg-white/10 text-[var(--color-bg-surface)]" },
  archived: { labelKey: "newsletters.archived", className: "bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]" },
};

type StepState = "done" | "active" | "pending";
type Stage = "discover" | "compose" | "ready" | "published" | "archived";

export function getStage(item: NewsletterEdition): Stage {
  if (item.status === "archived") return "archived";
  if (item.status === "published") return "published";
  if (item.status === "ready") return "ready";
  if (item.status === "building" && item.article_count > 0) return "compose";
  return "discover";
}

function getPipelineSteps(item: NewsletterEdition): { label: string; state: StepState }[] {
  const hasArticles = item.article_count > 0;
  const hasBody = item.body_html.length > 0;
  const isReady = item.status === "ready";
  const isPublished = item.status === "published";

  return [
    { label: "Discover", state: hasArticles ? "done" : ("active" as StepState) },
    { label: "Compose", state: hasBody ? "done" : (hasArticles ? "active" : "pending") as StepState },
    { label: "Review", state: isReady || isPublished ? "done" : (hasBody ? "active" : "pending") as StepState },
    { label: "Ready", state: isReady || isPublished ? "done" : ("pending" as StepState) },
  ];
}

export function PipelineProgress({ item }: { item: NewsletterEdition }) {
  const steps = getPipelineSteps(item);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold transition-all duration-[var(--duration-base)] ${
                  step.state === "done"
                    ? "bg-[var(--color-accent-success)] text-white shadow-sm shadow-[var(--color-accent-success)]/30"
                    : step.state === "active"
                      ? "bg-[var(--color-accent-primary)]/20 text-[var(--color-accent-primary)] ring-2 ring-[var(--color-accent-primary)]/50 shadow-lg shadow-[var(--color-accent-primary)]/15"
                      : "bg-white/[0.04] text-[var(--color-text-muted)]"
                }`}
              >
                {step.state === "done" ? (
                  <Check size={12} strokeWidth={3} />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  step.state === "done"
                    ? "text-[var(--color-accent-success)]"
                    : step.state === "active"
                      ? "text-[var(--color-accent-primary)]"
                      : "text-[var(--color-text-muted)]"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-1.5 mb-5 h-px w-5 ${
                  steps[i + 1].state === "done" || (step.state === "done" && steps[i + 1].state === "active")
                    ? "bg-[var(--color-accent-success)]/50"
                    : "bg-white/[0.08]"
                }`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

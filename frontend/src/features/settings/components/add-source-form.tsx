import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../components/ui/input";

interface AddSourceFormProps {
  type: "rss" | "web_search";
  onSave: (data: { name: string; type: string; config: Record<string, string> }) => void;
  onCancel: () => void;
}

export function AddSourceForm({ type, onSave, onCancel }: AddSourceFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [config, setConfig] = useState<Record<string, string>>({});

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-hover-subtle)] p-4">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("settings.sourceName")}
        className="px-3 py-2"
      />
      {type === "rss" ? (
        <Input
          type="text"
          value={config.url ?? ""}
          onChange={(e) => setConfig({ url: e.target.value })}
          placeholder={t("settings.sourceURLPlaceholder")}
          className="px-3 py-2"
        />
      ) : (
        <Input
          type="text"
          value={config.query ?? ""}
          onChange={(e) => setConfig({ query: e.target.value })}
          placeholder={t("settings.sourceQueryPlaceholder")}
          className="px-3 py-2"
        />
      )}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ name, type, config })}
          disabled={!name.trim()}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t("settings.addSource")}
        </button>
        <button onClick={onCancel} className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5">
          {t("settings.cancel")}
        </button>
      </div>
    </div>
  );
}

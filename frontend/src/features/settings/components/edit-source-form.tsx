import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "../../../components/ui/input";
import { Toggle } from "../../../components/ui/toggle";

interface EditSourceFormProps {
  source: import("../../../api/client").DigestSource;
  onSave: (data: { id?: string; name: string; type: string; config: Record<string, string>; enabled?: boolean }) => void;
  onCancel: () => void;
}

export function EditSourceForm({ source, onSave, onCancel }: EditSourceFormProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(source.name);
  const [config, setConfig] = useState<Record<string, string>>(source.config);
  const [enabled, setEnabled] = useState(source.enabled);

  return (
    <div className="space-y-3 rounded-lg border border-[var(--color-border)]/20 bg-[var(--color-hover-subtle)] p-4">
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("settings.sourceName")}
        className="px-3 py-2"
      />
      {source.type === "rss" ? (
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
      <label className="flex cursor-pointer items-center gap-2 text-sm text-[var(--color-text-secondary)]">
        <Toggle checked={enabled} onChange={() => setEnabled(!enabled)} />
        {t("settings.sourceEnabled")}
      </label>
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onSave({ id: source.id, name, type: source.type, config, enabled })}
          className="cursor-pointer rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          {t("settings.save")}
        </button>
        <button onClick={onCancel} className="cursor-pointer rounded-lg border border-[var(--color-border)]/20 px-4 py-2 text-sm text-[var(--color-text-secondary)] transition-colors hover:bg-white/5">
          {t("settings.cancel")}
        </button>
      </div>
    </div>
  );
}

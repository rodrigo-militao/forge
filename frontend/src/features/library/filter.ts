import type { ContentItem } from "../../api/client";

export interface FilterParams {
  content: ContentItem[];
  showDeleted: boolean;
  categoryFilter: string;
  tagFilter: string;
}

export function filterLibraryContent(params: FilterParams): ContentItem[] {
  const { content, showDeleted, categoryFilter, tagFilter } = params;

  return content.filter((c) => {
    const isComposeOrNewsletter =
      c.product === "compose" || c.product === "newsletter";

    if (!showDeleted) {
      if (!(isComposeOrNewsletter && c.deleted_at === null)) return false;
    } else {
      const include = isComposeOrNewsletter || c.deleted_at !== null;
      if (!include) return false;
    }

    if (categoryFilter && !(c.categories || []).includes(categoryFilter)) return false;
    if (tagFilter && !(c.tags || []).includes(tagFilter)) return false;

    return true;
  });
}

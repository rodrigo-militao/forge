// Barrel file — re-exports all API modules for backward compatibility.
// New code can import directly from the split modules:
//   import { api } from "../../api/client";        // backward compat (still works)
//   import { content } from "../../api/content";   // direct import (preferred)
//   import type { ContentItem } from "../../api/types";

export { setOnUnauthorized, request } from "./request";
export type * from "./types";
export { auth } from "./auth";
export { content } from "./content";
export { digest } from "./digest";
export { compose } from "./compose";
export { newsletters } from "./newsletters";
export { ideas } from "./ideas";

import { auth } from "./auth";
import { content } from "./content";
import { digest } from "./digest";
import { compose } from "./compose";
import { newsletters } from "./newsletters";
import { ideas } from "./ideas";

/** Aggregated API object for callers that prefer `api.content.list()` style. */
export const api = {
  auth,
  content,
  digest,
  compose,
  newsletters,
  ideas,
};

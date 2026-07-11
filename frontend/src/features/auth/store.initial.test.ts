import { test } from "poku";
import assert from "node:assert/strict";
import { useAuth } from "./store";

test("starts with loading and no user", () => {
  useAuth.setState({ user: null, loading: true });
  assert.strictEqual(useAuth.getState().loading, true);
  assert.strictEqual(useAuth.getState().user, null);
});

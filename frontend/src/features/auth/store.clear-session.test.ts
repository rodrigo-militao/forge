import { test } from "poku";
import assert from "node:assert/strict";
import { useAuth } from "./store";

test("clearSession sets user to null and loading to false", () => {
  useAuth.setState({ user: { id: "1", email: "a@b.com", name: "T" }, loading: false });

  useAuth.getState().clearSession();

  assert.strictEqual(useAuth.getState().user, null);
  assert.strictEqual(useAuth.getState().loading, false);
});

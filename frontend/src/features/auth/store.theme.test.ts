import { test } from "poku";
import assert from "node:assert/strict";
import { useAuth } from "./store";

test("applyTheme sets document dataset when DOM is available", async () => {
  useAuth.setState({ user: null, loading: true });

  // Mock document
  const themeSetter = { dataset: { theme: "" } };
  const prevDoc = (globalThis as any).document;
  (globalThis as any).document = {
    documentElement: themeSetter,
  };

  try {
    // Login sets theme
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: "1", email: "a@b.com", name: "Test", theme_preference: "dark" }), { status: 200 });
    await useAuth.getState().login("a@b.com", "secret");
    assert.strictEqual(themeSetter.dataset.theme, "dark");

    // Register sets theme
    useAuth.setState({ user: null, loading: true });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: "2", email: "b@b.com", name: "T", theme_preference: "light" }), { status: 201 });
    await useAuth.getState().register("b@b.com", "secret", "T");
    assert.strictEqual(themeSetter.dataset.theme, "light");

    // Load sets theme
    useAuth.setState({ user: null, loading: true });
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ id: "3", email: "c@b.com", name: "U", theme_preference: "dark" }), { status: 200 });
    await useAuth.getState().load();
    assert.strictEqual(themeSetter.dataset.theme, "dark");
  } finally {
    if (prevDoc === undefined) {
      delete (globalThis as any).document;
    } else {
      (globalThis as any).document = prevDoc;
    }
  }
});

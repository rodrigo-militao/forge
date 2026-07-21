import i18next from "i18next";

/**
 * Sets up a minimal JSDOM + React + i18n environment for component tests.
 * Call once at the top of each test file that needs DOM rendering.
 */
export async function setupTestEnvironment() {
  const { JSDOM } = await import("jsdom");
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
    url: "http://localhost",
    pretendToBeVisual: true,
  });
  (globalThis as any).document = dom.window.document;
  (globalThis as any).window = dom.window;
  (globalThis as any).HTMLElement = dom.window.HTMLElement || dom.window.HTMLHtmlElement;
  (globalThis as any).HTMLButtonElement = dom.window.HTMLButtonElement;
  (globalThis as any).Node = dom.window.Node;
  (globalThis as any).self = dom.window;
  (globalThis as any).MutationObserver = dom.window.MutationObserver;

  const ReactMod = await import("react");
  (globalThis as any).React = ReactMod.default || ReactMod;

  return dom;
}

/**
 * Initializes i18next with a minimal resource bundle for tests.
 * Uses the defaults from the first locale (en).
 */
export async function setupTestI18n(translations?: Record<string, any>) {
  const { initReactI18next } = await import("react-i18next");
  i18next.use(initReactI18next).init({
    lng: "en",
    fallbackLng: "en",
    debug: false,
    interpolation: { escapeValue: false },
    resources: {
      en: {
        translation: translations || {
          digest: { discovering: "Discovering" },
          home: {
            greetingMorning: "Good morning {{name}}",
            greetingAfternoon: "Good afternoon {{name}}",
            greetingEvening: "Good evening {{name}}",
          },
          common: { close: "Close", save: "Save", cancel: "Cancel" },
          editor: { saved: "Saved", saving: "Saving...", synced: "Synced" },
        },
      },
    },
  });
}

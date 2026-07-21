export function applyTheme(theme: string) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
  }
}

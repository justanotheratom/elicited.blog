const primaryColorScheme = ""; // "light" | "dark"
const themeColors = {
  light: "#fdfdfd",
  dark: "#212737",
};

function getStoredTheme() {
  try {
    return localStorage.getItem("theme");
  } catch {
    return null;
  }
}

function getPreferredTheme() {
  const storedTheme = getStoredTheme();
  if (storedTheme) return storedTheme;
  if (primaryColorScheme) return primaryColorScheme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

let themeValue = getPreferredTheme();

function reflectPreference() {
  document.documentElement.setAttribute("data-theme", themeValue);
  document.querySelector("#theme-btn")?.setAttribute("aria-label", themeValue);
  document
    .querySelector("meta[name='theme-color']")
    ?.setAttribute("content", themeColors[themeValue] ?? themeColors.light);
}

function setPreference(nextTheme) {
  themeValue = nextTheme;

  try {
    localStorage.setItem("theme", themeValue);
  } catch {}

  reflectPreference();
}

function setupThemeToggle() {
  const themeButton = document.querySelector("#theme-btn");
  if (!themeButton || themeButton.dataset.themeBound === "true") return;

  themeButton.dataset.themeBound = "true";
  reflectPreference();
  themeButton.addEventListener("click", () => {
    setPreference(themeValue === "light" ? "dark" : "light");
  });
}

reflectPreference();
setupThemeToggle();

window
  .matchMedia("(prefers-color-scheme: dark)")
  .addEventListener("change", ({ matches: isDark }) => {
    setPreference(isDark ? "dark" : "light");
  });

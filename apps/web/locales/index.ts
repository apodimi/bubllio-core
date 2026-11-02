import en from "./en.json";

export type Locale = "en" | "el";
export type SetupCopy = typeof en.setup;

export { i18n, initializeI18n } from "./i18n";

import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import el from "./el.json";
import en from "./en.json";

const resources = {
  en: { translation: en },
  el: { translation: el satisfies typeof en },
};

export const i18n = createInstance();

/** Initialize bundled translations before mounting React. */
export async function initializeI18n(): Promise<void> {
  i18n.on("languageChanged", (language) => {
    document.documentElement.lang = language === "el" ? "el" : "en";
  });

  await i18n.use(initReactI18next).init({
    resources,
    lng: navigator.language.toLowerCase().startsWith("el") ? "el" : "en",
    fallbackLng: "en",
    supportedLngs: ["en", "el"],
    initAsync: false,
    interpolation: { escapeValue: false },
  });
}

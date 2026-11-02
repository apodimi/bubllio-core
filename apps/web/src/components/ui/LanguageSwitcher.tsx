import { ToggleButton, ToggleButtonGroup } from "@mui/material";
import { useTranslation } from "react-i18next";

import type { Locale } from "../../../locales";

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={i18n.resolvedLanguage}
      onChange={(_, locale: Locale | null) => {
        if (locale) {
          void i18n.changeLanguage(locale);
        }
      }}
      aria-label="Language"
    >
      <ToggleButton value="el" aria-label="Ελληνικά">
        ΕΛ
      </ToggleButton>
      <ToggleButton value="en" aria-label="English">
        EN
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

import { alpha, darken } from "@mui/material/styles";
import { brand } from "./brand";

export const palette = {
  primary: {
    main: brand.colors.primary,
    light: brand.colors.lightBlue,
    dark: darken(brand.colors.primary, 0.35),
  },
  secondary: { main: brand.colors.secondary },
  background: {
    default: brand.colors.background,
    paper: brand.colors.surface,
  },
  text: {
    primary: brand.colors.text,
    secondary: alpha(brand.colors.text, 0.72),
  },
  divider: alpha(brand.colors.text, 0.12),
  action: {
    hover: alpha(brand.colors.primary, 0.06),
    selected: brand.colors.lightBlue,
    focus: alpha(brand.colors.primary, 0.16),
  },
};

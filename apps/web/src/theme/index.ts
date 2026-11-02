import { alpha, createTheme } from "@mui/material/styles";
import type { Theme } from "@mui/material/styles";
import { brand } from "./brand";
import { palette } from "./palette";
import { typography } from "./typography";

const baseTheme = createTheme({
  palette,
  typography,
  motion: { reducedMotion: "system" },
  shape: { borderRadius: brand.shape.borderRadius },
  shadows: [
    "none",
    `0 2px 8px ${alpha(brand.colors.text, 0.05)}`,
    `0 6px 20px ${alpha(brand.colors.text, 0.07)}`,
    `0 10px 32px ${alpha(brand.colors.text, 0.08)}`,
    `0 16px 44px ${alpha(brand.colors.text, 0.09)}`,
    ...Array(20).fill(`0 18px 54px ${alpha(brand.colors.text, 0.11)}`),
  ] as Theme["shadows"],
});

export const theme = createTheme(baseTheme, {
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ":root": { fontSynthesis: "none" },
        "*, *::before, *::after": { boxSizing: "border-box" },
        html: { minWidth: 320 },
        body: {
          margin: 0,
          minWidth: 320,
          backgroundImage: "none",
          WebkitFontSmoothing: "antialiased",
        },
        "::selection": {
          color: brand.colors.text,
          background: alpha(brand.colors.primary, 0.2),
        },
        "@media (pointer: coarse)": {
          "input, textarea, select": { fontSize: 16 },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 38,
          borderRadius: brand.shape.borderRadius,
          paddingInline: 14,
          "&.Mui-focusVisible": {
            outline: `3px solid ${brand.colors.lightBlue}`,
            outlineOffset: 2,
          },
          "@media (pointer: coarse)": { minHeight: 44 },
        },
        contained: { boxShadow: "none" },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: {
          borderColor: baseTheme.palette.divider,
          boxShadow: "none",
          borderRadius: brand.shape.borderRadius,
          overflow: "hidden",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          borderColor: baseTheme.palette.divider,
          borderRadius: brand.shape.borderRadius,
        },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
    MuiInputLabel: {
      defaultProps: { shrink: true },
      styleOverrides: {
        root: {
          position: "static",
          color: baseTheme.palette.text.secondary,
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.4,
          marginBottom: 6,
          transform: "none",
          "&.MuiInputLabel-shrink": { transform: "none" },
        },
      },
    },
    MuiOutlinedInput: {
      defaultProps: { notched: false },
      styleOverrides: {
        root: {
          backgroundColor: brand.colors.surface,
          borderRadius: brand.shape.borderRadius,
          fontSize: "0.875rem",
          "@media (pointer: coarse)": { fontSize: "1rem", minHeight: 44 },
          "&.Mui-focused": {
            boxShadow: `0 0 0 3px ${alpha(brand.colors.primary, 0.14)}`,
          },
        },
        input: {
          "&.MuiInputBase-inputSizeSmall": { paddingTop: 8, paddingBottom: 8 },
        },
        notchedOutline: { borderColor: alpha(brand.colors.text, 0.16) },
      },
    },
  },
});

export { brand };

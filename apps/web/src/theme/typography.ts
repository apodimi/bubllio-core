import { brand } from "./brand";

export const typography = {
  fontFamily: brand.typography.body,
  fontSize: 14,
  h1: {
    fontFamily: brand.typography.display,
    fontSize: "2rem",
    fontWeight: 700,
    lineHeight: 1.25,
    letterSpacing: "-.025em",
  },
  h2: {
    fontFamily: brand.typography.display,
    fontSize: "1.5rem",
    fontWeight: 700,
    lineHeight: 1.3,
    letterSpacing: "-.025em",
  },
  h3: {
    fontFamily: brand.typography.display,
    fontSize: "1.375rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-.025em",
  },
  h4: {
    fontFamily: brand.typography.display,
    fontSize: "1.25rem",
    fontWeight: 700,
    lineHeight: 1.2,
    letterSpacing: "-.02em",
  },
  h5: {
    fontFamily: brand.typography.display,
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  h6: {
    fontFamily: brand.typography.display,
    fontSize: "1rem",
    fontWeight: 600,
    lineHeight: 1.4,
  },
  subtitle1: { fontFamily: brand.typography.display },
  subtitle2: { fontFamily: brand.typography.display },
  body1: { lineHeight: 1.5 },
  body2: { lineHeight: 1.45 },
  button: {
    fontFamily: brand.typography.display,
    textTransform: "none",
    fontWeight: 600,
    letterSpacing: 0,
  },
  overline: { fontFamily: brand.typography.display, fontWeight: 700 },
  allVariants: { textWrap: "pretty" },
};

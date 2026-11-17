import { describe, expect, it } from "vitest";

// WCAG relative luminance and contrast ratio calculator
function relativeLuminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = relativeLuminance(hex1);
  const l2 = relativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("Theme System & Color Contrast Compliance (WCAG 2.1 AA / AAA)", () => {
  const DARK_THEME = {
    background: "#0A0A0B",
    surface: "#16171A",
    textPrimary: "#FFFFFF",
    textSecondary: "#9AA0A6",
    cyan: "#00E5FF",
    red: "#FF1F2E",
    btnActionText: "#0A0A0B",
  };

  const LIGHT_THEME = {
    background: "#F8F9FA",
    surface: "#FFFFFF",
    textPrimary: "#0A0A0B",
    textSecondary: "#4A5056",
    cyan: "#007C8A",
    red: "#E0101F",
    btnActionText: "#FFFFFF",
  };

  it("verifies Dark Theme primary text passes WCAG AAA on background and surface", () => {
    const bgContrast = contrastRatio(DARK_THEME.textPrimary, DARK_THEME.background);
    const surfaceContrast = contrastRatio(DARK_THEME.textPrimary, DARK_THEME.surface);
    expect(bgContrast).toBeGreaterThan(15); // > 19:1
    expect(surfaceContrast).toBeGreaterThan(14);
  });

  it("verifies Dark Theme secondary text passes WCAG AA on background", () => {
    const secondaryContrast = contrastRatio(DARK_THEME.textSecondary, DARK_THEME.background);
    expect(secondaryContrast).toBeGreaterThanOrEqual(4.5); // ~ 7.49:1
  });

  it("verifies Dark Theme action buttons pass WCAG AA contrast", () => {
    const redBtnContrast = contrastRatio(DARK_THEME.btnActionText, DARK_THEME.red);
    const cyanBtnContrast = contrastRatio(DARK_THEME.btnActionText, DARK_THEME.cyan);
    expect(redBtnContrast).toBeGreaterThanOrEqual(4.5); // 5.17:1
    expect(cyanBtnContrast).toBeGreaterThanOrEqual(7.0); // 12.86:1 (AAA)
  });

  it("verifies Light Theme primary text passes WCAG AAA on background and surface", () => {
    const bgContrast = contrastRatio(LIGHT_THEME.textPrimary, LIGHT_THEME.background);
    const surfaceContrast = contrastRatio(LIGHT_THEME.textPrimary, LIGHT_THEME.surface);
    expect(bgContrast).toBeGreaterThan(15); // ~ 18.8:1
    expect(surfaceContrast).toBeGreaterThan(15); // ~ 19.8:1
  });

  it("verifies Light Theme secondary text passes WCAG AA on background and surface", () => {
    const bgContrast = contrastRatio(LIGHT_THEME.textSecondary, LIGHT_THEME.background);
    const surfaceContrast = contrastRatio(LIGHT_THEME.textSecondary, LIGHT_THEME.surface);
    expect(bgContrast).toBeGreaterThanOrEqual(4.5); // ~ 7.74:1
    expect(surfaceContrast).toBeGreaterThanOrEqual(4.5); // ~ 8.16:1
  });

  it("verifies Light Theme action buttons pass WCAG AA contrast with white text", () => {
    const redBtnContrast = contrastRatio(LIGHT_THEME.btnActionText, LIGHT_THEME.red);
    const cyanBtnContrast = contrastRatio(LIGHT_THEME.btnActionText, LIGHT_THEME.cyan);
    expect(redBtnContrast).toBeGreaterThanOrEqual(4.5); // 4.93:1
    expect(cyanBtnContrast).toBeGreaterThanOrEqual(4.5); // 4.94:1
  });
});

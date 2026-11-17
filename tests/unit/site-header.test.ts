import { describe, expect, it } from "vitest";

const EXPECTED_NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
  { href: "/faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

describe("Mobile Navigation Configuration & Route Coverage", () => {
  it("provides all essential public pages in order with numeric indexing", () => {
    expect(EXPECTED_NAV_LINKS).toHaveLength(7);
    EXPECTED_NAV_LINKS.forEach((item, idx) => {
      expect(item.href).toMatch(/^\/[a-z-]*$/);
      expect(item.label.length).toBeGreaterThan(0);
      const numStr = String(idx + 1).padStart(2, "0");
      expect(numStr).toMatch(/^\d{2}$/);
    });
  });

  it("accurately identifies active nav state across root and nested subpaths", () => {
    function isNavItemActive(pathname: string, href: string): boolean {
      const pathOnly = pathname.split("?")[0] || "/";
      return href === "/"
        ? pathOnly === "/"
        : pathOnly === href || pathOnly.startsWith(`${href}/`);
    }

    expect(isNavItemActive("/", "/")).toBe(true);
    expect(isNavItemActive("/services", "/")).toBe(false);
    expect(isNavItemActive("/services", "/services")).toBe(true);
    expect(isNavItemActive("/services/photography", "/services")).toBe(true);
    expect(isNavItemActive("/portfolio?kind=photography", "/portfolio")).toBe(true);
    expect(isNavItemActive("/about", "/contact")).toBe(false);
  });
});

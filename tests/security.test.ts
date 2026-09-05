import { describe, it, expect } from "vitest";
import { sanitizeSvg } from "../app/services/brand-interaction/security";

describe("sanitizeSvg", () => {
  it("allows clean SVG", () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#000"/></svg>';
    expect(sanitizeSvg(svg)).not.toBeNull();
  });

  it("strips HTML comments", () => {
    const svg = '<svg><!-- comment --><circle cx="12" cy="12" r="10"/></svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toBeNull();
    expect(result).not.toContain("<!--");
  });

  it("rejects SVG with script tags", () => {
    const svg = '<svg><script>alert("xss")</script></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with event handlers", () => {
    const svg = '<svg onload="alert(1)"><circle cx="12" cy="12" r="10"/></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with javascript: URIs", () => {
    const svg = '<svg><a href="javascript:alert(1)"><circle/></a></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with data:text/html", () => {
    const svg = '<svg><image href="data:text/html,<script>alert(1)</script>"/></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with foreignObject", () => {
    const svg = '<svg><foreignObject><body xmlns="http://www.w3.org/1999/xhtml"><script>alert(1)</script></body></foreignObject></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with external xlink:href", () => {
    const svg = '<svg><use xlink:href="https://evil.com/exploit.svg#icon"/></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects oversized SVG (>100KB)", () => {
    const svg = '<svg>' + "x".repeat(100_001) + '</svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects non-SVG content", () => {
    expect(sanitizeSvg('<html><body>hello</body></html>')).toBeNull();
    expect(sanitizeSvg('{"type":"not-svg"}')).toBeNull();
    expect(sanitizeSvg('')).toBeNull();
  });

  it("allows SVG with safe inline styles", () => {
    const svg = '<svg><rect width="10" height="10" style="fill: #ff0000;"/></svg>';
    expect(sanitizeSvg(svg)).not.toBeNull();
  });

  it("rejects SVG with onclick handler", () => {
    const svg = '<svg><rect onclick="alert(1)" width="10" height="10"/></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });

  it("rejects SVG with onmouseover handler", () => {
    const svg = '<svg><rect onmouseover="alert(1)" width="10" height="10"/></svg>';
    expect(sanitizeSvg(svg)).toBeNull();
  });
});

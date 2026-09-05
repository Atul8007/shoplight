const SVG_DANGEROUS_PATTERNS = [/<script[\s>]/i, /\son[a-z]+\s*=/i, /javascript:/i, /data:text\/html/i, /<foreignObject[\s>]/i, /\bxlink:href\s*=\s*["']https?:/i];
export function sanitizeSvg(svg: string): string | null {
  if (svg.length > 100_000) return null;
  if (!svg.trim().startsWith("<svg")) return null;
  if (SVG_DANGEROUS_PATTERNS.some((pattern) => pattern.test(svg))) return null;
  return svg.replace(/<!--[\s\S]*?-->/g, "").trim();
}


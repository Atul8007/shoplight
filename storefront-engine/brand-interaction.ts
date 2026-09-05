/**
 * Brand Interaction Engine — Storefront Runtime
 *
 * Zero-dependency, pure Vanilla TypeScript runtime injected via Shopify Theme App Embed.
 * Target: < 30 KB compressed.
 *
 * Architecture:
 *   PointerInteractionEngine → CursorEngine → RuleEngine → ElementDetector
 *
 * This file is compiled to a single JS bundle and placed in
 * extensions/brand-interaction/assets/brand-interaction.js
 */

// ── Types ────────────────────────────────────────────────────────────

interface CursorConfig {
  type: string;
  size: number;
  color: string;
  opacity: number;
  blendMode: string;
  imageUrl?: string;
  svgMarkup?: string;
  emoji?: string;
}

interface MotionConfig {
  trail: boolean;
  trailLength: number;
  magnetic: boolean;
  intensity: number;
}

interface HoverConfig {
  enabled: boolean;
  scale: number;
  label?: string;
}

interface ClickConfig {
  effect: string;
}

interface RuleCondition {
  type: string;
  target?: string;
  pageType?: string;
  productId?: string;
  collectionId?: string;
  device?: string;
  enabled?: boolean;
}

interface RuleAction {
  type: string;
  cursor?: string;
  label?: string;
  scale?: number;
  effect?: string;
  color?: string;
  durationMs?: number;
  count?: number;
  intensity?: number;
  length?: number;
}

interface ExperienceRule {
  name: string;
  priority: number;
  condition: RuleCondition;
  action: RuleAction;
  enabled: boolean;
}

interface ExperienceConfig {
  schemaVersion: number;
  enabled: boolean;
  analyticsEnabled: boolean;
  reduceMotion: boolean;
  cursor: CursorConfig;
  motion: MotionConfig;
  hover: HoverConfig;
  click: ClickConfig;
  rules: ExperienceRule[];
}

interface StorefrontResponse {
  enabled: boolean;
  version?: number;
  configuration?: ExperienceConfig;
}

// ── Cursor State Machine ─────────────────────────────────────────────

type CursorState = "DEFAULT" | "HOVER" | "CLICK" | "LOADING" | "SUCCESS" | "ERROR";

// ── Element Detector ─────────────────────────────────────────────────

const ELEMENT_SELECTORS: Record<string, string[]> = {
  PRODUCT_IMAGE: [
    '[data-media-type="image"]',
    ".product__media img",
    ".product-media img",
    ".product-single__photo",
    ".product-featured-media",
    'img[src*="products/"]',
  ],
  PRODUCT_CARD: [
    ".product-card",
    ".card--product",
    ".product-grid-item",
    ".grid-product",
    '[data-product-card]',
    ".collection-product-card",
  ],
  ADD_TO_CART: [
    'button[name="add"]',
    '[data-add-to-cart]',
    ".product-form__submit",
    ".add-to-cart",
    'form[action*="/cart/add"] button[type="submit"]',
    ".btn-addtocart",
    'button[data-action="add-to-cart"]',
  ],
  WISHLIST: [
    ".wishlist-btn",
    '[data-wishlist]',
    ".wishlist-button",
    'button[aria-label*="wishlist" i]',
    'button[aria-label*="favorite" i]',
    ".swym-button",
  ],
  BUTTON: [
    "button:not([data-add-to-cart]):not([name='add'])",
    'a.btn, a.button, a[role="button"]',
  ],
  LINK: [
    "a[href]:not(.btn):not(.button):not([role='button'])",
  ],
  CART: [
    'a[href="/cart"]',
    ".cart-icon",
    '[data-cart-toggle]',
    ".header__icon--cart",
  ],
  SEARCH: [
    'input[type="search"]',
    '[data-search]',
    ".search-bar input",
    'a[href="/search"]',
  ],
};

function detectElementType(el: Element): string | null {
  for (const [type, selectors] of Object.entries(ELEMENT_SELECTORS)) {
    for (const selector of selectors) {
      try {
        if (el.matches(selector) || el.closest(selector)) {
          return type;
        }
      } catch {
        // Invalid selector, skip
      }
    }
  }
  return null;
}

// ── Page Type Detection ──────────────────────────────────────────────

function detectPageType(): string {
  const path = window.location.pathname;
  if (path === "/" || path === "") return "home";
  if (path.includes("/products/")) return "product";
  if (path.includes("/collections/")) return "collection";
  if (path.includes("/cart")) return "cart";
  if (path.includes("/search")) return "search";
  return "page";
}

// ── Device Detection ─────────────────────────────────────────────────

function detectDevice(): string {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

function hasHoverCapability(): boolean {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ── Rule Engine ──────────────────────────────────────────────────────

function matchCondition(condition: RuleCondition, context: {
  elementType: string | null;
  pageType: string;
  device: string;
  reducedMotion: boolean;
}): boolean {
  switch (condition.type) {
    case "element":
      return context.elementType === condition.target;
    case "page":
      return context.pageType === condition.pageType;
    case "device":
      return context.device === condition.device;
    case "reduced_motion":
      return context.reducedMotion === condition.enabled;
    default:
      return false;
  }
}

function evaluateRules(rules: ExperienceRule[], context: {
  elementType: string | null;
  pageType: string;
  device: string;
  reducedMotion: boolean;
}): RuleAction | null {
  const matched = rules
    .filter((r) => r.enabled && matchCondition(r.condition, context))
    .sort((a, b) => b.priority - a.priority);

  return matched.length > 0 ? matched[0].action : null;
}

// ── Cursor Renderer ──────────────────────────────────────────────────

class CursorRenderer {
  private el: HTMLElement;
  private labelEl: HTMLElement | null = null;
  private trailEls: HTMLElement[] = [];
  private config: CursorConfig;
  private state: CursorState = "DEFAULT";
  private x = 0;
  private y = 0;
  private trailPositions: { x: number; y: number }[] = [];
  private rafId: number | null = null;
  private destroyed = false;

  constructor(config: CursorConfig) {
    this.config = config;
    this.el = document.createElement("div");
    this.el.id = "bi-cursor";
    this.el.setAttribute("aria-hidden", "true");
    this.applyStyles();
    document.body.appendChild(this.el);
  }

  private applyStyles(): void {
    const s = this.el.style;
    s.position = "fixed";
    s.top = "0";
    s.left = "0";
    s.pointerEvents = "none";
    s.zIndex = "2147483647";
    s.willChange = "transform";
    s.transition = "width 0.15s ease, height 0.15s ease, border-color 0.15s ease, background-color 0.15s ease";

    this.renderCursorType();
  }

  private renderCursorType(): void {
    const { type, size, color, opacity, blendMode } = this.config;
    const s = this.el.style;
    s.opacity = String(opacity);
    s.mixBlendMode = blendMode;
    s.width = `${size}px`;
    s.height = `${size}px`;
    this.el.textContent = "";

    switch (type) {
      case "dot":
        s.borderRadius = "50%";
        s.backgroundColor = color;
        s.border = "none";
        break;
      case "ring":
        s.borderRadius = "50%";
        s.backgroundColor = "transparent";
        s.border = `2px solid ${color}`;
        break;
      case "crosshair": {
        s.backgroundColor = "transparent";
        s.borderRadius = "0";
        s.border = "none";
        const v = document.createElement("div");
        v.style.cssText = `position:absolute;left:50%;top:0;width:1.5px;height:100%;background:${color};transform:translateX(-50%)`;
        const h = document.createElement("div");
        h.style.cssText = `position:absolute;top:50%;left:0;width:100%;height:1.5px;background:${color};transform:translateY(-50%)`;
        this.el.style.position = "fixed";
        this.el.appendChild(v);
        this.el.appendChild(h);
        break;
      }
      case "emoji":
        s.backgroundColor = "transparent";
        s.border = "none";
        s.borderRadius = "0";
        s.fontSize = `${size * 0.8}px`;
        s.lineHeight = `${size}px`;
        s.textAlign = "center";
        this.el.textContent = this.config.emoji || "✨";
        break;
      case "image":
        if (this.config.imageUrl) {
          s.backgroundColor = "transparent";
          s.border = "none";
          s.borderRadius = "0";
          s.backgroundImage = `url(${this.config.imageUrl})`;
          s.backgroundSize = "contain";
          s.backgroundRepeat = "no-repeat";
          s.backgroundPosition = "center";
        } else {
          s.borderRadius = "50%";
          s.backgroundColor = color;
        }
        break;
      case "svg":
        if (this.config.svgMarkup) {
          s.backgroundColor = "transparent";
          s.border = "none";
          s.borderRadius = "0";
          this.el.innerHTML = this.config.svgMarkup;
        } else {
          s.borderRadius = "50%";
          s.backgroundColor = color;
        }
        break;
      default:
        s.borderRadius = "50%";
        s.backgroundColor = color;
        break;
    }
  }

  updatePosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  setState(state: CursorState, config?: Partial<CursorConfig>): void {
    this.state = state;
    if (config) {
      Object.assign(this.config, config);
      this.renderCursorType();
    }

    // State-based size transitions
    switch (state) {
      case "HOVER":
        this.el.style.transform = `translate3d(${this.x - this.config.size / 2}px, ${this.y - this.config.size / 2}px, 0) scale(1.3)`;
        return;
      case "CLICK":
        this.el.style.transform = `translate3d(${this.x - this.config.size / 2}px, ${this.y - this.config.size / 2}px, 0) scale(0.85)`;
        return;
    }
  }

  showLabel(text: string): void {
    if (!this.labelEl) {
      this.labelEl = document.createElement("div");
      this.labelEl.id = "bi-cursor-label";
      this.labelEl.setAttribute("aria-hidden", "true");
      const ls = this.labelEl.style;
      ls.position = "fixed";
      ls.pointerEvents = "none";
      ls.zIndex = "2147483646";
      ls.fontSize = "11px";
      ls.fontFamily = "-apple-system, BlinkMacSystemFont, sans-serif";
      ls.color = "#fff";
      ls.backgroundColor = "rgba(0,0,0,0.75)";
      ls.padding = "2px 8px";
      ls.borderRadius = "4px";
      ls.whiteSpace = "nowrap";
      ls.willChange = "transform";
      ls.transition = "opacity 0.15s ease";
      document.body.appendChild(this.labelEl);
    }
    this.labelEl.textContent = text;
    this.labelEl.style.opacity = "1";
  }

  hideLabel(): void {
    if (this.labelEl) {
      this.labelEl.style.opacity = "0";
    }
  }

  // Trail management
  enableTrail(length: number): void {
    this.disableTrail();
    for (let i = 0; i < length; i++) {
      const trail = document.createElement("div");
      trail.className = "bi-trail";
      trail.setAttribute("aria-hidden", "true");
      const ts = trail.style;
      ts.position = "fixed";
      ts.pointerEvents = "none";
      ts.zIndex = "2147483645";
      ts.willChange = "transform";
      ts.borderRadius = "50%";
      const scale = 1 - (i + 1) * (0.6 / length);
      const trailSize = this.config.size * scale;
      ts.width = `${trailSize}px`;
      ts.height = `${trailSize}px`;
      ts.backgroundColor = this.config.color;
      ts.opacity = String(this.config.opacity * (1 - (i + 1) / (length + 1)));
      document.body.appendChild(trail);
      this.trailEls.push(trail);
    }
    this.trailPositions = Array(length).fill({ x: this.x, y: this.y });
  }

  disableTrail(): void {
    this.trailEls.forEach((el) => el.remove());
    this.trailEls = [];
    this.trailPositions = [];
  }

  // Render loop driven by RAF
  render(): void {
    if (this.destroyed) return;

    const halfSize = this.config.size / 2;
    if (this.state !== "HOVER" && this.state !== "CLICK") {
      this.el.style.transform = `translate3d(${this.x - halfSize}px, ${this.y - halfSize}px, 0)`;
    }

    // Label position
    if (this.labelEl) {
      this.labelEl.style.transform = `translate3d(${this.x + halfSize + 8}px, ${this.y - 8}px, 0)`;
    }

    // Trail rendering
    if (this.trailEls.length > 0) {
      this.trailPositions.unshift({ x: this.x, y: this.y });
      this.trailPositions.length = this.trailEls.length;
      for (let i = 0; i < this.trailEls.length; i++) {
        const pos = this.trailPositions[i];
        if (pos) {
          const trailSize = parseFloat(this.trailEls[i].style.width);
          this.trailEls[i].style.transform = `translate3d(${pos.x - trailSize / 2}px, ${pos.y - trailSize / 2}px, 0)`;
        }
      }
    }

    this.rafId = requestAnimationFrame(() => this.render());
  }

  startRenderLoop(): void {
    if (this.rafId === null) {
      this.render();
    }
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.el.remove();
    this.labelEl?.remove();
    this.disableTrail();
  }
}

// ── Click Effect Renderer ────────────────────────────────────────────

function playRipple(x: number, y: number, color: string, durationMs = 400): void {
  const ripple = document.createElement("div");
  ripple.setAttribute("aria-hidden", "true");
  const rs = ripple.style;
  rs.position = "fixed";
  rs.left = `${x}px`;
  rs.top = `${y}px`;
  rs.width = "0";
  rs.height = "0";
  rs.borderRadius = "50%";
  rs.border = `2px solid ${color}`;
  rs.transform = "translate(-50%, -50%)";
  rs.pointerEvents = "none";
  rs.zIndex = "2147483644";
  rs.opacity = "1";
  rs.transition = `width ${durationMs}ms ease-out, height ${durationMs}ms ease-out, opacity ${durationMs}ms ease-out`;
  document.body.appendChild(ripple);

  requestAnimationFrame(() => {
    rs.width = "60px";
    rs.height = "60px";
    rs.opacity = "0";
  });

  setTimeout(() => ripple.remove(), durationMs + 50);
}

function playParticles(x: number, y: number, color: string, count = 8): void {
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.setAttribute("aria-hidden", "true");
    const ps = p.style;
    const angle = (Math.PI * 2 * i) / count;
    const distance = 20 + Math.random() * 20;
    ps.position = "fixed";
    ps.left = `${x}px`;
    ps.top = `${y}px`;
    ps.width = "4px";
    ps.height = "4px";
    ps.borderRadius = "50%";
    ps.backgroundColor = color;
    ps.pointerEvents = "none";
    ps.zIndex = "2147483644";
    ps.transition = "transform 0.4s ease-out, opacity 0.4s ease-out";
    ps.transform = "translate(-50%, -50%)";
    document.body.appendChild(p);

    requestAnimationFrame(() => {
      ps.transform = `translate(${Math.cos(angle) * distance - 2}px, ${Math.sin(angle) * distance - 2}px)`;
      ps.opacity = "0";
    });

    setTimeout(() => p.remove(), 500);
  }
}

// ── Analytics Collector ──────────────────────────────────────────────

class AnalyticsCollector {
  private events: Array<{
    eventType: string;
    pageType?: string;
    elementType?: string;
    metadata?: Record<string, unknown>;
    occurredAt: string;
  }> = [];
  private sessionId: string;
  private experienceId: string;
  private shopDomain: string;
  private appUrl: string;
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private enabled: boolean;

  constructor(shopDomain: string, appUrl: string, experienceId: string, enabled: boolean) {
    this.shopDomain = shopDomain;
    this.appUrl = appUrl;
    this.experienceId = experienceId;
    this.enabled = enabled;
    this.sessionId = this.generateSessionId();

    if (enabled) {
      this.scheduleFlush();
    }
  }

  private generateSessionId(): string {
    return "bi_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 8);
  }

  track(eventType: string, extra?: { pageType?: string; elementType?: string; metadata?: Record<string, unknown> }): void {
    if (!this.enabled) return;
    this.events.push({
      eventType,
      pageType: extra?.pageType,
      elementType: extra?.elementType,
      metadata: extra?.metadata,
      occurredAt: new Date().toISOString(),
    });

    // Auto-flush if we hit 50 events
    if (this.events.length >= 50) {
      this.flush();
    }
  }

  private scheduleFlush(): void {
    this.flushTimer = setInterval(() => this.flush(), 30000);
  }

  private flush(): void {
    if (this.events.length === 0) return;
    const batch = this.events.splice(0);

    const payload = {
      shopDomain: this.shopDomain,
      sessionId: this.sessionId,
      experienceId: this.experienceId,
      events: batch,
      deviceType: detectDevice(),
    };

    try {
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${this.appUrl}/analytics/events`,
          JSON.stringify(payload),
        );
      } else {
        fetch(`${this.appUrl}/analytics/events`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {/* fail silently */});
      }
    } catch {
      // Fail silently
    }
  }

  destroy(): void {
    if (this.flushTimer) clearInterval(this.flushTimer);
    this.flush(); // Send remaining events
  }
}

// ── Main Engine ──────────────────────────────────────────────────────

class BrandInteractionEngine {
  private config: ExperienceConfig | null = null;
  private renderer: CursorRenderer | null = null;
  private analytics: AnalyticsCollector | null = null;
  private shopDomain: string;
  private appUrl: string;
  private currentState: CursorState = "DEFAULT";
  private elementCache = new WeakMap<Element, string | null>();
  private observers: MutationObserver[] = [];
  private listeners: Array<{ target: EventTarget; type: string; handler: EventListener }> = [];
  private destroyed = false;

  constructor(shopDomain: string, appUrl: string) {
    this.shopDomain = shopDomain;
    this.appUrl = appUrl;
  }

  async initialize(): Promise<void> {
    try {
      // Don't activate on touch-only devices
      if (!hasHoverCapability()) {
        return;
      }

      const response = await fetch(`${this.appUrl}/storefront/config?shop=${encodeURIComponent(this.shopDomain)}`, {
        cache: "default",
      });

      if (!response.ok) return;

      const data: StorefrontResponse = await response.json();
      if (!data.enabled || !data.configuration) return;

      this.config = data.configuration;
      if (!this.config.enabled) return;

      // Check reduced motion
      const shouldReduceMotion = this.config.reduceMotion || prefersReducedMotion();

      // Initialize cursor renderer
      this.renderer = new CursorRenderer(this.config.cursor);
      this.renderer.startRenderLoop();

      // Initialize trail (if enabled and motion not reduced)
      if (this.config.motion.trail && !shouldReduceMotion && this.config.motion.trailLength > 0) {
        this.renderer.enableTrail(this.config.motion.trailLength);
      }

      // Initialize analytics
      this.analytics = new AnalyticsCollector(
        this.shopDomain,
        this.appUrl,
        "", // experienceId from response not needed in simplified version
        this.config.analyticsEnabled,
      );
      this.analytics.track("experience_loaded", { pageType: detectPageType() });

      // Attach event listeners
      this.attachListeners(shouldReduceMotion);

      // Watch for DOM changes (AJAX cart, section rendering)
      this.attachMutationObserver();

    } catch (error) {
      // FAIL OPEN — destroy partial state and restore normal cursor
      console.warn("[BrandInteraction] Initialization failed, falling back to default cursor:", error);
      this.destroy();
    }
  }

  private attachListeners(reducedMotion: boolean): void {
    if (!this.config || !this.renderer) return;

    let hasMovedMouse = false;

    const hideDefaultCursor = () => {
      if (!document.getElementById("bi-cursor-hide")) {
        const style = document.createElement("style");
        style.id = "bi-cursor-hide";
        style.textContent = "html, body, a, button, input, select, textarea { cursor: none !important; }";
        document.head.appendChild(style);
      }
    };

    const restoreDefaultCursor = () => {
      document.getElementById("bi-cursor-hide")?.remove();
    };

    // Mouse movement — only hide native cursor once mouse starts moving
    const onMouseMove = (e: MouseEvent) => {
      if (!hasMovedMouse) {
        hasMovedMouse = true;
        hideDefaultCursor();
      }
      this.renderer!.updatePosition(e.clientX, e.clientY);
    };
    this.addListener(document, "mousemove", onMouseMove as EventListener, { passive: true });

    // Restore native cursor when mouse leaves browser window
    this.addListener(document, "mouseleave", restoreDefaultCursor as EventListener, { passive: true });
    this.addListener(document, "mouseenter", (() => {
      if (hasMovedMouse) hideDefaultCursor();
    }) as EventListener, { passive: true });

    // Mouse enter — evaluate rules
    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !this.config) return;

      // Resolve element type (cached)
      let elementType = this.elementCache.get(target);
      if (elementType === undefined) {
        elementType = detectElementType(target);
        this.elementCache.set(target, elementType);
      }

      if (!elementType) return;

      const context = {
        elementType,
        pageType: detectPageType(),
        device: detectDevice(),
        reducedMotion,
      };

      const action = evaluateRules(this.config.rules, context);

      if (action) {
        this.executeAction(action, reducedMotion);
        this.analytics?.track("element_hover", { pageType: context.pageType, elementType });
      }
    };
    this.addListener(document, "mouseover", onMouseOver as EventListener, { passive: true });

    // Mouse leave — reset to default
    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target) return;

      const elementType = this.elementCache.get(target);
      if (elementType) {
        this.resetToDefault();
      }
    };
    this.addListener(document, "mouseout", onMouseOut as EventListener, { passive: true });

    // Click — play effect
    const onClick = (e: MouseEvent) => {
      if (!this.config) return;

      this.renderer!.setState("CLICK");
      setTimeout(() => {
        if (!this.destroyed) this.renderer!.setState("DEFAULT");
      }, 150);

      // Click effect
      if (this.config.click.effect !== "none" && !reducedMotion) {
        if (this.config.click.effect === "ripple") {
          playRipple(e.clientX, e.clientY, this.config.cursor.color);
        } else if (this.config.click.effect === "particle") {
          playParticles(e.clientX, e.clientY, this.config.cursor.color);
        }
      }

      const target = e.target as Element;
      const elementType = this.elementCache.get(target) ?? detectElementType(target);
      this.analytics?.track("element_click", {
        pageType: detectPageType(),
        elementType: elementType ?? undefined,
      });
    };
    this.addListener(document, "click", onClick as EventListener, { passive: true });

    // Visibility change — pause/resume
    const onVisibilityChange = () => {
      if (document.hidden) {
        this.renderer?.hideLabel();
      }
    };
    this.addListener(document, "visibilitychange", onVisibilityChange as EventListener);
  }

  private addListener(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options);
    this.listeners.push({ target, type, handler });
  }

  private executeAction(action: RuleAction, reducedMotion: boolean): void {
    if (!this.renderer || !this.config) return;

    switch (action.type) {
      case "CHANGE_CURSOR":
        this.renderer.setState("HOVER", {
          type: action.cursor || this.config.cursor.type,
        });
        if (action.label) {
          this.renderer.showLabel(action.label);
        }
        break;
      case "SCALE":
        this.renderer.setState("HOVER");
        break;
      case "SHOW_LABEL":
        this.renderer.setState("HOVER");
        if (action.label) {
          this.renderer.showLabel(action.label);
        }
        break;
      case "RIPPLE":
        // Ripple happens on click, not hover
        break;
      case "MAGNETIC":
        // Magnetic effect handled in mousemove (simplified)
        break;
      case "DISABLE_TRAIL":
        this.renderer.disableTrail();
        break;
      case "ENABLE_TRAIL":
        if (!reducedMotion) {
          this.renderer.enableTrail(action.length || 5);
        }
        break;
    }
  }

  private resetToDefault(): void {
    if (!this.renderer || !this.config) return;
    this.currentState = "DEFAULT";
    this.renderer.setState("DEFAULT", this.config.cursor);
    this.renderer.hideLabel();
  }

  private attachMutationObserver(): void {
    // Minimal MutationObserver — only watch for structural changes
    // to invalidate element cache for dynamic themes (AJAX cart, etc.)
    const observer = new MutationObserver((mutations) => {
      let hasStructuralChange = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0) {
          hasStructuralChange = true;
          break;
        }
      }
      if (hasStructuralChange) {
        // Element cache uses WeakMap, so removed elements are GC'd automatically.
        // No explicit invalidation needed.
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.observers.push(observer);
  }

  destroy(): void {
    this.destroyed = true;

    // Remove event listeners
    for (const { target, type, handler } of this.listeners) {
      target.removeEventListener(type, handler);
    }
    this.listeners = [];

    // Disconnect observers
    for (const observer of this.observers) {
      observer.disconnect();
    }
    this.observers = [];

    // Destroy renderer
    this.renderer?.destroy();
    this.renderer = null;

    // Destroy analytics
    this.analytics?.destroy();
    this.analytics = null;

    // Restore default cursor
    const cursorStyle = document.getElementById("bi-cursor-hide");
    cursorStyle?.remove();

    // Clear config
    this.config = null;
  }
}

// ── Bootstrap ────────────────────────────────────────────────────────

(function () {
  try {
    // Read bootstrap data from the embed block's script tag
    const script = document.currentScript as HTMLScriptElement | null;
    const shopDomain = script?.dataset.shop || (window as any).Shopify?.shop || "";
    let appUrl = script?.dataset.appUrl || "";

    // Fallback: if appUrl is missing or points to Shopify CDN asset host, use active tunnel URL
    if (!appUrl || appUrl.includes("cdn.shopify.com") || appUrl.includes("shopifycloud.com")) {
      appUrl = (window as any).__biAppUrl || "https://pretty-recorded-epson-cholesterol.trycloudflare.com";
    }

    if (!shopDomain) {
      console.warn("[BrandInteraction] Missing shop domain");
      return;
    }

    const engine = new BrandInteractionEngine(shopDomain, appUrl);

    // Initialize after DOM is ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => engine.initialize());
    } else {
      engine.initialize();
    }

    // Cleanup on page unload
    window.addEventListener("pagehide", () => engine.destroy());

    // Expose destroy for testing/cleanup
    (window as any).__biEngine = engine;
  } catch (error) {
    // FAIL OPEN — never crash the storefront
    console.warn("[BrandInteraction] Bootstrap failed:", error);
  }
})();

/*
 * BentoVault — personalización estética extrema para Obsidian.
 * JavaScript plano (CommonJS), sin paso de compilación.
 * Autor: Daniel. Coautores: Claude (Anthropic) y ChatGPT (OpenAI).
 * Licencia MIT.
 */
"use strict";

const obsidian = require("obsidian");
const { Plugin, PluginSettingTab, Setting, Modal, Notice, debounce } = obsidian;

/* =========================================================
   Utilidades de color
   ========================================================= */
function normHex(v) {
  if (typeof v !== "string") return null;
  v = v.trim().toLowerCase();
  if (!v.startsWith("#")) v = "#" + v;
  if (/^#[0-9a-f]{3}$/.test(v)) v = "#" + v.slice(1).split("").map((x) => x + x).join("");
  return /^#[0-9a-f]{6}$/.test(v) ? v : null;
}
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  const c = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0");
  return "#" + c(r) + c(g) + c(b);
}
/** Mezcla a → b con proporción t (0 = a, 1 = b). */
function mix(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
function rgba(h, a) {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(a * 1000) / 1000})`;
}
function rgbList(h) {
  return hexToRgb(h).join(", ");
}
function hexToHsl(h) {
  let [r, g, b] = hexToRgb(h).map((x) => x / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return [Math.round(hue), Math.round(s * 1000) / 10, Math.round(l * 1000) / 10];
}
function luminance(h) {
  const [r, g, b] = hexToRgb(h).map((x) => {
    x /= 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function isLight(h) {
  return luminance(h) > 0.4;
}
function clone(o) {
  return JSON.parse(JSON.stringify(o));
}

/* =========================================================
   Paletas
   ========================================================= */
/** Deriva una paleta completa a partir del acento y unas superficies base. */
function makeColors(accent, base) {
  const { bg, bg2, border, text } = base;
  const light = isLight(bg);
  return {
    accent,
    h1: accent,
    h2: mix(accent, text, 0.15),
    h3: mix(accent, text, 0.3),
    h4: mix(accent, text, 0.45),
    h5: mix(accent, text, 0.6),
    h6: mix(text, bg, 0.25),
    bgPrimary: bg,
    bgSecondary: bg2,
    sidebar: base.sidebar || bg,
    border,
    text,
    link: light ? mix(accent, "#000000", 0.15) : mix(accent, "#ffffff", 0.25),
    codeBg: bg2,
    codeText: mix(accent, text, 0.55),
    quoteBorder: accent,
    quoteBg: mix(bg, accent, 0.05),
    quoteText: mix(text, bg, 0.15),
    tagBg: mix(bg, accent, 0.16),
    tagText: mix(accent, text, 0.25),
  };
}

const TIDEPOOL_BASE = { bg: "#0a0a0a", bg2: "#121212", border: "#1f1f1f", text: "#f2f2f2" };

const PALETTES = [
  { id: "tidepool", name: "Tidepool Rojo", amoled: false, colors: makeColors("#ff1744", TIDEPOOL_BASE) },
  { id: "amoled", name: "AMOLED Rojo", amoled: true, colors: makeColors("#ff1744", { bg: "#000000", bg2: "#0a0a0a", border: "#1f1f1f", text: "#f2f2f2" }) },
  { id: "carmesi", name: "Carmesí", amoled: false, colors: makeColors("#e0103a", { bg: "#0c0608", bg2: "#160b0e", border: "#2a1418", text: "#f5e9eb" }) },
  { id: "cian", name: "Neón cian", amoled: false, colors: makeColors("#00e5ff", { bg: "#05090b", bg2: "#0b1417", border: "#14262b", text: "#e6fbff" }) },
  { id: "esmeralda", name: "Esmeralda", amoled: false, colors: makeColors("#00e676", { bg: "#050a07", bg2: "#0b150f", border: "#15281c", text: "#e8fff1" }) },
  { id: "ambar", name: "Ámbar", amoled: false, colors: makeColors("#ffab00", { bg: "#0b0905", bg2: "#16120a", border: "#2a2214", text: "#fff6e0" }) },
  { id: "violeta", name: "Violeta", amoled: false, colors: makeColors("#b388ff", { bg: "#08060c", bg2: "#110d18", border: "#221a30", text: "#f1ebff" }) },
  { id: "sakura", name: "Sakura", amoled: false, colors: makeColors("#ff80ab", { bg: "#0c0709", bg2: "#170e12", border: "#2c1a22", text: "#ffeef4" }) },
  { id: "nordico", name: "Nórdico", amoled: false, colors: makeColors("#88c0d0", { bg: "#2e3440", bg2: "#3b4252", border: "#434c5e", text: "#eceff4", sidebar: "#2b303b" }) },
  { id: "monocromo", name: "Monocromo", amoled: true, colors: makeColors("#f2f2f2", { bg: "#000000", bg2: "#0d0d0d", border: "#1f1f1f", text: "#d9d9d9" }) },
  { id: "papel", name: "Papel (claro)", amoled: false, colors: makeColors("#c62828", { bg: "#faf8f5", bg2: "#f0ece6", border: "#ddd6cc", text: "#1d1b19" }) },
];

/* =========================================================
   Ajustes por defecto
   ========================================================= */
const DEFAULT_SETTINGS = {
  enabled: true,
  scope: "both", // both | dark | light
  amoled: true,
  colors: clone(PALETTES[0].colors),

  fontInterface: "",
  fontText: "",
  fontMono: "",
  fontSize: 0, // 0 = no tocar
  lineHeight: 1.5,
  headingWeight: 700,
  headingSizes: [1.802, 1.602, 1.424, 1.266, 1.125, 1.0],

  radius: 8,
  cardRadius: 16,
  cardPadding: 14,
  bentoGap: 12,

  cardOpacity: 0.7,
  mutedOpacity: 0.62,
  selectionOpacity: 0.3,
  glow: 0.35,

  bento: { callouts: true, quotes: true, code: false, tables: false, embeds: true, hover: true },

  previewCollapsed: false,
  presets: {},
};

const COLOR_KEYS = Object.keys(DEFAULT_SETTINGS.colors);
const AMOLED_KEYS = ["bgPrimary", "bgSecondary", "sidebar", "codeBg", "quoteBg"];

const COLOR_LABELS = {
  accent: ["Acento / énfasis", "Botones, selección, casillas, enlaces activos."],
  h1: ["H1", ""], h2: ["H2", ""], h3: ["H3", ""], h4: ["H4", ""], h5: ["H5", ""], h6: ["H6", ""],
  bgPrimary: ["Fondo principal", "Editor, notas y ventanas."],
  bgSecondary: ["Fondo secundario", "Menús, campos, tarjetas bento."],
  sidebar: ["Barra lateral", "Paneles laterales, cinta y barra de pestañas."],
  border: ["Bordes", "Separadores y contornos."],
  text: ["Texto", "El texto atenuado se deriva con la opacidad configurada."],
  link: ["Enlaces", "Internos y externos."],
  codeBg: ["Fondo de código", ""],
  codeText: ["Texto de código", ""],
  quoteBorder: ["Borde de citas", ""],
  quoteBg: ["Fondo de citas", ""],
  quoteText: ["Texto de citas", ""],
  tagBg: ["Fondo de etiquetas", ""],
  tagText: ["Texto de etiquetas", ""],
};

const COLOR_GROUPS = [
  ["Énfasis", ["accent"]],
  ["Títulos", ["h1", "h2", "h3", "h4", "h5", "h6"]],
  ["Fondos", ["bgPrimary", "bgSecondary", "sidebar", "border"]],
  ["Texto y enlaces", ["text", "link"]],
  ["Bloques de código", ["codeBg", "codeText"]],
  ["Citas", ["quoteBorder", "quoteBg", "quoteText"]],
  ["Etiquetas", ["tagBg", "tagText"]],
];

const FONT_SUGGESTIONS = [
  "Noto Sans", "Noto Serif", "Inter", "Cantarell", "DejaVu Sans", "DejaVu Serif", "Ubuntu",
  "Source Sans 3", "Source Serif 4", "IBM Plex Sans", "IBM Plex Serif", "Atkinson Hyperlegible",
  "Georgia", "Times New Roman", "Liberation Serif", "Literata",
  "JetBrains Mono", "Fira Code", "Cascadia Code", "Iosevka", "Noto Sans Mono", "DejaVu Sans Mono",
];

const BODY_CLASSES = {
  callouts: "bv-bento-callouts",
  quotes: "bv-bento-quotes",
  code: "bv-bento-code",
  tables: "bv-bento-tables",
  embeds: "bv-bento-embeds",
  hover: "bv-bento-hover",
};

/* =========================================================
   Saneado de datos (carga e importación)
   ========================================================= */
function num(v, def, min, max) {
  const n = typeof v === "number" ? v : parseFloat(v);
  if (!isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}
function str(v, def) {
  return typeof v === "string" ? v.replace(/[;{}<>]/g, "").slice(0, 200) : def;
}
/** Devuelve una "instantánea" de tema válida (sin presets) a partir de cualquier objeto. */
function sanitizeTheme(src) {
  const d = DEFAULT_SETTINGS;
  const o = src && typeof src === "object" ? src : {};
  const colors = {};
  const oc = o.colors && typeof o.colors === "object" ? o.colors : {};
  for (const k of COLOR_KEYS) colors[k] = normHex(oc[k]) || d.colors[k];
  const ob = o.bento && typeof o.bento === "object" ? o.bento : {};
  const bento = {};
  for (const k of Object.keys(d.bento)) bento[k] = typeof ob[k] === "boolean" ? ob[k] : d.bento[k];
  const hs = Array.isArray(o.headingSizes) ? o.headingSizes : [];
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : d.enabled,
    scope: ["both", "dark", "light"].includes(o.scope) ? o.scope : d.scope,
    amoled: typeof o.amoled === "boolean" ? o.amoled : d.amoled,
    colors,
    fontInterface: str(o.fontInterface, d.fontInterface),
    fontText: str(o.fontText, d.fontText),
    fontMono: str(o.fontMono, d.fontMono),
    fontSize: num(o.fontSize, d.fontSize, 0, 40),
    lineHeight: num(o.lineHeight, d.lineHeight, 1, 2.5),
    headingWeight: num(o.headingWeight, d.headingWeight, 100, 900),
    headingSizes: d.headingSizes.map((def, i) => num(hs[i], def, 0.6, 4)),
    radius: num(o.radius, d.radius, 0, 32),
    cardRadius: num(o.cardRadius, d.cardRadius, 0, 40),
    cardPadding: num(o.cardPadding, d.cardPadding, 0, 40),
    bentoGap: num(o.bentoGap, d.bentoGap, 0, 48),
    cardOpacity: num(o.cardOpacity, d.cardOpacity, 0, 1),
    mutedOpacity: num(o.mutedOpacity, d.mutedOpacity, 0.2, 1),
    selectionOpacity: num(o.selectionOpacity, d.selectionOpacity, 0.05, 1),
    glow: num(o.glow, d.glow, 0, 1),
    bento,
  };
}
function sanitizeSettings(src) {
  const theme = sanitizeTheme(src);
  const presets = {};
  if (src && src.presets && typeof src.presets === "object") {
    for (const [name, p] of Object.entries(src.presets)) presets[String(name).slice(0, 80)] = sanitizeTheme(p);
  }
  return Object.assign(theme, {
    previewCollapsed: !!(src && src.previewCollapsed),
    presets,
  });
}

/* =========================================================
   Generación de las variables CSS
   ========================================================= */
function effectiveColors(s) {
  const c = Object.assign({}, s.colors);
  if (s.amoled) {
    c.bgPrimary = "#000000";
    c.bgSecondary = "#000000";
    c.sidebar = "#000000";
    c.codeBg = "#060606";
    c.quoteBg = mix("#000000", c.accent, 0.04);
  }
  return c;
}

/** Indica si los colores se aplican con el modo (oscuro/claro) actual de ese <body>. */
function scopeMatches(scope, body) {
  const dark = body.classList.contains("theme-dark");
  const light = body.classList.contains("theme-light");
  if (scope === "dark") return dark;
  if (scope === "light") return light;
  return dark || light;
}

function cssFont(name) {
  // Lista de familias separada por comas; se citan las que llevan espacios.
  return name
    .split(",")
    .map((f) => f.trim())
    .filter(Boolean)
    .map((f) => (/^["'].*["']$/.test(f) || !/\s/.test(f) ? f : `"${f}"`))
    .join(", ");
}

function buildVars(s) {
  const c = effectiveColors(s);
  const a = c.accent;
  const [h, sat, lig] = hexToHsl(a);
  const lightBg = isLight(c.bgPrimary);
  const hover = lightBg ? "#000000" : "#ffffff";
  const r = s.radius;

  const v = {
    "--accent-h": String(h),
    "--accent-s": sat + "%",
    "--accent-l": lig + "%",
    "--interactive-accent": a,
    "--interactive-accent-hover": mix(a, hover, 0.14),
    "--interactive-accent-rgb": rgbList(a),
    "--color-accent": a,
    "--color-accent-1": mix(a, hover, 0.12),
    "--color-accent-2": mix(a, hover, 0.24),
    "--text-accent": a,
    "--text-accent-hover": mix(a, hover, 0.2),
    "--text-on-accent": isLight(a) ? "#000000" : "#ffffff",
    "--text-selection": rgba(a, s.selectionOpacity),
    "--checkbox-color": a,
    "--checkbox-color-hover": mix(a, hover, 0.14),

    "--background-primary": c.bgPrimary,
    "--background-primary-alt": s.amoled ? "#000000" : mix(c.bgPrimary, c.bgSecondary, 0.5),
    "--background-secondary": c.bgSecondary,
    "--background-secondary-alt": s.amoled ? "#050505" : mix(c.bgSecondary, c.border, 0.4),
    "--background-modifier-border": c.border,
    "--background-modifier-border-hover": mix(c.border, c.text, 0.12),
    "--background-modifier-border-focus": a,
    "--background-modifier-hover": rgba(c.text, 0.06),
    "--background-modifier-active-hover": rgba(a, 0.15),
    "--background-modifier-form-field": c.bgSecondary,
    "--divider-color": c.border,
    "--nav-item-background-active": rgba(a, 0.15),
    "--nav-item-color-active": c.text,

    "--titlebar-background": c.sidebar,
    "--titlebar-background-focused": c.sidebar,
    "--ribbon-background": c.sidebar,
    "--ribbon-background-collapsed": c.sidebar,
    "--tab-container-background": c.sidebar,

    "--text-normal": c.text,
    "--text-muted": rgba(c.text, s.mutedOpacity),
    "--text-faint": rgba(c.text, s.mutedOpacity * 0.65),

    "--inline-title-color": c.h1,
    "--inline-title-size": s.headingSizes[0] + "em",
    "--inline-title-weight": String(s.headingWeight),

    "--link-color": c.link,
    "--link-color-hover": mix(c.link, hover, 0.2),
    "--link-external-color": c.link,
    "--link-external-color-hover": mix(c.link, hover, 0.2),
    "--link-unresolved-color": c.link,
    "--link-unresolved-opacity": "0.6",

    "--code-background": c.codeBg,
    "--code-normal": c.codeText,
    "--code-radius": r + "px",

    "--blockquote-border-color": c.quoteBorder,
    "--blockquote-background-color": c.quoteBg,
    "--blockquote-color": c.quoteText,
    "--blockquote-border-thickness": "3px",

    "--tag-background": c.tagBg,
    "--tag-background-hover": mix(c.tagBg, a, 0.18),
    "--tag-color": c.tagText,
    "--tag-color-hover": mix(c.tagText, hover, 0.2),
    "--tag-border-color": rgba(a, 0.35),
    "--tag-border-color-hover": rgba(a, 0.6),
    "--tag-border-width": "1px",

    "--radius-s": Math.max(0, Math.round(r * 0.5)) + "px",
    "--radius-m": r + "px",
    "--radius-l": Math.round(r * 1.5) + "px",
    "--radius-xl": r * 2 + "px",
    "--input-radius": r + "px",
    "--modal-radius": Math.round(r * 1.5) + "px",
    "--callout-radius": s.cardRadius + "px",

    "--line-height-normal": String(s.lineHeight),

    "--scrollbar-bg": rgba(c.text, 0.03),
    "--scrollbar-thumb-bg": rgba(c.text, 0.12),
    "--scrollbar-active-thumb-bg": rgba(a, 0.5),

    "--bv-accent": a,
    "--bv-sidebar": c.sidebar,
    "--bv-card-bg": rgba(c.bgSecondary === c.bgPrimary ? mix(c.bgPrimary, c.text, 0.03) : c.bgSecondary, s.cardOpacity),
    "--bv-card-border": c.border,
    "--bv-card-radius": s.cardRadius + "px",
    "--bv-card-pad": s.cardPadding + "px",
    "--bv-gap": s.bentoGap + "px",
    "--bv-glow": s.glow > 0
      ? `0 14px 34px -20px ${rgba(a, s.glow)}, 0 0 0 1px ${rgba(a, s.glow * 0.22)}`
      : "none",
  };
  for (let i = 0; i < 6; i++) {
    v[`--h${i + 1}-color`] = c["h" + (i + 1)];
    v[`--h${i + 1}-size`] = s.headingSizes[i] + "em";
    v[`--h${i + 1}-weight`] = String(s.headingWeight);
  }
  if (s.fontSize > 0) v["--font-text-size"] = s.fontSize + "px";
  if (s.fontInterface) {
    v["--font-interface-theme"] = cssFont(s.fontInterface);
    v["--font-interface-override"] = cssFont(s.fontInterface);
  }
  if (s.fontText) {
    v["--font-text-theme"] = cssFont(s.fontText);
    v["--font-text-override"] = cssFont(s.fontText);
  }
  if (s.fontMono) {
    v["--font-monospace-theme"] = cssFont(s.fontMono);
    v["--font-monospace-override"] = cssFont(s.fontMono);
  }

  return v;
}

/* =========================================================
   Variables en línea sobre <body>
   ========================================================= */
/** Devuelve la variable a su valor anterior, salvo que otro la haya cambiado después. */
function restoreVar(el, name, rec) {
  if (el.style.getPropertyValue(name) !== rec.ours) return;
  if (rec.prev) el.style.setProperty(name, rec.prev, rec.priority);
  else el.style.removeProperty(name);
}

/**
 * Escribe las variables en el elemento y recuerda lo que había (Obsidian guarda ahí
 * el color de acento y las fuentes) para poder restaurarlo.
 */
function writeVars(el, written, vars) {
  for (const [name, rec] of written) {
    if (name in vars) continue;
    restoreVar(el, name, rec);
    written.delete(name);
  }
  for (const [name, value] of Object.entries(vars)) {
    const current = el.style.getPropertyValue(name);
    let rec = written.get(name);
    if (!rec || current !== rec.ours) {
      const priority = el.style.getPropertyPriority(name);
      // Un valor "important" sin registro es una copia de otra ventana: no se conserva.
      const copied = priority === "important";
      rec = { prev: copied ? "" : current, priority: copied ? "" : priority };
    }
    el.style.setProperty(name, value, "important");
    rec.ours = el.style.getPropertyValue(name);
    written.set(name, rec);
  }
}

/* =========================================================
   Plugin
   ========================================================= */
class BentoVaultPlugin extends Plugin {
  async onload() {
    this.settings = sanitizeSettings(Object.assign({}, clone(DEFAULT_SETTINGS), (await this.loadData()) || {}));
    this.requestSave = debounce(() => this.saveData(this.settings), 400, true);
    // documento → variables escritas en su <body>
    this.docs = new Map();
    this.addDoc(this.app.workspace.containerEl.ownerDocument);

    this.addSettingTab(new BentoVaultSettingTab(this.app, this));

    this.addRibbonIcon("palette", "BentoVault: panel rápido", () => new QuickPanelModal(this.app, this).open());

    this.addCommand({
      id: "abrir-panel-rapido",
      name: "Abrir panel rápido",
      callback: () => new QuickPanelModal(this.app, this).open(),
    });
    this.addCommand({
      id: "abrir-ajustes",
      name: "Abrir ajustes completos",
      callback: () => this.openSettings(),
    });
    this.addCommand({
      id: "alternar-amoled",
      name: "Alternar modo AMOLED",
      callback: () => {
        this.settings.amoled = !this.settings.amoled;
        this.applyAndSave();
        new Notice(`BentoVault: AMOLED ${this.settings.amoled ? "activado" : "desactivado"}`);
      },
    });
    this.addCommand({
      id: "alternar-plugin",
      name: "Activar/desactivar estilos",
      callback: () => {
        this.settings.enabled = !this.settings.enabled;
        this.applyAndSave();
        new Notice(`BentoVault: estilos ${this.settings.enabled ? "activados" : "desactivados"}`);
      },
    });
    this.addCommand({
      id: "siguiente-paleta",
      name: "Aplicar la siguiente paleta",
      callback: () => {
        const cur = PALETTES.findIndex((p) => this.paletteMatches(p));
        const next = PALETTES[(cur + 1) % PALETTES.length];
        this.applyPalette(next);
        new Notice(`BentoVault: ${next.name}`);
      },
    });

    // Ventanas emergentes (popout): inyectar también allí.
    this.registerEvent(
      this.app.workspace.on("window-open", (win) => {
        if (win && win.doc) {
          this.addDoc(win.doc);
          this.applyStyles();
        }
      })
    );
    this.registerEvent(
      this.app.workspace.on("window-close", (win) => {
        if (win && win.doc) {
          this.cleanDoc(win.doc);
          this.docs.delete(win.doc);
        }
      })
    );

    // Cambios de tema, modo claro/oscuro, acento o fuentes.
    this.registerEvent(this.app.workspace.on("css-change", () => this.applyStyles()));

    this.applyStyles();

    // Ventanas emergentes que ya estaban abiertas al cargar el plugin.
    this.app.workspace.onLayoutReady(() => {
      this.app.workspace.iterateAllLeaves((leaf) => this.addDoc(leaf.view.containerEl.ownerDocument));
      this.applyStyles();
    });
  }

  onunload() {
    for (const doc of this.docs.keys()) this.cleanDoc(doc);
    this.docs.clear();
  }

  addDoc(doc) {
    if (!this.docs.has(doc)) this.docs.set(doc, new Map());
  }

  cleanDoc(doc) {
    const written = this.docs.get(doc);
    if (!written || !doc.body) return;
    writeVars(doc.body, written, {});
    doc.body.classList.remove("bentovault-on");
    for (const cls of Object.values(BODY_CLASSES)) doc.body.classList.remove(cls);
  }

  applyStyles() {
    const s = this.settings;
    const vars = s.enabled ? buildVars(s) : null;
    for (const [doc, written] of this.docs) {
      const body = doc.body;
      if (!body) continue;
      if (!s.enabled) {
        this.cleanDoc(doc);
        continue;
      }
      const active = scopeMatches(s.scope, body);
      body.classList.toggle("bentovault-on", active);
      for (const [k, cls] of Object.entries(BODY_CLASSES)) body.classList.toggle(cls, !!s.bento[k]);
      writeVars(body, written, active ? vars : {});
    }
  }

  applyAndSave() {
    this.applyStyles();
    this.requestSave();
  }

  /** Tema actual sin presets ni estado de interfaz. */
  snapshot() {
    return sanitizeTheme(this.settings);
  }

  loadTheme(theme) {
    const t = sanitizeTheme(theme);
    const keep = { presets: this.settings.presets, previewCollapsed: this.settings.previewCollapsed };
    this.settings = Object.assign(t, keep);
    this.applyAndSave();
  }

  applyPalette(p) {
    this.settings.colors = clone(p.colors);
    this.settings.amoled = p.amoled;
    this.applyAndSave();
  }

  paletteMatches(p) {
    return COLOR_KEYS.every((k) => this.settings.colors[k] === p.colors[k]) && this.settings.amoled === p.amoled;
  }

  resetAll() {
    const keep = { presets: this.settings.presets, previewCollapsed: this.settings.previewCollapsed };
    this.settings = Object.assign(clone(DEFAULT_SETTINGS), keep);
    this.applyAndSave();
  }

  headingsFromAccent(mode) {
    const c = this.settings.colors;
    for (let i = 1; i <= 6; i++) {
      c["h" + i] = mode === "flat" ? c.accent : i === 6 ? mix(c.text, c.bgPrimary, 0.25) : mix(c.accent, c.text, (i - 1) * 0.15);
    }
    this.applyAndSave();
  }

  openSettings() {
    const setting = this.app.setting;
    if (setting && setting.open) {
      setting.open();
      if (setting.openTabById) setting.openTabById(this.manifest.id);
    }
  }

  /* ---------- Presets: archivos ---------- */
  presetPayload(name, theme) {
    return JSON.stringify({ bentovault: 1, name, exported: new Date().toISOString(), theme }, null, 2);
  }

  async exportPresetFile(name, theme) {
    const json = this.presetPayload(name, theme);
    const adapter = this.app.vault.adapter;
    const dir = `${this.manifest.dir}/presets`;
    if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
    const slug = name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "preset";
    const path = `${dir}/${slug}.json`;
    await adapter.write(path, json);
    try {
      await navigator.clipboard.writeText(json);
    } catch (e) {
      /* el portapapeles puede no estar disponible */
    }
    new Notice(`Exportado a ${path}\n(también copiado al portapapeles)`);
  }

  /** Acepta {bentovault, name, theme}, una instantánea suelta o {presets:{...}}. */
  importJSON(text, fallbackName) {
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      new Notice("JSON no válido: " + e.message);
      return false;
    }
    if (!data || typeof data !== "object") {
      new Notice("El JSON no contiene un objeto.");
      return false;
    }
    if (data.presets && typeof data.presets === "object" && !data.colors) {
      let n = 0;
      for (const [name, p] of Object.entries(data.presets)) {
        this.settings.presets[String(name).slice(0, 80)] = sanitizeTheme(p && p.theme ? p.theme : p);
        n++;
      }
      this.requestSave();
      new Notice(`Importados ${n} presets.`);
      return true;
    }
    const theme = sanitizeTheme(data.theme || data);
    let name = (typeof data.name === "string" && data.name.trim()) || fallbackName || "Importado";
    name = name.slice(0, 80);
    if (this.settings.presets[name]) name = `${name} (${new Date().toLocaleString("es-ES")})`;
    this.settings.presets[name] = theme;
    this.loadTheme(theme);
    new Notice(`Preset «${name}» importado y aplicado.`);
    return true;
  }
}

/* =========================================================
   Componentes de interfaz compartidos
   ========================================================= */
function colorSetting(plugin, container, key, onExtra) {
  const [label, desc] = COLOR_LABELS[key];
  const st = new Setting(container).setName(label);
  const overridden = plugin.settings.amoled && AMOLED_KEYS.includes(key);
  st.setDesc(overridden ? "Anulado por el modo AMOLED." : desc);
  if (overridden) st.settingEl.addClass("bv-overridden");
  let picker = null, text = null;
  const set = (hex, from) => {
    plugin.settings.colors[key] = hex;
    if (from !== "picker" && picker) picker.setValue(hex);
    if (from !== "text" && text) text.setValue(hex);
    plugin.applyAndSave();
    if (onExtra) onExtra();
  };
  st.addColorPicker((cp) => {
    picker = cp;
    cp.setValue(plugin.settings.colors[key]).onChange((val) => {
      const h = normHex(val);
      if (h) set(h, "picker");
    });
  });
  st.addText((t) => {
    text = t;
    t.inputEl.addClass("bv-hex");
    t.setPlaceholder("#rrggbb").setValue(plugin.settings.colors[key]).onChange((val) => {
      const h = normHex(val);
      if (h && val.trim().length >= 4) set(h, "text");
    });
  });
  st.addExtraButton((b) =>
    b.setIcon("rotate-ccw").setTooltip("Restablecer este color").onClick(() => set(DEFAULT_SETTINGS.colors[key]))
  );
  return st;
}

function sliderSetting(plugin, container, name, desc, get, setv, min, max, step, fmt) {
  const st = new Setting(container).setName(name);
  if (desc) st.setDesc(desc);
  const label = createSpan({ cls: "bv-value", text: fmt(get()) });
  st.addSlider((sl) =>
    sl.setLimits(min, max, step).setValue(get()).setDynamicTooltip().onChange((val) => {
      setv(val);
      label.setText(fmt(val));
      plugin.applyAndSave();
    })
  );
  st.controlEl.prepend(label);
  return st;
}

function toggleSetting(plugin, container, name, desc, get, setv, after) {
  return new Setting(container)
    .setName(name)
    .setDesc(desc || "")
    .addToggle((t) =>
      t.setValue(get()).onChange((val) => {
        setv(val);
        plugin.applyAndSave();
        if (after) after(val);
      })
    );
}

function renderSwatches(plugin, container, onApply) {
  const grid = container.createDiv({ cls: "bv-swatches" });
  for (const p of PALETTES) {
    const btn = grid.createEl("button", { cls: "bv-swatch", attr: { "aria-label": p.name, type: "button" } });
    if (plugin.paletteMatches(p)) btn.addClass("is-active");
    const bg = p.amoled ? "#000000" : p.colors.bgPrimary;
    const chip = btn.createDiv({ cls: "bv-swatch-chip" });
    chip.style.background =
      `linear-gradient(135deg, ${bg} 0 52%, ${p.colors.bgSecondary} 52% 70%, ${p.colors.accent} 70% 86%, ${p.colors.h3} 86%)`;
    btn.createDiv({ cls: "bv-swatch-name", text: p.name });
    btn.addEventListener("click", () => {
      plugin.applyPalette(p);
      if (onApply) onApply();
    });
  }
  return grid;
}

function renderPreview(container) {
  const pv = container.createDiv({ cls: "bv-preview markdown-rendered" });
  for (let i = 1; i <= 6; i++) pv.createEl("h" + i, { text: `Título H${i}` });
  const p = pv.createEl("p");
  p.appendText("Texto normal con un ");
  p.createEl("a", { cls: "internal-link", text: "enlace interno", attr: { href: "#" } });
  p.appendText(", un ");
  p.createEl("a", { cls: "external-link", text: "enlace externo", attr: { href: "#" } });
  p.appendText(", ");
  p.createEl("code", { text: "código en línea" });
  p.appendText(" y una etiqueta ");
  p.createEl("a", { cls: "tag", text: "#bento", attr: { href: "#" } });
  p.appendText(".");
  const muted = pv.createEl("p");
  muted.createSpan({ cls: "bv-preview-muted", text: "Texto atenuado de ejemplo." });
  pv.createEl("blockquote").createEl("p", { text: "Una cita: «Menos, pero mejor.»" });
  pv.createEl("pre").createEl("code", { text: "const vault = 'bento';\nconsole.log(vault);" });

  const callout = (type, title, body, color) => {
    const c = pv.createDiv({ cls: "callout", attr: { "data-callout": type } });
    if (color) c.style.setProperty("--callout-color", color);
    const t = c.createDiv({ cls: "callout-title" });
    t.createDiv({ cls: "callout-title-inner", text: title });
    c.createDiv({ cls: "callout-content" }).createEl("p", { text: body });
    return c;
  };
  callout("note", "Tarjeta bento", "Los callouts se muestran como tarjetas con radio, borde y brillo.");
  callout("tip", "Consejo", "Usa > [!bento] para agrupar tarjetas en rejilla.");

  const split = pv.createDiv({ cls: "bv-preview-split" });
  const side = split.createDiv({ cls: "bv-preview-side" });
  side.createDiv({ cls: "bv-fake-nav is-active", text: "📁 Proyectos" });
  side.createDiv({ cls: "bv-fake-nav", text: "📄 Notas diarias" });
  side.createDiv({ cls: "bv-fake-nav", text: "📄 Ideas" });
  side.createEl("button", { cls: "mod-cta bv-fake-btn", text: "Botón de acento" });
  const right = split.createDiv({ cls: "bv-preview-side bv-preview-main" });
  right.createEl("input", { attr: { type: "text", placeholder: "Campo de texto" } });
  const lab = right.createEl("label", { cls: "bv-preview-check" });
  lab.createEl("input", { attr: { type: "checkbox", checked: "" } });
  lab.appendText("Casilla");
  right.createDiv({ cls: "bv-preview-selected", text: "Texto seleccionado" });
  return pv;
}

/* =========================================================
   Modal de confirmación
   ========================================================= */
class ConfirmModal extends Modal {
  constructor(app, title, message, onConfirm) {
    super(app);
    this.title = title;
    this.message = message;
    this.onConfirm = onConfirm;
  }
  onOpen() {
    this.titleEl.setText(this.title);
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl)
      .addButton((b) => b.setButtonText("Cancelar").onClick(() => this.close()))
      .addButton((b) =>
        b.setButtonText("Confirmar").setWarning().onClick(() => {
          this.close();
          this.onConfirm();
        })
      );
  }
  onClose() {
    this.contentEl.empty();
  }
}

/* =========================================================
   Panel rápido (modal)
   ========================================================= */
class QuickPanelModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }
  onOpen() {
    this.modalEl.addClass("bv-quick-modal");
    this.titleEl.setText("BentoVault · Panel rápido");
    this.render();
  }
  onClose() {
    this.contentEl.empty();
  }
  render() {
    const pl = this.plugin;
    const s = pl.settings;
    const scroll = this.controls ? this.controls.scrollTop : 0;
    this.contentEl.empty();
    const wrap = this.contentEl.createDiv({ cls: "bv-quick" });
    const ctl = (this.controls = wrap.createDiv({ cls: "bv-quick-controls" }));
    const pvCol = wrap.createDiv({ cls: "bv-quick-preview" });

    toggleSetting(pl, ctl, "Estilos activos", "", () => pl.settings.enabled, (v) => (pl.settings.enabled = v));
    toggleSetting(pl, ctl, "Modo AMOLED", "Negro puro en fondos y paneles.", () => pl.settings.amoled, (v) => (pl.settings.amoled = v), () => this.render());

    new Setting(ctl).setName("Paletas").setHeading();
    renderSwatches(pl, ctl, () => this.render());

    new Setting(ctl).setName("Colores clave").setHeading();
    for (const k of ["accent", "bgPrimary", "bgSecondary", "text", "link", "sidebar"]) colorSetting(pl, ctl, k);
    new Setting(ctl)
      .setName("Títulos H1–H6")
      .setDesc("Generar a partir del acento.")
      .addButton((b) => b.setButtonText("Degradado").onClick(() => { pl.headingsFromAccent("gradient"); this.render(); }))
      .addButton((b) => b.setButtonText("Igual al acento").onClick(() => { pl.headingsFromAccent("flat"); this.render(); }));

    new Setting(ctl).setName("Forma").setHeading();
    sliderSetting(pl, ctl, "Radio de bordes", "", () => pl.settings.radius, (v) => (pl.settings.radius = v), 0, 24, 1, (v) => v + "px");
    sliderSetting(pl, ctl, "Radio de tarjetas", "", () => pl.settings.cardRadius, (v) => (pl.settings.cardRadius = v), 0, 32, 1, (v) => v + "px");
    sliderSetting(pl, ctl, "Brillo de tarjetas", "", () => pl.settings.glow, (v) => (pl.settings.glow = v), 0, 1, 0.05, (v) => Math.round(v * 100) + "%");
    toggleSetting(pl, ctl, "Callouts como tarjetas bento", "", () => pl.settings.bento.callouts, (v) => (pl.settings.bento.callouts = v));

    const names = Object.keys(s.presets);
    if (names.length) {
      new Setting(ctl).setName("Presets").setHeading();
      let chosen = names[0];
      new Setting(ctl)
        .setName("Cargar preset")
        .addDropdown((d) => {
          for (const n of names) d.addOption(n, n);
          d.setValue(chosen).onChange((v) => (chosen = v));
        })
        .addButton((b) => b.setButtonText("Cargar").setCta().onClick(() => {
          pl.loadTheme(pl.settings.presets[chosen]);
          new Notice(`Preset «${chosen}» cargado.`);
          this.render();
        }));
    }

    const btns = ctl.createDiv({ cls: "bv-quick-buttons" });
    const full = btns.createEl("button", { cls: "mod-cta", text: "Ajustes completos" });
    full.addEventListener("click", () => { this.close(); pl.openSettings(); });
    const rst = btns.createEl("button", { cls: "mod-warning", text: "Restablecer todo" });
    rst.addEventListener("click", () =>
      new ConfirmModal(this.app, "Restablecer BentoVault", "Se volverá a los valores por defecto. Los presets guardados se conservan.", () => {
        pl.resetAll();
        this.render();
      }).open()
    );

    renderPreview(pvCol);
    ctl.scrollTop = scroll;
  }
}

/* =========================================================
   Pestaña de ajustes
   ========================================================= */
class BentoVaultSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  refresh() {
    const sc = this.containerEl.scrollTop;
    this.display();
    this.containerEl.scrollTop = sc;
  }

  display() {
    const pl = this.plugin;
    const s = pl.settings;
    const el = this.containerEl;
    el.empty();
    el.addClass("bv-settings");

    el.createDiv({
      cls: "bv-subtitle",
      text: "Todos los cambios se aplican en vivo. Se superponen al tema activo sin modificarlo.",
    });

    // Vista previa fija
    const pw = el.createDiv({ cls: "bv-preview-wrap" + (s.previewCollapsed ? " is-collapsed" : "") });
    const bar = pw.createDiv({ cls: "bv-preview-bar" });
    bar.createSpan({ text: "Vista previa en vivo" });
    const tbtn = bar.createEl("button", { text: s.previewCollapsed ? "Mostrar" : "Ocultar" });
    tbtn.addEventListener("click", () => {
      s.previewCollapsed = !s.previewCollapsed;
      pw.toggleClass("is-collapsed", s.previewCollapsed);
      tbtn.setText(s.previewCollapsed ? "Mostrar" : "Ocultar");
      pl.requestSave();
    });
    renderPreview(pw);

    /* --- General --- */
    toggleSetting(pl, el, "Estilos activos", "Desactívalo para volver al tema tal cual, sin perder la configuración.", () => s.enabled, (v) => (s.enabled = v));
    new Setting(el)
      .setName("Aplicar en")
      .setDesc("Modo de Obsidian en el que se aplican los estilos.")
      .addDropdown((d) =>
        d.addOptions({ both: "Oscuro y claro", dark: "Solo modo oscuro", light: "Solo modo claro" })
          .setValue(s.scope)
          .onChange((v) => { s.scope = v; pl.applyAndSave(); })
      );
    toggleSetting(pl, el, "Modo AMOLED", "Negro puro (#000) en fondos, barra lateral, código y citas.", () => s.amoled, (v) => (s.amoled = v), () => this.refresh());

    /* --- Paletas --- */
    new Setting(el).setName("Paletas predefinidas").setHeading();
    el.createDiv({ cls: "bv-section-desc", text: "Sustituyen todos los colores y el modo AMOLED. Ajusta después lo que quieras." });
    renderSwatches(pl, el, () => this.refresh());

    /* --- Colores --- */
    for (const [title, keys] of COLOR_GROUPS) {
      new Setting(el).setName(title).setHeading();
      if (title === "Títulos") {
        new Setting(el)
          .setName("Generar desde el acento")
          .addButton((b) => b.setButtonText("Degradado").onClick(() => { pl.headingsFromAccent("gradient"); this.refresh(); }))
          .addButton((b) => b.setButtonText("Todos iguales").onClick(() => { pl.headingsFromAccent("flat"); this.refresh(); }));
      }
      for (const k of keys) colorSetting(pl, el, k);
    }

    /* --- Tipografía --- */
    new Setting(el).setName("Tipografía").setHeading();
    el.createDiv({ cls: "bv-section-desc", text: "Deja un campo vacío para respetar la fuente de Obsidian/tema. Admite listas: «Inter, Noto Sans»." });
    const dl = el.createEl("datalist", { attr: { id: "bv-font-list" } });
    for (const f of FONT_SUGGESTIONS) dl.createEl("option", { attr: { value: f } });
    const fontRow = (name, key) =>
      new Setting(el).setName(name).addText((t) => {
        t.inputEl.setAttr("list", "bv-font-list");
        t.setPlaceholder("Predeterminada").setValue(s[key]).onChange((v) => { s[key] = str(v, ""); pl.applyAndSave(); });
      });
    fontRow("Fuente de la interfaz", "fontInterface");
    fontRow("Fuente del texto", "fontText");
    fontRow("Fuente monoespaciada", "fontMono");
    sliderSetting(pl, el, "Tamaño del texto", "0 = usar el de Obsidian.", () => s.fontSize, (v) => (s.fontSize = v), 0, 28, 1, (v) => (v ? v + "px" : "auto"));
    sliderSetting(pl, el, "Interlineado", "", () => s.lineHeight, (v) => (s.lineHeight = v), 1, 2.2, 0.05, (v) => v.toFixed(2));
    sliderSetting(pl, el, "Grosor de títulos", "", () => s.headingWeight, (v) => (s.headingWeight = v), 300, 900, 100, (v) => String(v));
    for (let i = 0; i < 6; i++) {
      sliderSetting(pl, el, `Tamaño H${i + 1}`, "", () => s.headingSizes[i], (v) => (s.headingSizes[i] = v), 0.8, 3.5, 0.05, (v) => v.toFixed(2) + "em");
    }

    /* --- Forma y opacidad --- */
    new Setting(el).setName("Forma y opacidades").setHeading();
    sliderSetting(pl, el, "Radio de bordes", "Botones, campos, ventanas y código.", () => s.radius, (v) => (s.radius = v), 0, 24, 1, (v) => v + "px");
    sliderSetting(pl, el, "Opacidad del texto atenuado", "", () => s.mutedOpacity, (v) => (s.mutedOpacity = v), 0.2, 1, 0.01, (v) => Math.round(v * 100) + "%");
    sliderSetting(pl, el, "Opacidad de la selección", "", () => s.selectionOpacity, (v) => (s.selectionOpacity = v), 0.05, 1, 0.01, (v) => Math.round(v * 100) + "%");
    sliderSetting(pl, el, "Opacidad del fondo de tarjetas", "", () => s.cardOpacity, (v) => (s.cardOpacity = v), 0, 1, 0.01, (v) => Math.round(v * 100) + "%");

    /* --- Bento --- */
    new Setting(el).setName("Estilo bento").setHeading();
    el.createDiv({
      cls: "bv-section-desc",
      text: "Convierte bloques en tarjetas. Extra: un callout «> [!bento]» (o «[!bento|3]») agrupa los callouts anidados en rejilla; usa «|wide» o «|tall» en ellos para que ocupen 2 columnas o 2 filas.",
    });
    const bentoOpts = [
      ["callouts", "Callouts", ""],
      ["quotes", "Citas", "En modo lectura."],
      ["code", "Bloques de código", "Puede solaparse con Codeblock Customizer, por eso viene desactivado."],
      ["tables", "Tablas", "En modo lectura."],
      ["embeds", "Notas incrustadas", ""],
      ["hover", "Elevar al pasar el ratón", ""],
    ];
    for (const [k, n, d] of bentoOpts) toggleSetting(pl, el, n, d, () => s.bento[k], (v) => (s.bento[k] = v));
    sliderSetting(pl, el, "Radio de tarjetas", "", () => s.cardRadius, (v) => (s.cardRadius = v), 0, 32, 1, (v) => v + "px");
    sliderSetting(pl, el, "Relleno interior", "", () => s.cardPadding, (v) => (s.cardPadding = v), 4, 32, 1, (v) => v + "px");
    sliderSetting(pl, el, "Separación en rejilla [!bento]", "", () => s.bentoGap, (v) => (s.bentoGap = v), 0, 40, 1, (v) => v + "px");
    sliderSetting(pl, el, "Brillo con el acento", "", () => s.glow, (v) => (s.glow = v), 0, 1, 0.05, (v) => Math.round(v * 100) + "%");

    /* --- Presets --- */
    new Setting(el).setName("Presets").setHeading();
    let newName = "";
    new Setting(el)
      .setName("Guardar configuración actual")
      .setDesc("Si ya existe un preset con ese nombre, se sobrescribe.")
      .addText((t) => t.setPlaceholder("Nombre del preset").onChange((v) => (newName = v.trim())))
      .addButton((b) =>
        b.setButtonText("Guardar").setCta().onClick(() => {
          if (!newName) return new Notice("Escribe un nombre para el preset.");
          s.presets[newName.slice(0, 80)] = pl.snapshot();
          pl.requestSave();
          new Notice(`Preset «${newName}» guardado.`);
          this.refresh();
        })
      );

    const names = Object.keys(s.presets).sort((a, b) => a.localeCompare(b, "es"));
    if (!names.length) el.createDiv({ cls: "bv-section-desc", text: "Aún no hay presets guardados." });
    for (const n of names) {
      const row = new Setting(el).setName(n);
      row.settingEl.addClass("bv-preset-row");
      const pc = s.presets[n].colors;
      row.setDesc(`Acento ${pc.accent} · fondo ${s.presets[n].amoled ? "AMOLED" : pc.bgPrimary}`);
      row.addButton((b) => b.setButtonText("Cargar").onClick(() => { pl.loadTheme(s.presets[n]); new Notice(`Preset «${n}» cargado.`); this.refresh(); }));
      row.addExtraButton((b) => b.setIcon("refresh-cw").setTooltip("Sobrescribir con la configuración actual").onClick(() => {
        s.presets[n] = pl.snapshot();
        pl.requestSave();
        new Notice(`Preset «${n}» actualizado.`);
        this.refresh();
      }));
      row.addExtraButton((b) => b.setIcon("download").setTooltip("Exportar a JSON").onClick(() => pl.exportPresetFile(n, s.presets[n])));
      row.addExtraButton((b) => b.setIcon("trash").setTooltip("Eliminar").onClick(() =>
        new ConfirmModal(this.app, "Eliminar preset", `¿Eliminar «${n}»?`, () => {
          delete s.presets[n];
          pl.requestSave();
          this.refresh();
        }).open()
      ));
    }

    new Setting(el)
      .setName("Exportar")
      .setDesc(`Se guarda en ${pl.manifest.dir}/presets/ y se copia al portapapeles.`)
      .addButton((b) => b.setButtonText("Configuración actual").onClick(() => pl.exportPresetFile("actual", pl.snapshot())))
      .addButton((b) => b.setButtonText("Todos los presets").onClick(async () => {
        const json = JSON.stringify({ bentovault: 1, exported: new Date().toISOString(), presets: s.presets }, null, 2);
        const adapter = pl.app.vault.adapter;
        const dir = `${pl.manifest.dir}/presets`;
        if (!(await adapter.exists(dir))) await adapter.mkdir(dir);
        await adapter.write(`${dir}/todos-los-presets.json`, json);
        try { await navigator.clipboard.writeText(json); } catch (e) { /* sin portapapeles */ }
        new Notice(`Exportado a ${dir}/todos-los-presets.json`);
      }));

    const imp = new Setting(el)
      .setName("Importar")
      .setDesc("Elige un archivo .json o pega el JSON abajo. Un preset individual se guarda y se aplica; un archivo con «presets» se añade a la lista.");
    const fileInput = imp.controlEl.createEl("input", { cls: "bv-file-input", attr: { type: "file", accept: ".json,application/json" } });
    imp.addButton((b) => b.setButtonText("Desde archivo…").onClick(() => fileInput.click()));
    fileInput.addEventListener("change", async () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      const text = await f.text();
      if (pl.importJSON(text, f.name.replace(/\.json$/i, ""))) this.refresh();
      fileInput.value = "";
    });
    const area = el.createEl("textarea", { cls: "bv-import-area", attr: { placeholder: '{ "bentovault": 1, "name": "...", "theme": { ... } }' } });
    new Setting(el).addButton((b) =>
      b.setButtonText("Importar JSON pegado").onClick(() => {
        if (!area.value.trim()) return new Notice("Pega primero un JSON.");
        if (pl.importJSON(area.value)) this.refresh();
      })
    );

    /* --- Restablecer --- */
    new Setting(el).setName("Restablecer").setHeading();
    new Setting(el)
      .setName("Restablecer todo")
      .setDesc("Vuelve a los valores por defecto (paleta Tidepool + AMOLED). Los presets guardados se conservan.")
      .addButton((b) =>
        b.setButtonText("Restablecer").setWarning().onClick(() =>
          new ConfirmModal(this.app, "Restablecer BentoVault", "¿Volver a los valores por defecto?", () => {
            pl.resetAll();
            this.refresh();
          }).open()
        )
      );
  }
}

module.exports = BentoVaultPlugin;
// Exportado para pruebas fuera de Obsidian (no afecta al plugin).
module.exports._internals = { buildVars, writeVars, scopeMatches, sanitizeSettings, sanitizeTheme, PALETTES, DEFAULT_SETTINGS, makeColors, normHex };

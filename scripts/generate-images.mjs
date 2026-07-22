/**
 * Generates consistent, premium SVG product artwork for every SKU:
 *   public/products/<slug>.svg          — main catalog shot (800×1000)
 *   public/products/<slug>-detail.svg   — fabric/material close-up
 *
 * Run: npm run generate:images
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "products");
mkdirSync(outDir, { recursive: true });

// ── palette ───────────────────────────────────────────────────────────
const C = {
  navy: ["#243B6B", "#16233F"],
  charcoal: ["#3A3F46", "#23262B"],
  burgundy: ["#77243384", "#4D1620"], // placeholder fixed below
  ivory: ["#EDE4CF", "#D8CCAF"],
  green: ["#2A5645", "#173226"],
  grey: ["#767E8C", "#4E5560"],
  black: ["#1B1C21", "#0E0F12"],
  blue: ["#2547B8", "#16265E"],
  gold: ["#D8B96A", "#8A6C2F"],
};
C.burgundy = ["#7A2534", "#4D1620"];

const METAL = {
  gold: ["#F0D89A", "#C6A75E", "#7A5D26"],
  silver: ["#F2F3F6", "#C3C7CF", "#7E838E"],
  gunmetal: ["#A7ADB7", "#767D88", "#3E434C"],
  pearl: ["#FBF7EE", "#EDE2CF", "#B9AD93"],
  horn: ["#3B3129", "#241D17", "#120E0B"],
};

const GOLD = "#C6A75E";
// subtle edge stroke so ivory/pearl pieces don't vanish on the light bg
const LIGHT_EDGE = "#D8CCAF";

// ── shared scaffolding ────────────────────────────────────────────────
const W = 800;
const H = 1000;

function svgOpen(defs = "") {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
<defs>
<radialGradient id="bg" cx="50%" cy="38%" r="80%">
  <stop offset="0%" stop-color="#FFFFFF"/>
  <stop offset="60%" stop-color="#F2EFE9"/>
  <stop offset="100%" stop-color="#E8E4DA"/>
</radialGradient>
<linearGradient id="sheen" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.10"/>
  <stop offset="45%" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>
<filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
  <feDropShadow dx="0" dy="10" stdDeviation="18" flood-color="#1A1C1C" flood-opacity="0.18"/>
</filter>
${defs}
</defs>
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${GOLD}" stroke-opacity="0.28" stroke-width="1.5"/>`;
}

const svgClose = `</svg>`;

function metalGrad(id, m) {
  const [a, b, c] = METAL[m];
  return `<radialGradient id="${id}" cx="38%" cy="32%" r="80%">
  <stop offset="0%" stop-color="${a}"/>
  <stop offset="55%" stop-color="${b}"/>
  <stop offset="100%" stop-color="${c}"/>
</radialGradient>`;
}

function fabricGrad(id, colors) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0.35" y2="1">
  <stop offset="0%" stop-color="${colors[0]}"/>
  <stop offset="100%" stop-color="${colors[1]}"/>
</linearGradient>`;
}

// pattern defs — `fillRef` is what shapes should reference
function patternDef(id, pattern, colors, accent = GOLD) {
  const [base] = colors;
  switch (pattern) {
    case "stripe":
      return `<pattern id="${id}" width="46" height="46" patternUnits="userSpaceOnUse" patternTransform="rotate(-55)">
  <rect width="46" height="46" fill="url(#fab)"/>
  <rect y="0" width="46" height="7" fill="${accent}" opacity="0.9"/>
  <rect y="11" width="46" height="2" fill="${accent}" opacity="0.35"/>
</pattern>`;
    case "dot":
      return `<pattern id="${id}" width="34" height="34" patternUnits="userSpaceOnUse">
  <rect width="34" height="34" fill="url(#fab)"/>
  <circle cx="9" cy="9" r="2.6" fill="${accent}" opacity="0.9"/>
  <circle cx="26" cy="26" r="2.6" fill="${accent}" opacity="0.9"/>
</pattern>`;
    case "herringbone":
      return `<pattern id="${id}" width="26" height="26" patternUnits="userSpaceOnUse">
  <rect width="26" height="26" fill="url(#fab)"/>
  <path d="M0 26 L13 13 L26 26" stroke="${lighten(base)}" stroke-width="2.5" fill="none" opacity="0.5"/>
  <path d="M0 13 L13 0 L26 13" stroke="${lighten(base)}" stroke-width="2.5" fill="none" opacity="0.5"/>
</pattern>`;
    case "diamond":
      return `<pattern id="${id}" width="40" height="40" patternUnits="userSpaceOnUse">
  <rect width="40" height="40" fill="url(#fab)"/>
  <path d="M20 4 L36 20 L20 36 L4 20 Z" fill="none" stroke="${lighten(base)}" stroke-width="1.6" opacity="0.55"/>
  <circle cx="20" cy="20" r="1.6" fill="${lighten(base)}" opacity="0.6"/>
</pattern>`;
    case "paisley":
      return `<pattern id="${id}" width="56" height="56" patternUnits="userSpaceOnUse">
  <rect width="56" height="56" fill="url(#fab)"/>
  <path d="M14 40 C4 30 10 12 24 12 C34 12 36 24 28 30 C22 35 18 40 20 46 C17 45 15 43 14 40 Z" fill="${accent}" opacity="0.75"/>
  <path d="M44 26 C50 20 48 8 38 10 C32 11 32 19 37 22 C41 25 43 27 42 32 C43 30 44 28 44 26 Z" fill="${accent}" opacity="0.5"/>
</pattern>`;
    case "medallion":
      return `<pattern id="${id}" width="60" height="60" patternUnits="userSpaceOnUse">
  <rect width="60" height="60" fill="url(#fab)"/>
  <circle cx="30" cy="30" r="14" fill="none" stroke="${accent}" stroke-width="1.6" opacity="0.8"/>
  <circle cx="30" cy="30" r="6" fill="none" stroke="${accent}" stroke-width="1.2" opacity="0.6"/>
  <circle cx="30" cy="30" r="1.8" fill="${accent}" opacity="0.8"/>
</pattern>`;
    default: // solid
      return "";
  }
}

function lighten(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + 46);
  const g = Math.min(255, ((n >> 8) & 255) + 46);
  const b = Math.min(255, (n & 255) + 46);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

// ── product renderers ─────────────────────────────────────────────────

function tie(colors, pattern, accent) {
  const fill = pattern === "solid" ? "url(#fab)" : "url(#pat)";
  const defs =
    fabricGrad("fab", colors) + patternDef("pat", pattern, colors, accent);
  const edge =
    colors === C.ivory
      ? `<path d="M400 118 L455 158 L438 232 L362 232 L345 158 Z" fill="none" stroke="${LIGHT_EDGE}" stroke-width="2"/>
  <path d="M374 240 L426 240 L482 792 L400 902 L318 792 Z" fill="none" stroke="${LIGHT_EDGE}" stroke-width="2"/>`
      : "";
  return (
    svgOpen(defs) +
    `<g filter="url(#soft)">
  <path d="M400 118 L455 158 L438 232 L362 232 L345 158 Z" fill="${fill}"/>
  <path d="M400 118 L455 158 L438 232 L362 232 L345 158 Z" fill="url(#sheen)"/>
  <path d="M382 210 L400 238 L418 210" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="5"/>
  <path d="M374 240 L426 240 L482 792 L400 902 L318 792 Z" fill="${fill}"/>
  <path d="M374 240 L426 240 L482 792 L400 902 L318 792 Z" fill="url(#sheen)"/>
  <path d="M374 240 L426 240 L482 792 L400 902 L318 792 Z" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="2"/>
  ${edge}
</g>` +
    svgClose
  );
}

function pocketSquare(colors, pattern, accent) {
  const fill = pattern === "solid" ? "url(#fab)" : "url(#pat)";
  const defs =
    fabricGrad("fab", colors) + patternDef("pat", pattern, colors, accent);
  const border =
    accent && pattern === "solid"
      ? `<rect x="-190" y="-190" width="380" height="380" fill="none" stroke="${accent}" stroke-width="14" opacity="0.9"/>`
      : "";
  return (
    svgOpen(defs) +
    `<g filter="url(#soft)" transform="translate(400 500) rotate(45)">
  <rect x="-230" y="-230" width="460" height="460" fill="${fill}"/>
  ${border}
  <rect x="-230" y="-230" width="460" height="460" fill="url(#sheen)"/>
  <path d="M-230 -230 L230 230" stroke="#000" stroke-opacity="0.18" stroke-width="3"/>
  <path d="M-230 230 L230 -230" stroke="#FFF" stroke-opacity="0.06" stroke-width="60"/>
  <rect x="-230" y="-230" width="460" height="460" fill="none" stroke="#000" stroke-opacity="0.3" stroke-width="2"/>
  ${colors === C.ivory ? `<rect x="-230" y="-230" width="460" height="460" fill="none" stroke="${LIGHT_EDGE}" stroke-width="2"/>` : ""}
</g>` +
    svgClose
  );
}

function cufflinks(metal, shape, stone) {
  const defs =
    metalGrad("met", metal) +
    `<radialGradient id="stone" cx="40%" cy="35%" r="75%">
  <stop offset="0%" stop-color="${lighten(stone)}"/>
  <stop offset="100%" stop-color="${stone}"/>
</radialGradient>`;
  const edge =
    metal === "silver" || metal === "pearl"
      ? ` stroke="${LIGHT_EDGE}" stroke-width="2"`
      : "";
  const face = (x, y, s) => {
    const shapes = {
      round: `<circle cx="${x}" cy="${y}" r="${s}" fill="url(#met)"${edge}/>
<circle cx="${x}" cy="${y}" r="${s * 0.62}" fill="url(#stone)"/>
<circle cx="${x}" cy="${y}" r="${s * 0.62}" fill="none" stroke="#000" stroke-opacity="0.25"/>`,
      square: `<rect x="${x - s}" y="${y - s}" width="${s * 2}" height="${s * 2}" rx="10" fill="url(#met)"${edge}/>
<rect x="${x - s * 0.62}" y="${y - s * 0.62}" width="${s * 1.24}" height="${s * 1.24}" rx="6" fill="url(#stone)"/>`,
      hex: `<path d="${hexPath(x, y, s)}" fill="url(#met)"${edge}/>
<path d="${hexPath(x, y, s * 0.6)}" fill="url(#stone)"/>`,
      knot: `<circle cx="${x - s * 0.22}" cy="${y - s * 0.12}" r="${s * 0.62}" fill="none" stroke="url(#met)" stroke-width="${s * 0.36}"/>
<circle cx="${x + s * 0.26}" cy="${y + s * 0.18}" r="${s * 0.62}" fill="none" stroke="url(#met)" stroke-width="${s * 0.36}"/>`,
      bar: `<rect x="${x - s * 1.5}" y="${y - s * 0.45}" width="${s * 3}" height="${s * 0.9}" rx="${s * 0.4}" fill="url(#met)"${edge}/>`,
    };
    return shapes[shape];
  };
  return (
    svgOpen(defs) +
    `<g filter="url(#soft)">
  <ellipse cx="340" cy="470" rx="14" ry="40" fill="url(#met)" opacity="0.7" transform="rotate(-18 340 470)"/>
  <ellipse cx="480" cy="590" rx="14" ry="40" fill="url(#met)" opacity="0.7" transform="rotate(-18 480 590)"/>
  ${face(330, 440, 92)}
  ${face(474, 566, 92)}
</g>` +
    svgClose
  );
}

function hexPath(x, y, r) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(`${x + r * Math.cos(a)} ${y + r * Math.sin(a)}`);
  }
  return `M${pts.join(" L")} Z`;
}

function brooch(variant, metal, stone) {
  const defs =
    metalGrad("met", metal) +
    metalGrad("pearl", "pearl") +
    `<radialGradient id="stone" cx="40%" cy="35%" r="75%">
  <stop offset="0%" stop-color="${lighten(stone)}"/>
  <stop offset="100%" stop-color="${stone}"/>
</radialGradient>`;

  let art = "";
  if (variant === "pearl-drop") {
    const dots = Array.from({ length: 12 }, (_, i) => {
      const a = (Math.PI / 6) * i;
      return `<circle cx="${400 + 74 * Math.cos(a)}" cy="${400 + 74 * Math.sin(a)}" r="8" fill="#F4EFE6" opacity="0.95"/>`;
    }).join("");
    art = `<circle cx="400" cy="400" r="96" fill="url(#met)"/>
<circle cx="400" cy="400" r="52" fill="url(#stone)"/>
${dots}
<line x1="400" y1="496" x2="400" y2="548" stroke="url(#met)" stroke-width="7"/>
<circle cx="400" cy="590" r="42" fill="url(#pearl)" stroke="${LIGHT_EDGE}" stroke-width="2"/>`;
  } else if (variant === "peacock") {
    const feathers = Array.from({ length: 7 }, (_, i) => {
      const a = -90 + (i - 3) * 22;
      return `<g transform="rotate(${a} 400 560)">
  <ellipse cx="400" cy="404" rx="26" ry="88" fill="url(#stone)" opacity="0.9"/>
  <circle cx="400" cy="372" r="11" fill="url(#met)"/>
</g>`;
    }).join("");
    art = `${feathers}
<ellipse cx="400" cy="560" rx="46" ry="64" fill="url(#met)"/>
<circle cx="400" cy="480" r="20" fill="url(#met)"/>
<circle cx="394" cy="474" r="4" fill="#0E0F12"/>`;
  } else if (variant === "leaf") {
    art = `<g transform="rotate(-24 400 500)">
  <path d="M400 300 C480 380 486 560 400 690 C314 560 320 380 400 300 Z" fill="url(#met)"/>
  <line x1="400" y1="330" x2="400" y2="660" stroke="#00000055" stroke-width="4"/>
  ${Array.from({ length: 6 }, (_, i) => {
    const y = 380 + i * 48;
    return `<path d="M400 ${y} L${352 - i * 2} ${y + 34} M400 ${y} L${448 + i * 2} ${y + 34}" stroke="#00000040" stroke-width="3" fill="none"/>`;
  }).join("")}
</g>`;
  } else if (variant === "starburst") {
    const rays = Array.from({ length: 12 }, (_, i) => {
      const a = (Math.PI / 6) * i;
      const x1 = 400 + 58 * Math.cos(a);
      const y1 = 500 + 58 * Math.sin(a);
      const x2 = 400 + 168 * Math.cos(a);
      const y2 = 500 + 168 * Math.sin(a);
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="url(#met)" stroke-width="16" stroke-linecap="round"/>
<circle cx="${x2}" cy="${y2}" r="7" fill="#F4EFE6" opacity="0.9" stroke="${LIGHT_EDGE}" stroke-width="1.5"/>`;
    }).join("");
    art = `${rays}
<circle cx="400" cy="500" r="54" fill="url(#stone)"/>
<circle cx="400" cy="500" r="54" fill="none" stroke="url(#met)" stroke-width="8"/>`;
  } else {
    // stone — floral mount
    const petals = Array.from({ length: 8 }, (_, i) => {
      const a = 45 * i;
      return `<ellipse cx="400" cy="404" rx="30" ry="72" fill="url(#met)" opacity="0.92" transform="rotate(${a} 400 500)"/>`;
    }).join("");
    art = `${petals}
<circle cx="400" cy="500" r="62" fill="url(#stone)"/>
<circle cx="400" cy="500" r="62" fill="none" stroke="url(#met)" stroke-width="6"/>
<ellipse cx="382" cy="478" rx="14" ry="8" fill="#FFFFFF" opacity="0.35" transform="rotate(-30 382 478)"/>`;
  }
  return svgOpen(defs) + `<g filter="url(#soft)">${art}</g>` + svgClose;
}

function buttons(metal, layout) {
  const defs = metalGrad("met", metal);
  const edge =
    metal === "silver" || metal === "pearl"
      ? ` stroke="${LIGHT_EDGE}" stroke-width="2"`
      : "";
  const button = (x, y, r, style) => {
    const holes =
      style === "4hole"
        ? `<circle cx="${x - r * 0.28}" cy="${y - r * 0.28}" r="${r * 0.09}" fill="#000" opacity="0.55"/>
<circle cx="${x + r * 0.28}" cy="${y - r * 0.28}" r="${r * 0.09}" fill="#000" opacity="0.55"/>
<circle cx="${x - r * 0.28}" cy="${y + r * 0.28}" r="${r * 0.09}" fill="#000" opacity="0.55"/>
<circle cx="${x + r * 0.28}" cy="${y + r * 0.28}" r="${r * 0.09}" fill="#000" opacity="0.55"/>`
        : style === "crest"
          ? `<path d="M${x} ${y - r * 0.45} C ${x + r * 0.4} ${y - r * 0.1} ${x + r * 0.3} ${y + r * 0.35} ${x} ${y + r * 0.5} C ${x - r * 0.3} ${y + r * 0.35} ${x - r * 0.4} ${y - r * 0.1} ${x} ${y - r * 0.45} Z" fill="none" stroke="#00000066" stroke-width="3"/>`
          : `<circle cx="${x}" cy="${y}" r="${r * 0.16}" fill="#000" opacity="0.4"/>`;
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#met)"${edge}/>
<circle cx="${x}" cy="${y}" r="${r * 0.82}" fill="none" stroke="#00000040" stroke-width="2.5"/>
${holes}`;
  };

  let art = "";
  if (layout === "blazer") {
    art =
      button(330, 400, 88, "crest") +
      button(470, 400, 88, "crest") +
      [0, 1, 2].map((i) => button(295 + i * 105, 600, 54, "crest")).join("");
  } else if (layout === "kurta") {
    const xs = [220, 310, 400, 490, 580];
    const chain = `<path d="M220 500 C 280 540 340 540 400 500 C 460 540 520 540 580 500" fill="none" stroke="url(#met)" stroke-width="5" opacity="0.8"/>`;
    art = chain + xs.map((x, i) => button(x, 460 + (i % 2) * 26, 52, "shank")).join("");
  } else if (layout === "shirt") {
    art = [0, 1, 2, 3, 4, 5]
      .map((i) =>
        button(300 + (i % 3) * 100, 420 + Math.floor(i / 3) * 130, 46, "4hole"),
      )
      .join("");
  } else {
    art =
      button(340, 420, 80, "4hole") +
      button(462, 420, 80, "4hole") +
      [0, 1, 2].map((i) => button(300 + i * 100, 610, 48, "4hole")).join("");
  }
  return svgOpen(defs) + `<g filter="url(#soft)">${art}</g>` + svgClose;
}

function giftSet(items, colors, accent) {
  const defs =
    fabricGrad("fab", colors) +
    metalGrad("met", "gold") +
    patternDef("pat", "diamond", colors, accent);
  const icons = {
    tie: `<g transform="translate(-120 0) scale(0.55)">
  <path d="M0 -180 L34 -152 L22 -100 L-22 -100 L-34 -152 Z" fill="url(#fab)"/>
  <path d="M-18 -95 L18 -95 L52 240 L0 306 L-52 240 Z" fill="url(#fab)"/>
  <path d="M-18 -95 L18 -95 L52 240 L0 306 L-52 240 Z" fill="url(#sheen)"/>
</g>`,
    square: `<g transform="translate(112 66) rotate(45)">
  <rect x="-74" y="-74" width="148" height="148" fill="url(#pat)"/>
  <rect x="-74" y="-74" width="148" height="148" fill="url(#sheen)"/>
</g>`,
    cufflinks: `<g transform="translate(96 -96)">
  <circle cx="-20" cy="0" r="34" fill="url(#met)"/>
  <circle cx="34" cy="44" r="34" fill="url(#met)"/>
  <circle cx="-20" cy="0" r="19" fill="#17181C"/>
  <circle cx="34" cy="44" r="19" fill="#17181C"/>
</g>`,
    brooch: `<g transform="translate(-110 -60)">
  <circle cx="0" cy="0" r="44" fill="url(#met)"/>
  <circle cx="0" cy="0" r="22" fill="#7A2534"/>
  <circle cx="0" cy="66" r="20" fill="#EDE2CF"/>
  <line x1="0" y1="44" x2="0" y2="46" stroke="url(#met)" stroke-width="5"/>
</g>`,
    buttons: `<g transform="translate(-10 130)">
  ${[0, 1, 2].map((i) => `<circle cx="${-60 + i * 60}" cy="0" r="24" fill="url(#met)"/>`).join("")}
</g>`,
  };
  return (
    svgOpen(defs) +
    `<g filter="url(#soft)">
  <rect x="170" y="230" width="460" height="540" rx="6" fill="#1D1D22" stroke="${GOLD}" stroke-opacity="0.75" stroke-width="2.5"/>
  <rect x="188" y="248" width="424" height="504" rx="4" fill="none" stroke="${GOLD}" stroke-opacity="0.3" stroke-width="1.5"/>
  <path d="M170 320 L630 320" stroke="${GOLD}" stroke-opacity="0.5" stroke-width="1.5"/>
  <text x="400" y="296" font-family="Georgia, serif" font-size="26" letter-spacing="6" fill="${GOLD}" text-anchor="middle">FASTENO SHYAMA</text>
  <g transform="translate(400 540)">${items.map((i) => icons[i]).join("")}</g>
</g>` +
    svgClose
  );
}

// detail close-up: oversized pattern/material crop
function detail(kind, colors, pattern, accent, metal) {
  if (kind === "metal") {
    const defs =
      metalGrad("met", metal) +
      `<linearGradient id="brush" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0"/>
  <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.10"/>
  <stop offset="100%" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>`;
    return (
      svgOpen(defs) +
      `<rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="url(#met)"/>
<rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="url(#brush)"/>
${Array.from({ length: 24 }, (_, i) => `<line x1="60" y1="${90 + i * 36}" x2="${W - 60}" y2="${90 + i * 36}" stroke="#000" stroke-opacity="0.05" stroke-width="2"/>`).join("")}
<rect x="60" y="60" width="${W - 120}" height="${H - 120}" fill="none" stroke="#000" stroke-opacity="0.4" stroke-width="2"/>` +
      svgClose
    );
  }
  const fill = pattern === "solid" ? "url(#fab)" : "url(#pat)";
  const defs =
    fabricGrad("fab", colors) + patternDef("pat", pattern, colors, accent);
  return (
    svgOpen(
      defs +
        `<linearGradient id="light" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.10"/>
  <stop offset="55%" stop-color="#FFFFFF" stop-opacity="0"/>
</linearGradient>`,
    ) +
    `<g transform="rotate(-8 400 500)">
  <rect x="-100" y="-100" width="1000" height="1200" fill="${fill}"/>
  <rect x="-100" y="-100" width="1000" height="1200" fill="url(#light)"/>
</g>
<rect x="26" y="26" width="${W - 52}" height="${H - 52}" fill="none" stroke="${GOLD}" stroke-opacity="0.28" stroke-width="1.5"/>` +
    svgClose
  );
}

// ── manifest: slug → renderer args ────────────────────────────────────
const products = [
  // ties
  { slug: "midnight-navy-silk-tie", main: () => tie(C.navy, "solid"), det: () => detail("fabric", C.navy, "solid") },
  { slug: "charcoal-herringbone-tie", main: () => tie(C.charcoal, "herringbone"), det: () => detail("fabric", C.charcoal, "herringbone") },
  { slug: "burgundy-repp-stripe-tie", main: () => tie(C.burgundy, "stripe", GOLD), det: () => detail("fabric", C.burgundy, "stripe", GOLD) },
  { slug: "regimental-navy-gold-stripe-tie", main: () => tie(C.navy, "stripe", "#D8B96A"), det: () => detail("fabric", C.navy, "stripe", "#D8B96A") },
  { slug: "ivory-wedding-jacquard-tie", main: () => tie(C.ivory, "diamond"), det: () => detail("fabric", C.ivory, "diamond") },
  { slug: "forest-green-grenadine-tie", main: () => tie(C.green, "diamond"), det: () => detail("fabric", C.green, "diamond") },
  { slug: "steel-grey-pin-dot-tie", main: () => tie(C.grey, "dot", "#EDE4CF"), det: () => detail("fabric", C.grey, "dot", "#EDE4CF") },
  { slug: "black-satin-formal-tie", main: () => tie(C.black, "solid"), det: () => detail("fabric", C.black, "solid") },
  // cufflinks
  { slug: "gold-tone-knot-cufflinks", main: () => cufflinks("gold", "knot", "#8A6C2F"), det: () => detail("metal", null, null, null, "gold") },
  { slug: "onyx-square-cufflinks", main: () => cufflinks("silver", "square", "#101114"), det: () => detail("metal", null, null, null, "silver") },
  { slug: "mother-of-pearl-round-cufflinks", main: () => cufflinks("gold", "round", "#EDE2CF"), det: () => detail("metal", null, null, null, "pearl") },
  { slug: "gunmetal-hexagon-cufflinks", main: () => cufflinks("gunmetal", "hex", "#3E434C"), det: () => detail("metal", null, null, null, "gunmetal") },
  { slug: "royal-blue-enamel-cufflinks", main: () => cufflinks("silver", "round", "#1D3FA8"), det: () => detail("metal", null, null, null, "silver") },
  { slug: "silver-bar-cufflinks", main: () => cufflinks("silver", "bar", "#C3C7CF"), det: () => detail("metal", null, null, null, "silver") },
  // brooches
  { slug: "pearl-drop-sherwani-brooch", main: () => brooch("pearl-drop", "gold", "#C6A75E"), det: () => detail("metal", null, null, null, "gold") },
  { slug: "kundan-peacock-brooch", main: () => brooch("peacock", "gold", "#14523F"), det: () => detail("metal", null, null, null, "gold") },
  { slug: "minimal-gold-leaf-lapel-pin", main: () => brooch("leaf", "gold", "#C6A75E"), det: () => detail("metal", null, null, null, "gold") },
  { slug: "crystal-starburst-brooch", main: () => brooch("starburst", "silver", "#F2F3F6"), det: () => detail("metal", null, null, null, "silver") },
  { slug: "ruby-red-stone-brooch", main: () => brooch("stone", "gold", "#8E1F2F"), det: () => detail("metal", null, null, null, "gold") },
  // pocket squares
  { slug: "ivory-silk-pocket-square", main: () => pocketSquare(C.ivory, "solid"), det: () => detail("fabric", C.ivory, "solid") },
  { slug: "burgundy-paisley-pocket-square", main: () => pocketSquare(C.burgundy, "paisley", GOLD), det: () => detail("fabric", C.burgundy, "paisley", GOLD) },
  { slug: "navy-polka-pocket-square", main: () => pocketSquare(C.navy, "dot", "#EDE4CF"), det: () => detail("fabric", C.navy, "dot", "#EDE4CF") },
  { slug: "gold-contrast-border-pocket-square", main: () => pocketSquare(C.charcoal, "solid", GOLD), det: () => detail("fabric", C.charcoal, "solid", GOLD) },
  { slug: "emerald-printed-pocket-square", main: () => pocketSquare(C.green, "medallion", "#EDE4CF"), det: () => detail("fabric", C.green, "medallion", "#EDE4CF") },
  // buttons
  { slug: "golden-brass-blazer-buttons", main: () => buttons("gold", "blazer"), det: () => detail("metal", null, null, null, "gold") },
  { slug: "antique-silver-kurta-buttons", main: () => buttons("silver", "kurta"), det: () => detail("metal", null, null, null, "silver") },
  { slug: "mother-of-pearl-shirt-buttons", main: () => buttons("pearl", "shirt"), det: () => detail("metal", null, null, null, "pearl") },
  { slug: "black-horn-suit-buttons", main: () => buttons("horn", "suit"), det: () => detail("metal", null, null, null, "horn") },
  // gift sets
  { slug: "the-monarch-gift-set", main: () => giftSet(["tie", "square", "cufflinks"], C.navy, GOLD), det: () => detail("fabric", C.navy, "diamond", GOLD) },
  { slug: "the-heir-wedding-set", main: () => giftSet(["brooch", "square", "buttons"], C.burgundy, GOLD), det: () => detail("metal", null, null, null, "gold") },
  { slug: "the-boardroom-set", main: () => giftSet(["tie", "cufflinks"], C.charcoal, GOLD), det: () => detail("fabric", C.charcoal, "herringbone") },
];

let count = 0;
for (const p of products) {
  writeFileSync(join(outDir, `${p.slug}.svg`), p.main());
  writeFileSync(join(outDir, `${p.slug}-detail.svg`), p.det());
  count += 2;
}
console.log(`Generated ${count} SVGs for ${products.length} products → public/products/`);

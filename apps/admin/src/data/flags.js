// Small inline SVG line-icons for "symbol" beats — deliberately NOT
// Unicode emoji: those are font-dependent (several common platforms
// fall back to rendering a glyph sequence as plain text), which
// defeats the point of a sign being instantly recognisable regardless
// of OS/font support. These aren't meant as pixel-accurate pictograms,
// just legible enough to read as "a sign you'd actually see." Every
// published destination's flag is instead a hand-built SVG from its
// three brand colours — see @holaday/content-engine's buildFlagSvg.
export const SYMBOLS = {
  baggage: `<svg viewBox="0 0 48 48" fill="none"><rect x="10" y="18" width="28" height="20" rx="3" stroke="currentColor" stroke-width="2.5"/><path d="M18 18v-5a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v5" stroke="currentColor" stroke-width="2.5"/><line x1="24" y1="24" x2="24" y2="32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  noPhoto: `<svg viewBox="0 0 48 48" fill="none"><rect x="7" y="14" width="34" height="22" rx="3" stroke="currentColor" stroke-width="2.5"/><circle cx="24" cy="25" r="6" stroke="currentColor" stroke-width="2.5"/><line x1="6" y1="8" x2="42" y2="40" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  quiet: `<svg viewBox="0 0 48 48" fill="none"><path d="M9 19h6l10-8v26l-10-8H9z" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/><line x1="7" y1="7" x2="41" y2="41" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  stamp: `<svg viewBox="0 0 48 48" fill="none"><rect x="9" y="9" width="30" height="20" rx="2" stroke="currentColor" stroke-width="2.5"/><path d="M15 30l4 9 5-7 5 7 4-9" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/></svg>`,
  meter: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2.5"/><line x1="24" y1="24" x2="24" y2="13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="24" x2="32" y2="29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><circle cx="24" cy="24" r="2" fill="currentColor"/></svg>`,
  reserved: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="15" r="6" stroke="currentColor" stroke-width="2.5"/><path d="M11 39c0-9 6-15 13-15s13 6 13 15" stroke="currentColor" stroke-width="2.5"/><path d="M33 11l4 4-4 4" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/></svg>`,
  priority: `<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="16" stroke="currentColor" stroke-width="2.5"/><path d="M16 26l6 6 11-14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
};

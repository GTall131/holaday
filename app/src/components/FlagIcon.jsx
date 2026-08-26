// Flags are small inline SVGs (see the iconography rationale at the
// top of data/flags.js), not Unicode flag emoji. `markup` is trusted,
// locally-built SVG source (either a hand-authored FLAGS entry or
// data/admin.js's buildFlagSvg output), never user-supplied HTML.
export default function FlagIcon({ markup, className = "", style }){
  return (
    <span
      className={`flag-icon ${className}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

// Flags are small inline SVGs, not Unicode flag emoji (font-dependent
// — see the SYMBOLS rationale at the top of data/flags.js, which
// applies here too). `markup` is trusted, locally-built SVG source
// (data/admin.js's buildFlagSvg output), never user-supplied HTML.
export default function FlagIcon({ markup, className = "", style }){
  return (
    <span
      className={`flag-icon ${className}`.trim()}
      style={style}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}

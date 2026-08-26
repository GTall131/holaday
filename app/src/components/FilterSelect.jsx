export default function FilterSelect({ id, label, value, onChange, options, allLabel }){
  return (
    <>
      <label className="field-label" htmlFor={id} style={{ marginTop: "16px" }}>{label}</label>
      <select className="admin-select" id={id} value={value} onChange={e => onChange(e.target.value)} style={{ marginBottom: "16px" }}>
        <option value="">{allLabel}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </>
  );
}

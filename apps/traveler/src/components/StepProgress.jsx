export default function StepProgress({ step, total, label }){
  return (
    <div className="step-progress">
      <div className="step-progress__track">
        <div className="step-progress__fill" style={{ width: `${(step / total) * 100}%` }} />
      </div>
      <p className="step-progress__label">{label}</p>
    </div>
  );
}

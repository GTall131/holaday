import { useEffect, useState } from "react";
import { finalizePersonaGeneration } from "../store";

// Same "signature motion" split-flap treatment as the traveler-facing
// Generating screen — reused here rather than invented fresh, so the
// two async-feeling moments in the product read as one visual
// language, not two.
const STEPS = ["READING OUTLINE", "DRAFTING TRAVELER PROFILE", "CHECKING TONE & DETAIL"];

export default function AdminPersonaGenerating({ payload }){
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < STEPS.length) setStepIndex(i);
    }, 380);
    const timeout = setTimeout(() => {
      clearInterval(iv);
      finalizePersonaGeneration(payload.id);
    }, 380 * STEPS.length + 250);
    return () => { clearInterval(iv); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="generating">
      <div className="flap">{STEPS[stepIndex]}</div>
      <div className="spinner-dots"><span></span><span></span><span></span></div>
      <div className="generating__sub">Stub: fleshing out this persona from your outline — no live model call yet.</div>
    </div>
  );
}

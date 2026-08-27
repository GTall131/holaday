import { useEffect, useState } from "react";
import { finalizeContentGeneration } from "../store";

const STEPS = ["READING PERSONA", "DRAFTING MODULE & LESSON", "WRITING PHRASES", "SAVING TO CONTENT BANK"];

export default function AdminPersonaGeneratingContent({ payload }){
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < STEPS.length) setStepIndex(i);
    }, 380);
    const timeout = setTimeout(() => {
      clearInterval(iv);
      finalizeContentGeneration(payload);
    }, 380 * STEPS.length + 250);
    return () => { clearInterval(iv); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="generating">
      <div className="flap">{STEPS[stepIndex]}</div>
      <div className="spinner-dots"><span></span><span></span><span></span></div>
      <div className="generating__sub">Stub: generating a starter Module, Lesson, and Phrases — no live model call yet.</div>
    </div>
  );
}

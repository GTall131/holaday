import { useState } from "react";
import { SYMBOLS } from "../data/flags";

// Renders one lesson "beat" (a single scenario-framed question — see
// the full design rationale at the top of screens/Lesson.jsx) and
// owns the answered/unanswered state for it. Mount this with a `key`
// that changes per question (stepIndex, or preview index)
// so navigating to a different question — or back to a previous one —
// naturally resets to "fresh, unanswered" via remount, the same
// one-attempt-per-question spirit as the original.
export default function BeatCard({ beat, onAnswered }){
  const [result, setResult] = useState(null); // { choiceIndex, isCorrect }

  function choose(choiceIndex){
    if (result) return; // one attempt per question
    const isCorrect = choiceIndex === beat.correctIndex;
    const next = { choiceIndex, isCorrect };
    setResult(next);
    if (onAnswered) onAnswered(next);
  }

  const visual = beat.kind === "symbol"
    ? <div className="beat-symbol"><span className="beat-symbol__icon" dangerouslySetInnerHTML={{ __html: SYMBOLS[beat.symbol] }} /></div>
    : beat.kind === "comprehend"
    ? <div className="beat-heard">&quot;{beat.heard}&quot;</div>
    : null;

  return (
    <div className="beat-card">
      <div className="beat-card__context">{beat.context}</div>
      {visual}
      <div className="beat-card__question">{beat.q}</div>
      {beat.options.map((opt, oi) => {
        const state = result ? (oi === beat.correctIndex ? "correct" : (oi === result.choiceIndex ? "wrong" : undefined)) : undefined;
        return (
          <button key={oi} className="quiz__opt" data-state={state} onClick={() => choose(oi)}>
            {opt}
          </button>
        );
      })}
      <div className={`quiz__feedback`} data-tone={result ? (result.isCorrect ? "good" : "bad") : undefined}>
        {result ? (result.isCorrect ? "Correct — nicely done." : `Not quite — it's "${beat.options[beat.correctIndex]}".`) : ""}
      </div>
    </div>
  );
}

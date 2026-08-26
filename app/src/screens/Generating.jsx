import { useEffect, useState } from "react";
import { finalizeCourse } from "../store";

/* ================================================================
   SCREEN: GENERATING — signature split-flap moment

   This is the one place the prototype spends its "signature motion"
   budget: a split-flap-style status line cycling through synthesis
   steps, echoing the departure-board identity from Home.jsx, before
   auto-advancing into the freshly generated course.

   ASSUMPTION: showing named synthesis steps ("SCANNING PHRASEBOOK,"
   "WEIGHTING BY TRIP TYPE," etc.) builds trust that the course is
   genuinely personalized to the user's trip — rather than reading as
   generic loading-screen theater that users see through and discount.

   HYPOTHESIS: we believe naming specific weighting/sequencing steps
   (vs. a generic spinner) increases users' perceived personalization
   of the resulting course. We'll know this is wrong if users can't
   recall or don't believe the steps reflected real personalization
   when asked afterward.

   VALIDATION METRIC: post-generation micro-survey (single question,
   e.g. "How tailored does this course feel to your trip?" 1-5)
   compared between a group that sees this step-by-step flap animation
   vs. a plain spinner control.
   ================================================================ */
const STEPS = ["SCANNING PHRASEBOOK", "WEIGHTING BY TRIP TYPE", "SEQUENCING 6–8 WEEKS", "PRINTING BOARDING PASS"];

export default function Generating({ payload }){
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i < STEPS.length) setStepIndex(i);
    }, 420);
    const timeout = setTimeout(() => {
      clearInterval(iv);
      finalizeCourse(payload);
    }, 420 * STEPS.length + 250);
    return () => { clearInterval(iv); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="generating">
      <div className="flap">{STEPS[stepIndex]}</div>
      <div className="spinner-dots"><span></span><span></span><span></span></div>
      <div className="generating__sub">Building your course from real, weighted phrase priority — arrival first, small talk later.</div>
    </div>
  );
}

import StepProgress from "../components/StepProgress";
import { finishOnboarding } from "../store";

/* ================================================================
   SCREEN: ONBOARDING — TRIP BOOKED? (step 3 of 3)
   The branch point: tapping an answer both finishes onboarding (the
   'Account Onboarded' milestone, see store.js finishOnboarding) and
   navigates in the same tap — same immediate-action pattern
   CountryPicker's cards use — rather than picking an answer, then
   needing a separate Continue tap.
   ================================================================ */
export default function OnboardingTripBooked(){
  return (
    <>
      <StepProgress
        step={3}
        total={3}
        label="Last thing — do you already have a trip booked?"
      />
      <div className="feedback-yn onboarding-yn">
        <button onClick={() => finishOnboarding(true)}>Yes, it's booked</button>
        <button onClick={() => finishOnboarding(false)}>Not yet</button>
      </div>
    </>
  );
}

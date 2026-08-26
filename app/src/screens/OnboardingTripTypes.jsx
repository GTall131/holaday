import StepProgress from "../components/StepProgress";
import { state, toggleOnboardingTripType, continueOnboardingTripTypes } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

/* ================================================================
   SCREEN: ONBOARDING — TRIP TYPES (step 2 of 3)
   Multi-select over the same TRIP_TYPES chips TripDetails.jsx uses
   for a single course, except here it's "what excites you in
   general" rather than "what is this one trip" — so unlike
   TripDetails, more than one chip can be selected at once.
   ================================================================ */
export default function OnboardingTripTypes(){
  const selected = state.onboardingDraft.tripTypes;
  return (
    <>
      <StepProgress
        step={2}
        total={3}
        label="What kinds of trips are you usually planning? Pick as many as apply."
      />
      <div className="chip-grid">
        {Object.entries(TRIP_TYPES).map(([key, t]) => (
          <button
            key={key}
            className="chip"
            data-selected={selected.includes(key)}
            onClick={() => toggleOnboardingTripType(key)}
          >
            <span className="chip__label">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="sticky-cta">
        <button className="btn-primary" onClick={continueOnboardingTripTypes}>Continue</button>
      </div>
    </>
  );
}

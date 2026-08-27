import FlagIcon from "../components/FlagIcon";
import StepProgress from "../components/StepProgress";
import { state, publishedDestinations, adminFlagMarkup, toggleOnboardingCountry, continueOnboardingCountries } from "../store";

/* ================================================================
   SCREEN: ONBOARDING — COUNTRIES VISITED (step 1 of 3)
   Multi-select against the same published-destinations list
   CountryPicker.jsx uses (see its ASSUMPTION note on that list's
   coverage) — reusing it here means every option shown is a country
   this app can actually theme a course around later, rather than a
   free-standing world-country list with no matching content.
   Selecting none is a valid answer (a first-time traveler), so
   Continue is never disabled here.
   ================================================================ */
export default function OnboardingCountries(){
  const destinations = publishedDestinations();
  const selected = state.onboardingDraft.countriesVisited;
  return (
    <>
      <StepProgress
        step={1}
        total={3}
        label="Which of these have you already visited? It's fine to pick none."
      />
      <div className="country-grid">
        {destinations.map(d => (
          <button
            key={d.countryKey}
            className="country-card"
            data-selected={selected.includes(d.countryKey)}
            onClick={() => toggleOnboardingCountry(d.countryKey)}
          >
            <FlagIcon markup={adminFlagMarkup(d)} className="country-card__flag" />
            <span className="country-card__body">
              <div className="country-card__name">{d.data.name}</div>
              <div className="country-card__capital">{d.data.capital}</div>
            </span>
          </button>
        ))}
      </div>
      <div className="sticky-cta">
        <button className="btn-primary" onClick={continueOnboardingCountries}>Continue</button>
      </div>
    </>
  );
}

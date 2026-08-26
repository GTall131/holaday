import FlagIcon from "../components/FlagIcon";
import { publishedDestinations, adminFlagMarkup, selectCountry } from "../store";

/* ================================================================
   SCREEN: COUNTRY PICKER

   ASSUMPTION: the published destinations available at any given time
   are a representative-enough sample of where early testers are
   actually traveling to validate the "trip-scoped course" concept —
   not an arbitrary set chosen because it looks good in a demo.

   HYPOTHESIS: we believe the destinations on offer cover enough of
   our early tester pool's actual trips that we can validate the core
   concept without broader country coverage yet. We'll know this
   assumption is wrong if a meaningful share of prospective testers'
   destinations aren't on the list.

   VALIDATION METRIC: during recruiting/onboarding, capture each early
   tester's actual destination (even before they use the app) and
   compare against the published-destinations list — track %
   mismatch. In-app, an "add a country" request tap (logged with
   free-text) as a lighter-weight ongoing signal once testing is live.
   ================================================================ */
export default function CountryPicker(){
  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 14px" }}>
        Step 1 of 2 — where are you headed? Your course will be themed around that destination.
      </p>
      <div className="country-grid">
        {publishedDestinations().map(d => (
          <button key={d.countryKey} className="country-card" onClick={() => selectCountry(d.countryKey)}>
            <FlagIcon markup={adminFlagMarkup(d)} className="country-card__flag" />
            <span className="country-card__body">
              <div className="country-card__name">{d.data.name}</div>
              <div className="country-card__capital">{d.data.capital}</div>
            </span>
          </button>
        ))}
      </div>
    </>
  );
}

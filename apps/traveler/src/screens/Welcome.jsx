import { goLogin, goSignup } from "../store";

/* ================================================================
   SCREEN: WELCOME
   The very first thing every traveler sees — no course, no account
   yet. Sign up is the primary CTA since a first-time visitor is the
   flow this prototype is built to validate (see onboarding screens);
   Log in is the lower-emphasis path back to an account created
   earlier this session.
   ================================================================ */
export default function Welcome(){
  return (
    <div className="welcome">
      <p className="welcome__blurb">
        A short, focused language & culture course built around your next trip — not a
        general course that takes months to finish.
      </p>
      <div className="welcome__actions">
        <button className="btn-primary" onClick={goSignup}>Sign up</button>
        <button className="btn-secondary" onClick={goLogin}>Log in</button>
      </div>
    </div>
  );
}

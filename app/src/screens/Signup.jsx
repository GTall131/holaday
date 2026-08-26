import { state, patchSignupDraft, submitSignup, goLogin } from "../store";

export default function Signup(){
  const d = state.signupDraft;
  return (
    <>
      <label className="field-label" htmlFor="signup-name">First name</label>
      <input
        className="field-input"
        id="signup-name"
        type="text"
        autoComplete="given-name"
        placeholder="Alex"
        value={d.firstName}
        onChange={e => patchSignupDraft({ firstName: e.target.value })}
      />
      <label className="field-label" htmlFor="signup-email">Email</label>
      <input
        className="field-input"
        id="signup-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={d.email}
        onChange={e => patchSignupDraft({ email: e.target.value })}
      />
      <label className="field-label" htmlFor="signup-password">Password</label>
      <input
        className="field-input"
        id="signup-password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 6 characters"
        value={d.password}
        onChange={e => patchSignupDraft({ password: e.target.value })}
      />
      <div className="sticky-cta">
        <button className="btn-primary" onClick={submitSignup}>Create account</button>
        <button className="btn-secondary auth-switch" onClick={goLogin}>Already have an account? Log in</button>
      </div>
    </>
  );
}

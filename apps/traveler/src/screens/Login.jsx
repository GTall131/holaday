import { state, patchLoginDraft, submitLogin, goSignup } from "../store";

export default function Login(){
  const d = state.loginDraft;
  return (
    <>
      <label className="field-label" htmlFor="login-email">Email</label>
      <input
        className="field-input"
        id="login-email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        value={d.email}
        onChange={e => patchLoginDraft({ email: e.target.value })}
      />
      <label className="field-label" htmlFor="login-password">Password</label>
      <input
        className="field-input"
        id="login-password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={d.password}
        onChange={e => patchLoginDraft({ password: e.target.value })}
      />
      <div className="sticky-cta">
        <button className="btn-primary" onClick={submitLogin}>Log in</button>
        <button className="btn-secondary auth-switch" onClick={goSignup}>New here? Create an account</button>
      </div>
    </>
  );
}

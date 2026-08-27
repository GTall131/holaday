import { state, patchLoginDraft, submitLogin } from "../store";

// No signup here on purpose — see supabase/README.md: an admin account
// is created by signing up through Supabase Auth directly and then
// inserting the resulting auth.users id into holaday-admin's
// admin_users table (service role/dashboard), not through this app.
export default function Login(){
  const d = state.loginDraft;
  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 20px" }}>
        Holaday content authoring. Ask an existing admin to add your account if you don't have access.
      </p>
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
      </div>
    </>
  );
}

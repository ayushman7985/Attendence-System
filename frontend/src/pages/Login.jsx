import { useState } from "react";
import { api, getErrorMessage } from "../api";
import { setSession } from "../authStorage";
import "./Login.css";

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        if (!companyName.trim()) {
          setError("Company name is required");
          setLoading(false);
          return;
        }

        await api.post("/signup", {
          company_name: companyName.trim(),
          email: email.trim(),
          password,
        });

        const loginRes = await api.post("/login", {
          email: email.trim(),
          password,
        });

        const session = {
          company: loginRes.data.company,
          email: email.trim(),
        };
        setSession(session);
        onLogin(session);
      } else {
        const res = await api.post("/login", {
          email: email.trim(),
          password,
        });

        const session = {
          company: res.data.company,
          email: email.trim(),
        };
        setSession(session);
        onLogin(session);
      }
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          mode === "login" ? "Login failed. Check your credentials." : "Signup failed."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />

      <div className="login-layout">
        <aside className="login-hero">
          <div>
            <div className="login-hero__logo" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
            </div>
            <h1 className="login-hero__title">Attendance System</h1>
            <p className="login-hero__text">
              Sign in to manage employees, mark attendance, and view records for your company.
            </p>
          </div>

          <ul className="login-hero__features">
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Track daily presence
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Manage your team
            </li>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
              Secure company login
            </li>
          </ul>
        </aside>

        <div className="login-card">
          <div className="login-card__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              className={`login-card__tab ${mode === "login" ? "is-active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`login-card__tab ${mode === "signup" ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              Sign up
            </button>
          </div>

          <h2 className="login-card__heading">
            {mode === "login" ? "Welcome back" : "Create account"}
          </h2>
          <p className="login-card__sub">
            {mode === "login"
              ? "Enter your company email and password"
              : "Register your company to get started"}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {mode === "signup" && (
              <div className="login-form__group">
                <label className="login-form__label" htmlFor="company">
                  Company name
                </label>
                <input
                  id="company"
                  className="login-form__input"
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  autoComplete="organization"
                  required
                />
              </div>
            )}

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                className="login-form__input"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                className="login-form__input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                required
                minLength={4}
              />
            </div>

            {error && <p className="login-form__error">{error}</p>}

            <button type="submit" className="login-form__submit" disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mode === "login" ? (
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                ) : (
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6" />
                )}
              </svg>
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign in"
                  : "Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { api, getErrorMessage } from "../api";
import { setSession } from "../authStorage";
import "./Login.css";

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function readInviteFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return (params.get("invite") || params.get("code") || "").trim().toUpperCase();
}

export default function Login({ onLogin }) {
  const [role, setRole] = useState("company");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyCode, setCompanyCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [inviteCompanyName, setInviteCompanyName] = useState("");

  const isEmployee = role === "employee";
  const isLogin = mode === "login";
  const usingInviteCode = !isLogin && isEmployee && companyCode.trim().length > 0;

  useEffect(() => {
    const invite = readInviteFromUrl();
    if (!invite) return;

    setRole("employee");
    setMode("signup");
    setCompanyCode(invite);
  }, []);

  useEffect(() => {
    if (!usingInviteCode) {
      setInviteCompanyName("");
      return;
    }

    let active = true;
    const code = companyCode.trim().toUpperCase();

    api
      .get("/invite/validate", { params: { code } })
      .then((res) => {
        if (active) setInviteCompanyName(res.data.company_name);
      })
      .catch(() => {
        if (active) setInviteCompanyName("");
      });

    return () => {
      active = false;
    };
  }, [companyCode, usingInviteCode]);

  const handleCompanySubmit = async () => {
    if (mode === "signup") {
      if (!companyName.trim()) {
        setError("Company name is required");
        return;
      }

      const res = await api.post("/signup", {
        company_name: companyName.trim(),
        email: email.trim(),
        password,
      });

      const session = {
        role: "company",
        company: res.data.company,
        email: res.data.email,
        token: res.data.access_token,
      };
      setSession(session);
      onLogin(session);
      return;
    }

    const res = await api.post("/login", {
      email: email.trim(),
      password,
    });

    const session = {
      role: "company",
      company: res.data.company,
      email: res.data.email,
      token: res.data.access_token,
    };
    setSession(session);
    onLogin(session);
  };

  const handleEmployeeSubmit = async () => {
    if (mode === "signup") {
      const payload = {
        email: email.trim(),
        password,
      };

      if (companyCode.trim()) {
        payload.company_code = companyCode.trim().toUpperCase();
        payload.name = fullName.trim();
      }

      const res = await api.post("/employee/signup", payload);

      const emp = res.data.employee;
      const session = {
        role: "employee",
        id: emp.id,
        name: emp.name,
        email: emp.email,
        total_leaves: emp.total_leaves,
        token: res.data.access_token,
      };
      setSession(session);
      onLogin(session);
      return;
    }

    const res = await api.post("/employee/login", {
      email: email.trim(),
      password,
    });

    const emp = res.data.employee;
    const session = {
      role: "employee",
      id: emp.id,
      name: emp.name,
      email: emp.email,
      total_leaves: emp.total_leaves,
      token: res.data.access_token,
    };
    setSession(session);
    onLogin(session);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isEmployee) {
        await handleEmployeeSubmit();
      } else {
        await handleCompanySubmit();
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

  const completeGoogleLogin = async (accessToken) => {
    setError("");
    setLoading(true);
    try {
      const res = await api.post("/auth/google", {
        access_token: accessToken,
        role,
      });

      if (res.data.role === "employee") {
        const emp = res.data.employee;
        const session = {
          role: "employee",
          id: emp.id,
          name: emp.name,
          email: emp.email,
          total_leaves: emp.total_leaves,
          token: res.data.access_token,
        };
        setSession(session);
        onLogin(session);
      } else {
        const session = {
          role: "company",
          company: res.data.company,
          email: res.data.email,
          token: res.data.access_token,
        };
        setSession(session);
        onLogin(session);
      }
    } catch (err) {
      setError(getErrorMessage(err, "Google sign-in failed."));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => {
    setError("");

    if (!window.google?.accounts?.oauth2) {
      setError("Google library is still loading. Please try again.");
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: "openid email profile",
      callback: (response) => {
        if (response.error || !response.access_token) {
          setError("Google sign-in was cancelled.");
          return;
        }
        completeGoogleLogin(response.access_token);
      },
    });

    client.requestAccessToken();
  };

  return (
    <div className="login-page">
      <div className="login-page__bg" />

      <div className="login-layout">
        <aside className="login-hero">
          <div className="login-hero__dots" aria-hidden />

          <div className="login-hero__top">
            <div className="login-hero__logo" aria-hidden>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
              </svg>
            </div>
            <h1 className="login-hero__title">
              Attendance
              <br />
              <span className="login-hero__title-accent">System</span>
            </h1>
            <p className="login-hero__text">
              Sign in to manage employees, mark attendance, and view records for your company.
            </p>

            <div className="login-hero__features">
              <div className="login-feature">
                <span className="login-feature__icon login-feature__icon--blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 14l3-4 3 2 4-6" />
                  </svg>
                </span>
                <div>
                  <p className="login-feature__title">Track daily presence</p>
                  <p className="login-feature__sub">Real-time attendance tracking</p>
                </div>
              </div>

              <div className="login-feature">
                <span className="login-feature__icon login-feature__icon--green">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </span>
                <div>
                  <p className="login-feature__title">Manage your team</p>
                  <p className="login-feature__sub">Add, update and manage employees</p>
                </div>
              </div>

              <div className="login-feature">
                <span className="login-feature__icon login-feature__icon--pink">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                </span>
                <div>
                  <p className="login-feature__title">Secure company login</p>
                  <p className="login-feature__sub">Your data is safe with us</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-hero__stat">
            <div>
              <p className="login-hero__stat-value">98%</p>
              <p className="login-hero__stat-label">On-time Rate</p>
            </div>
            <svg className="login-hero__wave" viewBox="0 0 120 40" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="waveGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <path
                d="M0 30 C 15 30, 20 12, 35 16 S 60 32, 75 22 S 100 6, 120 12"
                stroke="url(#waveGrad)"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cx="120" cy="12" r="3.5" fill="#22d3ee" />
            </svg>
          </div>
        </aside>

        <div className="login-card">
          <div className="login-card__roles" role="group" aria-label="Account type">
            <button
              type="button"
              className={`login-card__role ${!isEmployee ? "is-active" : ""}`}
              onClick={() => {
                setRole("company");
                setError("");
              }}
            >
              Company
            </button>
            <button
              type="button"
              className={`login-card__role ${isEmployee ? "is-active" : ""}`}
              onClick={() => {
                setRole("employee");
                setError("");
              }}
            >
              Employee
            </button>
          </div>

          <div className="login-card__tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              className={`login-card__tab ${isLogin ? "is-active" : ""}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
              </svg>
              Sign in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              className={`login-card__tab ${!isLogin ? "is-active" : ""}`}
              onClick={() => {
                setMode("signup");
                setError("");
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6" />
              </svg>
              Sign up
            </button>
          </div>

          <h2 className="login-card__heading">
            {isLogin ? "Welcome back" : "Create account"}
          </h2>
          <p className="login-card__sub">
            {isLogin
              ? "Enter your email and password to continue"
              : isEmployee
                ? "Use your company invite code/link, or the email your admin added"
                : "Register your company to get started"}
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {!isLogin && !isEmployee && (
              <div className="login-form__group">
                <label className="login-form__label" htmlFor="company">
                  Company name
                </label>
                <div className="login-field">
                  <svg className="login-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M9 17h.01M15 9h.01M15 13h.01M15 17h.01" />
                  </svg>
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
              </div>
            )}

            {!isLogin && isEmployee && (
              <>
                <div className="login-form__group">
                  <label className="login-form__label" htmlFor="company-code">
                    Company invite code
                  </label>
                  <div className="login-field">
                    <svg className="login-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 11c1.657 0 3-1.343 3-3S13.657 5 12 5 9 6.343 9 8s1.343 3 3 3z" />
                      <path d="M19 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2" />
                    </svg>
                    <input
                      id="company-code"
                      className="login-form__input"
                      type="text"
                      placeholder="ABC12345"
                      value={companyCode}
                      onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                      autoComplete="off"
                    />
                  </div>
                  {inviteCompanyName && (
                    <p className="login-form__hint">Joining {inviteCompanyName}</p>
                  )}
                  {companyCode && !inviteCompanyName && (
                    <p className="login-form__hint login-form__hint--muted">
                      Enter a valid code from your employer
                    </p>
                  )}
                </div>

                {usingInviteCode && (
                  <div className="login-form__group">
                    <label className="login-form__label" htmlFor="fullname">
                      Full name
                    </label>
                    <div className="login-field">
                      <svg className="login-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      <input
                        id="fullname"
                        className="login-form__input"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="email">
                Email
              </label>
              <div className="login-field">
                <svg className="login-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
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
            </div>

            <div className="login-form__group">
              <label className="login-form__label" htmlFor="password">
                Password
              </label>
              <div className="login-field">
                <svg className="login-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="4" y="11" width="16" height="10" rx="2" />
                  <path d="M8 11V7a4 4 0 018 0v4" />
                </svg>
                <input
                  id="password"
                  className="login-form__input login-form__input--password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="login-field__eye"
                  onClick={() => setShowPassword((s) => !s)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {isLogin && (
              <div className="login-form__row">
                <label className="login-check">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span className="login-check__box" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  Remember me
                </label>
                <button
                  type="button"
                  className="login-form__forgot"
                  onClick={() => setError("Password reset isn't available yet.")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && <p className="login-form__error">{error}</p>}

            <button type="submit" className="login-form__submit" disabled={loading}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isLogin ? (
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                ) : (
                  <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6" />
                )}
              </svg>
              {loading
                ? isLogin
                  ? "Signing in…"
                  : "Creating account…"
                : isLogin
                  ? "Sign in"
                  : "Create account"}
            </button>

            {GOOGLE_CLIENT_ID && (
              <>
                <div className="login-divider">
                  <span>or continue with</span>
                </div>

                <div className="login-social">
                  <button
                    type="button"
                    className="login-social__btn"
                    aria-label="Continue with Google"
                    onClick={handleGoogle}
                    disabled={loading}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 015.49 12c0-.73.13-1.43.35-2.1V7.06H2.18A11 11 0 001 12c0 1.77.43 3.45 1.18 4.94l3.66-2.84z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                    </svg>
                    Continue with Google
                  </button>
                </div>
              </>
            )}

            <p className="login-footer">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="4" y="11" width="16" height="10" rx="2" />
                <path d="M8 11V7a4 4 0 018 0v4" />
              </svg>
              Secure login · Your data is protected
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

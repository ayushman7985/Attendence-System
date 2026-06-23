import { useEffect, useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import { clearSession, getSession } from "./authStorage";
import { validateSession } from "./api";

export default function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      const stored = getSession();
      if (!stored?.token) {
        if (active) {
          setUser(null);
          setCheckingAuth(false);
        }
        return;
      }

      const session = await validateSession();
      if (active) {
        setUser(session);
        setCheckingAuth(false);
      }
    }

    restoreSession();
    return () => {
      active = false;
    };
  }, []);

  const handleLogin = (session) => {
    setUser(session);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (checkingAuth) {
    return (
      <div className="auth-loading" style={{ padding: "2rem", textAlign: "center" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (user.role === "employee") {
    return <EmployeeDashboard user={user} onLogout={handleLogout} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

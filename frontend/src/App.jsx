import { useState } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { getSession, clearSession } from "./authStorage";

export default function App() {
  const [user, setUser] = useState(() => getSession());

  const handleLogin = (session) => {
    setUser(session);
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return <Dashboard user={user} onLogout={handleLogout} />;
}

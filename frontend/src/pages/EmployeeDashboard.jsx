import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import "../App.css";

function StatusBadge({ status }) {
  const isPresent = (status || "").toLowerCase() === "present";
  return (
    <span className={`badge badge--${isPresent ? "present" : "absent"}`}>
      <span className="badge__dot" />
      {status || "—"}
    </span>
  );
}

function LeaveBadge({ status }) {
  const normalized = (status || "pending").toLowerCase();
  return (
    <span className={`badge badge--leave-${normalized}`}>
      <span className="badge__dot" />
      {status || "Pending"}
    </span>
  );
}

export default function EmployeeDashboard({ user, onLogout }) {
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [applying, setApplying] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const getSummary = useCallback(async () => {
    const res = await api.get(`/employees/${user.id}/summary`);
    setSummary(res.data);
  }, [user.id]);

  const getAttendance = useCallback(async () => {
    const res = await api.get("/attendance", {
      params: { employee_id: user.id },
    });
    setAttendance(res.data);
  }, [user.id]);

  const getLeaves = useCallback(async () => {
    const res = await api.get("/leaves", {
      params: { employee_id: user.id },
    });
    setLeaves(res.data);
  }, [user.id]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([getSummary(), getAttendance(), getLeaves()]);
    } catch {
      showToast("Could not connect to the API. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  }, [getSummary, getAttendance, getLeaves, showToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const applyLeave = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      showToast("Please enter a reason", "error");
      return;
    }
    if (!start || !end) {
      showToast("Please select start and end dates", "error");
      return;
    }
    if (end < start) {
      showToast("End date cannot be before start date", "error");
      return;
    }

    setApplying(true);
    try {
      await api.post("/leaves", {
        employee_id: user.id,
        reason: reason.trim(),
        start_date: start,
        end_date: end,
      });
      showToast("Leave applied successfully");
      setReason("");
      setStart("");
      setEnd("");
      await Promise.all([getLeaves(), getSummary()]);
    } catch {
      showToast("Failed to apply for leave", "error");
    } finally {
      setApplying(false);
    }
  };

  const presentCount = attendance.filter(
    (a) => (a.status || "").toLowerCase() === "present"
  ).length;

  if (loading) {
    return (
      <div className="app">
        <div className="app__bg" />
        <div className="loading">
          <div className="loading__spinner" />
          <p>Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="app__bg" />

      <div
        className={`toast toast--${toast?.type || "success"} ${toast ? "is-visible" : ""}`}
        role="status"
      >
        {toast?.message}
      </div>

      <div className="app__inner">
        <header className="header">
          <div className="header__top">
            <div className="header__brand">
              <div className="header__logo" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4 0-8 2-8 6v2h16v-2c0-4-4-6-8-6z" />
                </svg>
              </div>
              <div>
                <h1 className="header__title">Hi, {user.name}</h1>
                <p className="header__subtitle">{user.email}</p>
              </div>
            </div>
            <div className="header__actions">
              <button type="button" className="btn-logout" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </div>

          <div className="stats">
            <div className="stat stat--accent">
              <p className="stat__label">Leaves remaining</p>
              <p className="stat__value">{summary?.remaining_leaves ?? "—"}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Total leaves</p>
              <p className="stat__value">{summary?.total_leaves ?? "—"}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Leaves used</p>
              <p className="stat__value">{summary?.used_leaves ?? "—"}</p>
            </div>
            <div className="stat stat--warn">
              <p className="stat__label">Pending requests</p>
              <p className="stat__value">{summary?.pending_requests ?? "—"}</p>
            </div>
          </div>
        </header>

        <main className="dashboard">
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M8 2v4M16 2v4M3 10h18" />
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M9 16l2 2 4-4" />
                </svg>
                Apply for Leave
              </h2>
            </div>
            <div className="card__body">
              <form className="form" onSubmit={applyLeave}>
                <div className="form__group">
                  <label className="form__label" htmlFor="reason">
                    Reason
                  </label>
                  <input
                    id="reason"
                    className="form__select"
                    type="text"
                    placeholder="e.g. Medical, Personal…"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>

                <div className="form__row">
                  <div className="form__group">
                    <label className="form__label" htmlFor="start">
                      From
                    </label>
                    <input
                      id="start"
                      className="form__select"
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                    />
                  </div>
                  <div className="form__group">
                    <label className="form__label" htmlFor="end">
                      To
                    </label>
                    <input
                      id="end"
                      className="form__select"
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                    />
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={applying}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                  </svg>
                  {applying ? "Applying…" : "Apply for leave"}
                </button>
              </form>
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                My Attendance
              </h2>
              <span className="card__badge">{presentCount} present</span>
            </div>
            <div className="card__body">
              {attendance.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>
                  <p>No attendance records yet.</p>
                </div>
              ) : (
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...attendance].reverse().map((att, index) => (
                        <tr key={att.id ?? index}>
                          <td>{att.id ?? index + 1}</td>
                          <td>
                            <StatusBadge status={att.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>

          <section className="card dashboard__full">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 3v18h18" />
                  <path d="M7 14l4-4 3 3 5-5" />
                </svg>
                My Leave History
              </h2>
              <span className="card__badge">{leaves.length} requests</span>
            </div>
            <div className="card__body">
              {leaves.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M8 2v4M16 2v4M3 10h18" />
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                  </svg>
                  <p>No leave requests yet. Apply for your first one above.</p>
                </div>
              ) : (
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Reason</th>
                        <th>From</th>
                        <th>To</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaves.map((lv) => (
                        <tr key={lv.id}>
                          <td>{lv.id}</td>
                          <td>{lv.reason}</td>
                          <td>{lv.start_date}</td>
                          <td>{lv.end_date}</td>
                          <td>
                            <LeaveBadge status={lv.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

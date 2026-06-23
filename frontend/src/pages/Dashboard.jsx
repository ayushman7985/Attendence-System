import { useEffect, useState, useCallback } from "react";
import { api, getErrorMessage } from "../api";
import "../App.css";

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StatusBadge({ status }) {
  const normalized = (status || "").toLowerCase();
  const isPresent = normalized === "present";
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

export default function Dashboard({ user, onLogout }) {
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [employeeId, setEmployeeId] = useState("");
  const [status, setStatus] = useState("Present");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [leaves, setLeaves] = useState([]);
  const [updatingLeaveId, setUpdatingLeaveId] = useState(null);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [addingEmployee, setAddingEmployee] = useState(false);

  const showToast = useCallback((message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const getEmployees = async () => {
    const res = await api.get("/employees");
    setEmployees(res.data);
  };

  const getAttendance = async () => {
    const res = await api.get("/attendance");
    setAttendance(res.data);
  };

  const getLeaves = async () => {
    const res = await api.get("/leaves");
    setLeaves(res.data);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([getEmployees(), getAttendance(), getLeaves()]);
    } catch {
      showToast("Could not connect to the API. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
  };

  const addEmployee = async (e) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeeEmail.trim()) {
      showToast("Name and email are required", "error");
      return;
    }

    setAddingEmployee(true);
    try {
      await api.post("/employees", {
        name: newEmployeeName.trim(),
        email: newEmployeeEmail.trim(),
      });
      showToast("Employee added successfully");
      setNewEmployeeName("");
      setNewEmployeeEmail("");
      await getEmployees();
    } catch (err) {
      showToast(getErrorMessage(err, "Failed to add employee"), "error");
    } finally {
      setAddingEmployee(false);
    }
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    if (!employeeId) {
      showToast("Please select an employee", "error");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/attendance", {
        employee_id: Number(employeeId),
        status,
      });
      showToast("Attendance marked successfully");
      await getAttendance();
    } catch {
      showToast("Failed to mark attendance", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const updateLeaveStatus = async (leaveId, newStatus) => {
    setUpdatingLeaveId(leaveId);
    try {
      await api.patch(`/leaves/${leaveId}`, { status: newStatus });
      showToast(`Leave ${newStatus.toLowerCase()}`);
      await getLeaves();
    } catch {
      showToast("Failed to update leave", "error");
    } finally {
      setUpdatingLeaveId(null);
    }
  };

  const resolveEmployeeName = (recordName) => {
    const id = Number(recordName);
    const emp = employees.find((e) => e.id === id);
    return emp ? emp.name : `Employee #${recordName}`;
  };

  const presentCount = attendance.filter(
    (a) => (a.status || "").toLowerCase() === "present"
  ).length;

  const pendingLeaves = leaves.filter(
    (l) => (l.status || "").toLowerCase() === "pending"
  );

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="app">
        <div className="app__bg" />
        <div className="loading">
          <div className="loading__spinner" />
          <p>Loading attendance dashboard…</p>
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
        {toast?.type === "success" ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
        )}
        {toast?.message}
      </div>

      <div className="app__inner">
        <header className="header">
          <div className="header__top">
            <div className="header__brand">
              <div className="header__logo" aria-hidden>
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" />
                </svg>
              </div>
              <div>
                <h1 className="header__title">Attendance System</h1>
                <p className="header__subtitle">
                  {user?.company ? `${user.company} · ` : ""}
                  {user?.email}
                </p>
              </div>
            </div>
            <div className="header__actions">
              <span className="header__live">
                <span className="header__live-dot" />
                Live
              </span>
              <button type="button" className="btn-logout" onClick={onLogout}>
                Sign out
              </button>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <p className="stat__label">Employees</p>
              <p className="stat__value">{employees.length}</p>
            </div>
            <div className="stat stat--accent">
              <p className="stat__label">Present today</p>
              <p className="stat__value">{presentCount}</p>
            </div>
            <div className="stat">
              <p className="stat__label">Total records</p>
              <p className="stat__value">{attendance.length}</p>
            </div>
            <div className="stat stat--warn">
              <p className="stat__label">Pending leaves</p>
              <p className="stat__value">{pendingLeaves.length}</p>
            </div>
          </div>
        </header>

        <main className="dashboard">
          <section className="card">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                </svg>
                Employees
              </h2>
              <span className="card__badge">{employees.length} active</span>
            </div>
            <div className="card__body">
              <form className="form form--add-employee" onSubmit={addEmployee}>
                <p className="form__hint">Add employees to your company using their name and Gmail address.</p>
                <div className="form__row">
                  <div className="form__group">
                    <label className="form__label" htmlFor="employee-name">
                      Full name
                    </label>
                    <input
                      id="employee-name"
                      className="form__input"
                      type="text"
                      placeholder="John Doe"
                      value={newEmployeeName}
                      onChange={(e) => setNewEmployeeName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form__group">
                    <label className="form__label" htmlFor="employee-email">
                      Gmail / email
                    </label>
                    <input
                      id="employee-email"
                      className="form__input"
                      type="email"
                      placeholder="john@gmail.com"
                      value={newEmployeeEmail}
                      onChange={(e) => setNewEmployeeEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="btn-submit btn-submit--compact"
                  disabled={addingEmployee}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8M20 8v6M23 11h-6" />
                  </svg>
                  {addingEmployee ? "Adding…" : "Add employee"}
                </button>
              </form>

              {employees.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                  </svg>
                  <p>No employees yet. Add your first employee above.</p>
                </div>
              ) : (
                <ul className="employee-list">
                  {employees.map((emp) => (
                    <li key={emp.id} className="employee-item">
                      <div className="employee-item__avatar">{getInitials(emp.name)}</div>
                      <div className="employee-item__info">
                        <p className="employee-item__name">{emp.name}</p>
                        <p className="employee-item__meta">{emp.email || `ID ${emp.id}`}</p>
                      </div>
                      <span className="employee-item__id">#{emp.id}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="card">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                Mark Attendance
              </h2>
            </div>
            <div className="card__body">
              <form className="form" onSubmit={markAttendance}>
                <div className="form__group">
                  <label className="form__label" htmlFor="employee">
                    Employee
                  </label>
                  <select
                    id="employee"
                    className="form__select"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                  >
                    <option value="">Select employee…</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form__group">
                  <span className="form__label">Status</span>
                  <div className="status-toggle" role="group" aria-label="Attendance status">
                    <button
                      type="button"
                      className={`status-toggle__btn status-toggle__btn--present ${status === "Present" ? "is-active" : ""}`}
                      onClick={() => setStatus("Present")}
                    >
                      Present
                    </button>
                    <button
                      type="button"
                      className={`status-toggle__btn status-toggle__btn--absent ${status === "Absent" ? "is-active" : ""}`}
                      onClick={() => setStatus("Absent")}
                    >
                      Absent
                    </button>
                  </div>
                </div>

                <button type="submit" className="btn-submit" disabled={submitting || !employeeId}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  {submitting ? "Saving…" : "Mark attendance"}
                </button>
              </form>
            </div>
          </section>

          <section className="card dashboard__full">
            <div className="card__head">
              <h2 className="card__title">
                <svg className="card__title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                Attendance Records
              </h2>
              <span className="card__badge">{attendance.length} entries</span>
            </div>
            <div className="card__body">
              {attendance.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                  </svg>
                  <p>No attendance records yet. Mark the first entry above.</p>
                </div>
              ) : (
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Employee</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...attendance].reverse().map((att, index) => (
                        <tr key={att.id ?? index}>
                          <td>{att.id ?? index + 1}</td>
                          <td>
                            <strong>{resolveEmployeeName(att.name)}</strong>
                          </td>
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
                  <path d="M12 8v4l3 3" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
                Pending Approvals
              </h2>
              <span className="card__badge">{pendingLeaves.length} pending</span>
            </div>
            <div className="card__body">
              {pendingLeaves.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <p>No pending leave requests. Employees apply from their dashboard.</p>
                </div>
              ) : (
                <ul className="leave-list">
                  {pendingLeaves.map((lv) => (
                    <li key={lv.id} className="leave-item">
                      <div className="leave-item__info">
                        <p className="leave-item__name">
                          {resolveEmployeeName(lv.employee_id)}
                        </p>
                        <p className="leave-item__meta">{lv.reason}</p>
                        <p className="leave-item__dates">
                          {lv.start_date} → {lv.end_date}
                        </p>
                      </div>
                      <div className="leave-item__actions">
                        <button
                          type="button"
                          className="btn-approve"
                          disabled={updatingLeaveId === lv.id}
                          onClick={() => updateLeaveStatus(lv.id, "Approved")}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn-reject"
                          disabled={updatingLeaveId === lv.id}
                          onClick={() => updateLeaveStatus(lv.id, "Rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
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
                Leave History
              </h2>
              <span className="card__badge">{leaves.length} requests</span>
            </div>
            <div className="card__body">
              {leaves.length === 0 ? (
                <div className="empty">
                  <svg className="empty__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M8 2v4M16 2v4M3 10h18" />
                  </svg>
                  <p>No leave requests yet. Employees can apply from their dashboard.</p>
                </div>
              ) : (
                <div className="records-table-wrap">
                  <table className="records-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Employee</th>
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
                          <td>
                            <strong>{resolveEmployeeName(lv.employee_id)}</strong>
                          </td>
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

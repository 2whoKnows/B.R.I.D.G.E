import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "./Dashboardlayout";
import { listUsers, updateUserRole, updateUserActive } from "../lib/userQueries";
import "../styles/Users.css";

const ROLES = [
  { value: "teacher", label: "User" },
  { value: "document_manager", label: "Manager" },
];

function formatDate(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Users({ managerName = "Manager" }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(err.message ?? "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, []);

    useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) loadUsers();
    });

    return () => {
      cancelled = true;
    };
  }, [loadUsers]);

  const handleRoleChange = async (userId, newRole) => {
    setError("");
    setBusyId(userId);
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    try {
      await updateUserRole(userId, newRole);
    } catch (err) {
      console.error("Failed to update role:", err);
      setError(err.message ?? "Failed to update role.");
      setUsers(previous);
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (userId, isActive) => {
    setError("");
    setBusyId(userId);
    const previous = users;
    setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, is_active: isActive } : u)));
    try {
      await updateUserActive(userId, isActive);
    } catch (err) {
      console.error("Failed to update status:", err);
      setError(err.message ?? "Failed to update status.");
      setUsers(previous);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <DashboardLayout
      activeKey="users"
      managerName={managerName}
      pageTitle="Users"
      pageSubtitle="Manage account roles and access"
    >
      {error && <div className="usr-error">{error}</div>}

      <div className="usr-panel">
        <div className="usr-table-wrap">
          <table className="usr-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5}><span className="usr-skeleton" /></td>
                  </tr>
                ))}

              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={5} className="usr-empty-cell">No users found.</td>
                </tr>
              )}

              {!loading &&
                users.map((user) => (
                  <tr key={user.id}>
                    <td className="usr-td-name">{user.full_name}</td>
                    <td className="usr-td-email">{user.email}</td>
                    <td>
                      <select
                        className="usr-role-select"
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        disabled={busyId === user.id}
                      >
                        {ROLES.map((r) => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`usr-status-btn ${user.is_active ? "usr-status-active" : "usr-status-inactive"}`}
                        onClick={() => handleToggleActive(user.id, !user.is_active)}
                        disabled={busyId === user.id}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="usr-td-time">{formatDate(user.created_at)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
import { useEffect, useState } from "react";
import api from "../../api";

const roleLabels = {
  admin: "Admin / Pastor",
  staff: "Church Staff",
  ministry_leader: "Ministry Leaders",
  member: "Members",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/admin/stats")
      .then((r) => setStats(r.data))
      .catch((e) => setError(e.response?.data?.error || "Failed to load stats"));
  }, []);

  if (error) return <div className="alert">{error}</div>;
  if (!stats) return <p>Loading...</p>;

  return (
    <>
      <h2>Dashboard</h2>
      <div className="cards">
        <div className="card"><span>Total Users</span><strong>{stats.total_users}</strong></div>
        <div className="card"><span>Active Users</span><strong>{stats.active_users}</strong></div>
        {Object.entries(stats.by_role).map(([role, count]) => (
          <div className="card" key={role}>
            <span>{roleLabels[role]}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </>
  );
}
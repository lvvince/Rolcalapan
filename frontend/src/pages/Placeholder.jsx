// frontend/src/pages/Placeholder.jsx
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Placeholder({ title = "Coming soon" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  return (
    <div className="login-wrap">
      <div className="login-card">
        <h1>{title}</h1>
        <p className="muted">Logged in as {user?.name} ({user?.role})</p>
        <button onClick={() => { logout(); navigate("/login", { replace: true }); }}>Logout</button>
      </div>
    </div>
  );
}

export function ComingSoon() {
  return <p>Coming soon.</p>;
}
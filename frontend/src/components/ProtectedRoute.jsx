// frontend/src/components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth, homeForRole } from "../context/AuthContext";

export default function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeForRole(user.role)} replace />;
  return children;
}
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles = null }) {
  const { user } = useAuth();

  // not logged in
  if (!user) return <Navigate to="/login" replace />;

  // role check — agar roles prop diya hai
  if (roles && !roles.includes((user.role || "").toLowerCase())) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, roles = null }) {
  const { user, loading } = useAuth();

  // Wait until authentication is restored
  if (loading) {
    return <div>Loading...</div>;
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Role check
  if (
    roles &&
    !roles.map((r) => r.toLowerCase()).includes(
      (user.role || "").toLowerCase()
    )
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;

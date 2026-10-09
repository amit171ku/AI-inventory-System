
import { createContext, useContext, useState, useEffect } from "react";

export const AuthContext = createContext();
export const useAuth = () => useContext(AuthContext);

const API_URL = (
  import.meta.env.VITE_API_URL || "https://ai-inventory-system-745q.onrender.com"
).replace(/\/+$/, "");

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem("user");
      const token = localStorage.getItem("token");

      if (!storedUser || !token) {
        setLoading(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(storedUser);

        const response = await fetch(
          `${API_URL}/auth/verify-token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ token }),
          }
        );

        if (!response.ok) {
          throw new Error(`Token verification failed: ${response.status}`);
        }

        const result = await response.json();

        setUser({
          ...parsedUser,
          email: result.email,
          role: result.role,
        });
      } catch (error) {
        console.error("Session restoration failed:", error);

        localStorage.removeItem("user");
        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = (data) => {
    if (!data?.token) {
      console.error("Login response is missing the token.");
      return;
    }

    const userData = {
      id: data.id,
      email: data.email,
      role: data.role,
    };

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(userData));

    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    setUser(null);
  };

  const hasRole = (...roles) =>
    roles
      .map((role) => role.toLowerCase())
      .includes((user?.role || "").toLowerCase());

  return (
    <AuthContext.Provider
      value={{ user, login, logout, hasRole, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

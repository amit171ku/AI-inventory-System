import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Login          from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword"; // 👈 NAYA IMPORT
import Dashboard      from "./pages/Dashboard";
import Inventory      from "./pages/Inventory";
import AddProduct     from "./pages/AddProduct";
import Forecast       from "./pages/Forecast";
import Analytics      from "./pages/Analytics";
import Suppliers      from "./pages/Suppliers";
import Orders         from "./pages/Orders";
import Users          from "./pages/Users";
import ProductDetail  from "./pages/ProductDetail";
import AIAssistant    from "./pages/AIAssistant";
import Profile        from "./pages/Profile";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>

          {/* ── Public Routes ── */}
          <Route path="/"                element={<Navigate to="/login" replace />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} /> {/* 👈 NAYA ROUTE */}

          {/* ── All logged-in users ── */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/forecast"  element={<ProtectedRoute><Forecast /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
          <Route path="/ai"        element={<ProtectedRoute><AIAssistant /></ProtectedRoute>} />
          <Route path="/profile"   element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/product/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />

          {/* ── Admin + Manager + Staff ── */}
          <Route path="/inventory" element={
            <ProtectedRoute roles={["admin", "manager", "staff"]}>
              <Inventory />
            </ProtectedRoute>
          } />
          <Route path="/orders" element={
            <ProtectedRoute roles={["admin", "manager", "staff"]}>
              <Orders />
            </ProtectedRoute>
          } />

          {/* ── Admin + Manager only ── */}
          <Route path="/add-product" element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <AddProduct />
            </ProtectedRoute>
          } />
          <Route path="/suppliers" element={
            <ProtectedRoute roles={["admin", "manager"]}>
              <Suppliers />
            </ProtectedRoute>
          } />

          {/* ── Admin only ── */}
          <Route path="/users" element={
            <ProtectedRoute roles={["admin"]}>
              <Users />
            </ProtectedRoute>
          } />

          {/* ── 404 fallback ── */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
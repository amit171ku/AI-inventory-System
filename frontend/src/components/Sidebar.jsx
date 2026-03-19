import { NavLink } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard, Boxes, Users, Plus, Truck,
  FileText, BarChart3, Brain, ChevronLeft,
  TrendingUp, Bell,
} from "lucide-react";

function Sidebar({ open, setOpen }) {
  const { user } = useAuth();
  const role = (user?.role || "").toLowerCase();

  const NAV_ITEMS = [
    {
      to:    "/dashboard",
      icon:  <LayoutDashboard size={18} />,
      label: "Dashboard",
      roles: null, // visible to all
    },
    {
      to:    "/ai",
      icon:  <Brain size={18} />,
      label: "AI Assistant",
      roles: null,
    },
    {
      to:    "/inventory",
      icon:  <Boxes size={18} />,
      label: "Inventory",
      roles: ["admin", "manager", "staff"],
    },
    {
      to:    "/add-product",
      icon:  <Plus size={18} />,
      label: "Add Product",
      roles: ["admin", "manager"],
    },
    {
      to:    "/orders",
      icon:  <FileText size={18} />,
      label: "Orders",
      roles: ["admin", "manager", "staff"],
    },
    {
      to:    "/suppliers",
      icon:  <Truck size={18} />,
      label: "Suppliers",
      roles: ["admin", "manager"],
    },
    {
      to:    "/forecast",
      icon:  <TrendingUp size={18} />,
      label: "Forecast",
      roles: null,
    },
    {
      to:    "/analytics",
      icon:  <BarChart3 size={18} />,
      label: "Analytics",
      roles: null,
    },
    {
      to:    "/users",
      icon:  <Users size={18} />,
      label: "Users",
      roles: ["admin"],
    },
  ];

  const visible = NAV_ITEMS.filter(item =>
    item.roles === null || item.roles.includes(role)
  );

  const linkClass = ({ isActive }) =>
    `group relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm
    ${isActive
      ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/20"
      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
    }`;

  return (
    <div className={`
      h-full flex flex-col
      bg-card border-r border-border
      transition-all duration-300
      ${open ? "w-64" : "w-20"}
    `}>

      {/* Logo + toggle */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-border">
        {open && (
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 20h20M6 20V10M12 20V4M18 20v-8"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-foreground">AI Inventory</span>
          </div>
        )}
        <button
          onClick={() => setOpen(!open)}
          className={`p-1.5 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground ${!open ? "mx-auto" : ""}`}
        >
          <ChevronLeft size={16} className={`transition-transform duration-300 ${!open ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visible.map(item => (
          <NavLink key={item.to} to={item.to} className={linkClass}>
            <span className="flex-shrink-0">{item.icon}</span>

            {open && <span>{item.label}</span>}

            {/* Tooltip when collapsed */}
            {!open && (
              <span className="absolute left-full ml-3 px-2 py-1 rounded-lg bg-card border border-border text-xs text-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-lg">
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info footer */}
      <div className="border-t border-border p-3">
        {open ? (
          <div className="flex items-center gap-2.5 px-2 py-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user?.email?.split("@")[0]}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white">
              {user?.email?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default Sidebar;
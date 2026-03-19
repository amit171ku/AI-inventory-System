import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getNotificationCount, getNotifications } from "../services/productAPI";
import { Bell, Search, Sun, Moon, User, Menu } from "lucide-react";

const PRIORITY_STYLE = {
  high:   "bg-red-500/10    text-red-400    border-red-500/20",
  medium: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  low:    "bg-blue-500/10   text-blue-400   border-blue-500/20",
};
const PRIORITY_ICON = { high: "⛔", medium: "⚠️", low: "💡" };

function Header({ open, setOpen }) {
  const navigate = useNavigate();

  const [dark,          setDark]          = useState(localStorage.getItem("theme") === "dark");
  const [openProfile,   setOpenProfile]   = useState(false);
  const [openNotify,    setOpenNotify]    = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count,         setCount]         = useState(0);
  const [loadingNotify, setLoadingNotify] = useState(false);

  const profileRef = useRef();
  const notifyRef  = useRef();

  const user     = JSON.parse(localStorage.getItem("user") || "{}");
  const initials = user?.email?.charAt(0).toUpperCase() || "U";
  const username = user?.email?.split("@")[0] || "User";

  // ── Theme ──────────────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark") { document.documentElement.classList.add("dark"); setDark(true); }
    else { document.documentElement.classList.remove("dark"); setDark(false); }
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  // ── Notification count (Smart Logic) ───────────────────
  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCount = async () => {
    try {
      const res = await getNotificationCount();
      const liveCount = res.data.total || 0;
      
      // Check localStorage to see how many alerts the user has already seen
      const lastSeenCount = parseInt(localStorage.getItem("lastSeenAlertCount") || "0");

      // Only show the red badge for NEW alerts
      if (liveCount > lastSeenCount) {
        setCount(liveCount - lastSeenCount);
      } else {
        setCount(0); // No new alerts
      }
    } catch { /* silent */ }
  };

  // ── Full notifications (only when panel opens) ─────────
  const handleOpenNotify = async () => {
    const next = !openNotify;
    setOpenNotify(next);
    
    // Hide the red badge immediately when the user opens the panel
    if (next) {
      setCount(0); 
      setLoadingNotify(true);

      try {
        const res = await getNotifications();
        const liveTotal = res.data.count || 0;
        setNotifications(res.data.notifications || []);
        
        // Save the total count to localStorage so we know the user has seen them all
        localStorage.setItem("lastSeenAlertCount", liveTotal.toString());

      } catch { /* silent */ } finally {
        setLoadingNotify(false);
      }
    }
  };

  // ── Outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setOpenProfile(false);
      if (notifyRef.current  && !notifyRef.current.contains(e.target))  setOpenNotify(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border px-4 md:px-6 py-3 flex justify-between items-center min-w-0">

      {/* Left side: Hamburger (Mobile) + Title */}
      <div className="flex items-center gap-3">
        {setOpen && (
          <button 
            onClick={() => setOpen(!open)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition lg:hidden"
            aria-label="Toggle Sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <h2 className="text-lg font-semibold text-foreground truncate">AI Inventory</h2>
      </div>

      {/* Right side: Tools */}
      <div className="flex items-center gap-1 md:gap-3">

        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-2.5 text-muted-foreground w-3.5 h-3.5" />
          <input
            type="text" placeholder="Search..."
            className="pl-8 pr-3 py-2 rounded-lg bg-background border border-input text-sm text-foreground outline-none focus:border-indigo-500 transition w-48"
          />
        </div>

        {/* Theme */}
        <button onClick={toggleTheme} className="p-2 rounded-lg hover:bg-muted transition text-muted-foreground hover:text-foreground shrink-0">
          {dark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notifications */}
        <div className="relative shrink-0" ref={notifyRef}>
          <button onClick={handleOpenNotify}
            className="p-2 rounded-lg hover:bg-muted transition relative text-muted-foreground hover:text-foreground">
            <Bell size={18} />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1 font-bold">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </button>

          {openNotify && (
            <div className="absolute right-0 mt-2 w-72 md:w-80 max-h-96 overflow-y-auto bg-card border border-border rounded-xl shadow-xl z-50">
              <div className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between z-10">
                <p className="text-sm font-semibold text-foreground">Notifications</p>
                {/* Red badge inside the panel removed for a cleaner look */}
              </div>

              <div className="p-2 space-y-1.5">
                {loadingNotify ? (
                  <div className="flex justify-center py-6">
                    <p className="text-xs text-muted-foreground">Loading...</p>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Bell size={24} className="mb-2 opacity-20" />
                    <p className="text-xs">No new alerts</p>
                  </div>
                ) : (
                  notifications.map((n, i) => (
                    <div key={i} className={`p-3 rounded-lg border text-sm transition hover:opacity-90 ${PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.low}`}>
                      <div className="flex items-start gap-2.5">
                        <span className="text-base leading-none mt-0.5">{PRIORITY_ICON[n.priority] || "💡"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-foreground truncate">{n.title}</p>
                          <p className="opacity-85 mt-0.5 text-xs leading-relaxed">{n.message}</p>
                          {n.action && <p className="opacity-70 mt-1 text-[10px] uppercase font-bold tracking-wider">→ {n.action}</p>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile */}
        <div className="relative shrink-0 ml-1 md:ml-0" ref={profileRef}>
          <div onClick={() => setOpenProfile(!openProfile)}
            className="flex items-center gap-2 cursor-pointer hover:bg-muted p-1 md:px-2 md:py-1.5 rounded-lg transition">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-cyan-500 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm">
              {initials}
            </div>
            <span className="text-sm text-foreground font-medium hidden md:block max-w-[100px] truncate">
              {username}
            </span>
          </div>

          {openProfile && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/20">
                <p className="text-sm font-semibold text-foreground truncate">{user?.email}</p>
                <span className="text-xs font-medium text-indigo-400 capitalize">{user?.role || "User"}</span>
              </div>
              <div className="p-1">
                <button onClick={() => { navigate("/profile"); setOpenProfile(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-muted rounded-md transition flex items-center gap-2">
                  <User size={16} className="text-muted-foreground" /> Profile
                </button>
              </div>
              <div className="p-1 border-t border-border">
                <button onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-md transition">
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

export default Header;
import Layout from "../components/Layout";
import { useNavigate } from "react-router-dom";

const ROLE_STYLE = {
  admin:   "bg-red-500/10    text-red-400    border-red-500/20",
  manager: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  staff:   "bg-blue-500/10   text-blue-400   border-blue-500/20",
  viewer:  "bg-gray-500/10   text-gray-400   border-gray-500/20",
};

const ROLE_DESC = {
  admin:   "Full system access",
  manager: "Manage inventory & orders",
  staff:   "View & update stock",
  viewer:  "Read only access",
};

function Profile() {
  const navigate = useNavigate();
  const user     = JSON.parse(localStorage.getItem("user") || "{}");

  const initials  = user?.email?.charAt(0).toUpperCase() || "U";
  const username  = user?.email?.split("@")[0] || "User";
  const role      = (user?.role || "viewer").toLowerCase();

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">My Profile</h1>

      <div className="max-w-lg space-y-4">

        {/* ── Profile Card ── */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">

          {/* Avatar + name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg flex-shrink-0">
              {initials}
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{username}</p>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full border font-medium ${ROLE_STYLE[role] || ROLE_STYLE.viewer}`}>
                {role}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {[
              { label: "Email",       value: user?.email                        },
              { label: "Role",        value: role.charAt(0).toUpperCase() + role.slice(1) },
              { label: "Permissions", value: ROLE_DESC[role] || "—"            },
              { label: "User ID",     value: user?.id ? `#${user.id}` : "—"   },
            ].map(f => (
              <div key={f.label} className="flex justify-between items-center py-2.5 border-b border-border last:border-0">
                <span className="text-sm text-muted-foreground">{f.label}</span>
                <span className="text-sm font-medium text-foreground">{f.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Logout ── */}
        <button
          onClick={handleLogout}
          className="w-full h-10 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm font-medium transition"
        >
          Sign out
        </button>

      </div>
    </Layout>
  );
}

export default Profile;
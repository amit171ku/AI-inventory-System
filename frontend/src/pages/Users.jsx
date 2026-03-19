import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser, updateUser } from "../services/productAPI";

const ROLES = ["admin", "manager", "staff", "viewer"];

const ROLE_STYLE = {
  admin:   "bg-red-500/10    text-red-400    border-red-500/20",
  manager: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  staff:   "bg-blue-500/10   text-blue-400   border-blue-500/20",
  viewer:  "bg-gray-500/10   text-gray-400   border-gray-500/20",
};

const EMPTY_FORM = { email: "", password: "", role: "viewer" };

function Users() {
  const [users,      setUsers]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");
  const [success,    setSuccess]    = useState("");

  const [editUser,   setEditUser]   = useState(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await getUsers();
      setUsers(res.data);
    } catch {
      setError("Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError("Email and password are required."); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await createUser(form);
      setSuccess(`User "${form.email}" created.`);
      setForm(EMPTY_FORM);
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Deactivate this user?")) return;
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to delete user.");
    }
  };

  const handleRoleChange = async (id, role) => {
    try {
      await updateUser(id, { role });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    } catch {
      setError("Failed to update role.");
    }
  };

  const handleEdit   = (user) => { setEditUser({ ...user, password: "" }); setShowDrawer(true); };
  const handleUpdate = async () => {
    setSaving(true);
    try {
      const payload = { email: editUser.email, role: editUser.role };
      if (editUser.password) payload.password = editUser.password;
      await updateUser(editUser.id, payload);
      setShowDrawer(false);
      fetchUsers();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">User Management</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Create User Form ── */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Create User</h2>

          {error   && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
              <input type="email" placeholder="user@company.com"
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                value={form.email}
                onChange={e => { setForm({ ...form, email: e.target.value }); setError(""); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Password</label>
              <input type="password" placeholder="••••••••"
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(""); }}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Role</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none"
                value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
              >
                {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <button type="submit" disabled={submitting}
              className="w-full h-10 mt-1 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {submitting ? "Creating..." : "Create User"}
            </button>
          </form>

          {/* Role legend */}
          <div className="mt-5 pt-4 border-t border-border space-y-1.5">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Role Permissions</p>
            {[
              { role: "admin",   desc: "Full access" },
              { role: "manager", desc: "Manage inventory & orders" },
              { role: "staff",   desc: "View & update stock" },
              { role: "viewer",  desc: "Read only" },
            ].map(r => (
              <div key={r.role} className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${ROLE_STYLE[r.role]}`}>
                  {r.role}
                </span>
                <span className="text-xs text-muted-foreground">{r.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Users Table ── */}
        <div className="lg:col-span-2">
          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading users...</div>
            ) : users.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No users found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">User</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Role</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Last Login</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{user.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined {user.created_at ? new Date(user.created_at).toLocaleDateString() : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={e => handleRoleChange(user.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border bg-transparent cursor-pointer outline-none ${ROLE_STYLE[user.role] || ROLE_STYLE.viewer}`}
                        >
                          {ROLES.map(r => (
                            <option key={r} value={r} className="bg-background text-foreground">
                              {r.charAt(0).toUpperCase() + r.slice(1)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {user.last_login ? new Date(user.last_login).toLocaleString() : "Never"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEdit(user)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(user.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">{users.length} user{users.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Edit Drawer ── */}
      {showDrawer && editUser && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border p-6 shadow-xl z-50">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Edit User</h2>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Email</label>
                <input type="email"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                  value={editUser.email}
                  onChange={e => setEditUser({ ...editUser, email: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                  New Password <span className="text-muted-foreground normal-case">(leave blank to keep current)</span>
                </label>
                <input type="password" placeholder="••••••••"
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                  value={editUser.password}
                  onChange={e => setEditUser({ ...editUser, password: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Role</label>
                <select
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none"
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value })}
                >
                  {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleUpdate} disabled={saving}
                className="flex-1 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition disabled:opacity-50">
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button onClick={() => setShowDrawer(false)}
                className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition">
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}

export default Users;
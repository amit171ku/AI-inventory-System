import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { getSuppliers, createSupplier, deleteSupplier, updateSupplier } from "../services/productAPI";

const EMPTY_FORM = { name: "", phone: "", email: "", address: "", lead_time_days: 7 };

function Suppliers() {
  const [suppliers,   setSuppliers]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState("");
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [submitting,  setSubmitting]  = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [showDrawer,  setShowDrawer]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  useEffect(() => { fetchSuppliers(); }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const res = await getSuppliers();
      setSuppliers(res.data);
    } catch (err) {
      setError("Failed to load suppliers.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError("Name is required."); return; }
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await createSupplier(form);
      setSuccess(`Supplier "${form.name}" added.`);
      setForm(EMPTY_FORM);
      fetchSuppliers();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to add supplier.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this supplier?")) return;
    try {
      await deleteSupplier(id);
      setSuppliers(prev => prev.filter(s => s.id !== id));
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to delete supplier.");
    }
  };

  const handleEdit   = (s) => { setEditSupplier({ ...s }); setShowDrawer(true); };
  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateSupplier(editSupplier.id, editSupplier);
      setShowDrawer(false);
      fetchSuppliers();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to update supplier.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = suppliers.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email || "").toLowerCase().includes(search.toLowerCase())
  );

  const FIELDS = [
    { label: "Name *",          key: "name",           type: "text",   placeholder: "Supplier name"    },
    { label: "Phone",           key: "phone",          type: "text",   placeholder: "+91 98765 43210"  },
    { label: "Email",           key: "email",          type: "email",  placeholder: "supplier@co.com"  },
    { label: "Address",         key: "address",        type: "text",   placeholder: "City, State"      },
    { label: "Lead Time (days)",key: "lead_time_days", type: "number", placeholder: "7"                },
  ];

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">Suppliers</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Add Supplier Form ── */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Add Supplier</h2>

          {error   && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">{f.label}</label>
                <input
                  type={f.type} placeholder={f.placeholder}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                  value={form[f.key]}
                  onChange={e => setForm({ ...form, [f.key]: f.type === "number" ? +e.target.value : e.target.value })}
                />
              </div>
            ))}
            <button type="submit" disabled={submitting}
              className="w-full h-10 mt-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {submitting ? "Adding..." : "Add Supplier"}
            </button>
          </form>
        </div>

        {/* ── Suppliers Table ── */}
        <div className="lg:col-span-2">
          <div className="mb-4">
            <input
              type="text" placeholder="Search by name or email..."
              className="h-10 px-4 rounded-xl bg-background border border-input text-foreground text-sm outline-none w-full max-w-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading suppliers...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No suppliers found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Name</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Phone</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Email</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Lead Time</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{s.name}</p>
                        {s.address && <p className="text-xs text-muted-foreground">{s.address}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.phone || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email || "—"}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                          {s.lead_time_days ?? 7}d
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button onClick={() => handleEdit(s)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                          <button onClick={() => handleDelete(s.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-right">{filtered.length} supplier{filtered.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* ── Edit Drawer ── */}
      {showDrawer && editSupplier && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Edit Supplier</h2>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>

            {FIELDS.map(f => (
              <div key={f.key} className="mb-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">{f.label}</label>
                <input
                  type={f.type} placeholder={f.placeholder}
                  className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                  value={editSupplier[f.key] ?? ""}
                  onChange={e => setEditSupplier({ ...editSupplier, [f.key]: f.type === "number" ? +e.target.value : e.target.value })}
                />
              </div>
            ))}

            <div className="flex gap-3 mt-6">
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

export default Suppliers;
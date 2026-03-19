import Layout from "../components/Layout";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getProducts, deleteProduct, updateProduct } from "../services/productAPI";

const STATUS_BADGE = {
  OUT: "bg-red-500/10 text-red-400 border border-red-500/20",
  LOW: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  OK:  "bg-green-500/10 text-green-400 border border-green-500/20",
};
const STATUS_LABEL = { OUT: "Out of Stock", LOW: "Low Stock", OK: "In Stock" };

function Inventory() {
  const [products,     setProducts]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage,  setCurrentPage]  = useState(1);
  const [selected,     setSelected]     = useState([]);
  const [editProduct,  setEditProduct]  = useState(null);
  const [showDrawer,   setShowDrawer]   = useState(false);
  const [saving,       setSaving]       = useState(false);
  const itemsPerPage = 10;

  useEffect(() => { fetchProducts(); }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await getProducts();
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (p) => {
    if (p.stock === 0)                        return "OUT";
    if (p.stock < (p.reorder_point || 10))    return "LOW";
    return "OK";
  };

  // unique categories from data
  const categories = ["ALL", ...new Set(products.map(p => p.category).filter(Boolean))];

  const filtered = products.filter(p => {
    const matchSearch   = p.name.toLowerCase().includes(search.toLowerCase()) ||
                          p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCategory = categoryFilter === "ALL" || p.category === categoryFilter;
    const matchStatus   = statusFilter   === "ALL" || getStatus(p) === statusFilter;
    return matchSearch && matchCategory && matchStatus;
  });

  const totalPages     = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const paginated      = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    await deleteProduct(id);
    fetchProducts();
    setSelected(prev => prev.filter(s => s !== id));
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} products?`)) return;
    await Promise.all(selected.map(id => deleteProduct(id)));
    setSelected([]);
    fetchProducts();
  };

  const handleEdit = (product) => {
    setEditProduct({ ...product });
    setShowDrawer(true);
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await updateProduct(editProduct.id, editProduct);
      setShowDrawer(false);
      fetchProducts();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const toggleSelect = (id) =>
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const toggleSelectAll = () =>
    setSelected(selected.length === paginated.length ? [] : paginated.map(p => p.id));

  const exportCSV = () => {
    const headers = ["Name", "SKU", "Category", "Stock", "Price", "Status"];
    const rows    = products.map(p => [p.name, p.sku, p.category, p.stock, p.price, STATUS_LABEL[getStatus(p)]]);
    const csv     = [headers, ...rows].map(r => r.join(",")).join("\n");
    const a       = document.createElement("a");
    a.href        = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download    = "inventory.csv";
    a.click();
  };

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
        <div className="flex gap-2">
          <Link to="/add-product"
            className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm transition">
            + Add Product
          </Link>
          <button onClick={exportCSV}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm transition">
            Export CSV
          </button>
          {selected.length > 0 && (
            <button onClick={handleBulkDelete}
              className="px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm transition">
              Delete ({selected.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <input
          type="text" placeholder="Search name or SKU..."
          className="h-10 px-4 rounded-xl bg-background border border-input text-foreground text-sm outline-none flex-1 min-w-48"
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
        />
        <select
          className="h-10 px-3 rounded-xl bg-background border border-input text-foreground text-sm outline-none"
          value={categoryFilter}
          onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          className="h-10 px-3 rounded-xl bg-background border border-input text-foreground text-sm outline-none"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setCurrentPage(1); }}
        >
          <option value="ALL">All Status</option>
          <option value="OK">In Stock</option>
          <option value="LOW">Low Stock</option>
          <option value="OUT">Out of Stock</option>
        </select>
        <span className="h-10 flex items-center text-sm text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground">Loading...</div>
        ) : paginated.length === 0 ? (
          <div className="flex justify-center py-16 text-sm text-muted-foreground">No products found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 w-10">
                  <input type="checkbox"
                    checked={selected.length === paginated.length && paginated.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3 text-left text-muted-foreground font-medium">Product</th>
                <th className="px-4 py-3 text-left text-muted-foreground font-medium">SKU</th>
                <th className="px-4 py-3 text-left text-muted-foreground font-medium">Category</th>
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">Stock</th>
                <th className="px-4 py-3 text-right text-muted-foreground font-medium">Price</th>
                <th className="px-4 py-3 text-center text-muted-foreground font-medium">Status</th>
                <th className="px-4 py-3 text-center text-muted-foreground font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(product => {
                const status = getStatus(product);
                return (
                  <tr key={product.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                    <td className="px-4 py-3">
                      <input type="checkbox"
                        checked={selected.includes(product.id)}
                        onChange={() => toggleSelect(product.id)}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">{product.name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{product.sku}</td>
                    <td className="px-4 py-3 text-muted-foreground">{product.category}</td>
                    <td className="px-4 py-3 text-right text-foreground">{product.stock}</td>
                    <td className="px-4 py-3 text-right text-foreground">₹{product.price.toLocaleString()}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[status]}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-3">
                        <Link to={`/product/${product.id}`} className="text-xs text-blue-400 hover:underline">View</Link>
                        <button onClick={() => handleEdit(product)} className="text-xs text-indigo-400 hover:underline">Edit</button>
                        <button onClick={() => handleDelete(product.id)} className="text-xs text-red-400 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <span className="text-xs text-muted-foreground">
          Showing {Math.min((currentPage - 1) * itemsPerPage + 1, filtered.length)}–{Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length}
        </span>
        <div className="flex gap-2">
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition">
            Prev
          </button>
          <span className="px-3 py-1.5 text-sm text-foreground">
            {currentPage} / {totalPages}
          </span>
          <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
            className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition">
            Next
          </button>
        </div>
      </div>

      {/* Edit Drawer */}
      {showDrawer && editProduct && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40" onClick={() => setShowDrawer(false)} />
          <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-border p-6 shadow-xl z-50 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Edit Product</h2>
              <button onClick={() => setShowDrawer(false)} className="text-muted-foreground hover:text-foreground text-xl">×</button>
            </div>

            {[
              { label: "Name",           key: "name",          type: "text"   },
              { label: "SKU",            key: "sku",           type: "text"   },
              { label: "Category",       key: "category",      type: "text"   },
              { label: "Stock",          key: "stock",         type: "number" },
              { label: "Price (₹)",      key: "price",         type: "number" },
              { label: "Cost Price (₹)", key: "cost_price",    type: "number" },
              { label: "Reorder Point",  key: "reorder_point", type: "number" },
            ].map(field => (
              <div key={field.key} className="mb-4">
                <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">
                  {field.label}
                </label>
                <input
                  type={field.type}
                  className="w-full px-3 py-2 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                  value={editProduct[field.key] ?? ""}
                  onChange={e => setEditProduct({ ...editProduct, [field.key]: field.type === "number" ? +e.target.value : e.target.value })}
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

export default Inventory;
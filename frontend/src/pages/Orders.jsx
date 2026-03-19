import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { getOrders, createOrder, updateOrder, deleteOrder, getProducts } from "../services/productAPI";

const STATUS_STYLE = {
  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  confirmed: "bg-blue-500/10   text-blue-400   border-blue-500/20",
  shipped:   "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  delivered: "bg-green-500/10  text-green-400  border-green-500/20",
  cancelled: "bg-red-500/10    text-red-400    border-red-500/20",
};

function Orders() {
  const [orders,    setOrders]    = useState([]);
  const [products,  setProducts]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");

  const [productId, setProductId] = useState("");
  const [quantity,  setQuantity]  = useState("");
  const [note,      setNote]      = useState("");

  const [statusFilter, setStatusFilter] = useState("ALL");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [ordersRes, productsRes] = await Promise.all([getOrders(), getProducts()]);
      setOrders(ordersRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      setError("Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  // product id → name map
  const productMap = Object.fromEntries(products.map(p => [p.id, p.name]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId) { setError("Please select a product."); return; }
    if (!quantity || +quantity < 1) { setError("Quantity must be at least 1."); return; }

    setSubmitting(true); setError(""); setSuccess("");
    try {
      await createOrder({ product_id: +productId, quantity: +quantity, note });
      setSuccess("Order created successfully.");
      setProductId(""); setQuantity(""); setNote("");
      fetchAll();
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to create order.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      await updateOrder(orderId, { status });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) {
      setError("Failed to update order status.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this order? Stock will be restored.")) return;
    try {
      await deleteOrder(id);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (err) {
      setError("Failed to delete order.");
    }
  };

  const filtered = statusFilter === "ALL"
    ? orders
    : orders.filter(o => o.status === statusFilter);

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">Orders</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Create Order Form ── */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-foreground mb-4">Create Order</h2>

          {error   && <div className="mb-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
          {success && <div className="mb-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{success}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Product</label>
              <select
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none"
                value={productId}
                onChange={e => { setProductId(e.target.value); setError(""); }}
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.stock === 0}>
                    {p.name} {p.stock === 0 ? "(Out of stock)" : `(${p.stock} left)`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Quantity</label>
              <input
                type="number" min="1" placeholder="0"
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none"
                value={quantity}
                onChange={e => { setQuantity(e.target.value); setError(""); }}
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">Note (optional)</label>
              <input
                type="text" placeholder="Add a note..."
                className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>

            {/* selected product info */}
            {productId && (() => {
              const p = products.find(x => x.id === +productId);
              return p ? (
                <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">{p.name}</span>
                  {" · "}₹{p.price} per unit
                  {quantity && ` · Total: ₹${(p.price * +quantity).toLocaleString()}`}
                </div>
              ) : null;
            })()}

            <button type="submit" disabled={submitting}
              className="w-full h-10 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {submitting ? "Creating..." : "Create Order"}
            </button>
          </form>
        </div>

        {/* ── Orders Table ── */}
        <div className="lg:col-span-2">

          {/* filter */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {["ALL", "pending", "confirmed", "shipped", "delivered", "cancelled"].map(s => (
              <button key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition
                  ${statusFilter === s
                    ? "bg-indigo-500 text-white border-indigo-500"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"}`}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="py-16 text-center text-sm text-muted-foreground">Loading orders...</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-sm text-muted-foreground">No orders found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Order</th>
                    <th className="px-4 py-3 text-left text-muted-foreground font-medium">Product</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">Qty</th>
                    <th className="px-4 py-3 text-right text-muted-foreground font-medium">Total</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Status</th>
                    <th className="px-4 py-3 text-center text-muted-foreground font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(order => (
                    <tr key={order.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">#{order.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.created_at ? new Date(order.created_at).toLocaleDateString() : "—"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-foreground">
                        {productMap[order.product_id] || `Product #${order.product_id}`}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground">{order.quantity}</td>
                      <td className="px-4 py-3 text-right text-foreground">
                        {order.total_price ? `₹${order.total_price.toLocaleString()}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <select
                          value={order.status || "pending"}
                          onChange={e => handleStatusChange(order.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full border bg-transparent cursor-pointer outline-none ${STATUS_STYLE[order.status] || STATUS_STYLE.pending}`}
                        >
                          {["pending","confirmed","shipped","delivered","cancelled"].map(s => (
                            <option key={s} value={s} className="bg-background text-foreground">{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleDelete(order.id)}
                          className="text-xs text-red-400 hover:underline">
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-right">
            {filtered.length} order{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>

      </div>
    </Layout>
  );
}

export default Orders;
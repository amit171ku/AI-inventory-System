import Layout from "../components/Layout";
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getProduct, getHistory, getHistorySummary, getProductForecast } from "../services/productAPI";

const ACTION_STYLE = {
  sale:       "bg-red-500/10    text-red-400    border-red-500/20",
  restock:    "bg-green-500/10  text-green-400  border-green-500/20",
  adjustment: "bg-blue-500/10   text-blue-400   border-blue-500/20",
  return:     "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  damage:     "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

function ProductDetail() {
  const { id }    = useParams();
  const navigate  = useNavigate();

  const [product,  setProduct]  = useState(null);
  const [history,  setHistory]  = useState([]);
  const [summary,  setSummary]  = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");

  useEffect(() => { fetchAll(); }, [id]);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [productRes, historyRes, summaryRes] = await Promise.all([
        getProduct(id),
        getHistory(id),
        getHistorySummary(id),
      ]);
      setProduct(productRes.data);
      setHistory(historyRes.data);
      setSummary(summaryRes.data);

      // forecast optional — may fail if no orders
      getProductForecast(id).then(res => setForecast(res.data)).catch(() => {});
    } catch {
      setError("Product not found.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <Layout><div className="py-24 text-center text-sm text-muted-foreground">Loading...</div></Layout>;
  }

  if (error || !product) {
    return (
      <Layout>
        <div className="py-24 text-center">
          <p className="text-red-400 text-sm mb-4">{error || "Product not found."}</p>
          <button onClick={() => navigate("/inventory")} className="text-sm text-indigo-400 hover:underline">
            ← Back to Inventory
          </button>
        </div>
      </Layout>
    );
  }

  const stockStatus = product.stock === 0 ? "out_of_stock"
    : product.stock < (product.reorder_point || 10) ? "low" : "healthy";

  const STATUS_STYLE = {
    out_of_stock: "bg-red-500/10 text-red-400 border-red-500/20",
    low:          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    healthy:      "bg-green-500/10 text-green-400 border-green-500/20",
  };
  const STATUS_LABEL = { out_of_stock: "Out of Stock", low: "Low Stock", healthy: "In Stock" };

  const margin = product.cost_price
    ? ((product.price - product.cost_price) / product.price * 100).toFixed(1)
    : null;

  return (
    <Layout>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-6 text-sm">
        <button onClick={() => navigate("/inventory")} className="text-muted-foreground hover:text-foreground transition">
          ← Inventory
        </button>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Product Info ── */}
        <div className="lg:col-span-2 space-y-5">

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h1 className="text-xl font-bold text-foreground">{product.name}</h1>
                <p className="text-sm text-muted-foreground font-mono mt-0.5">{product.sku}</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full border font-medium ${STATUS_STYLE[stockStatus]}`}>
                {STATUS_LABEL[stockStatus]}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Category",      value: product.category                        },
                { label: "Stock",         value: `${product.stock} units`                },
                { label: "Price",         value: `₹${product.price.toLocaleString()}`, cls: "text-indigo-400" },
                { label: "Cost Price",    value: product.cost_price ? `₹${product.cost_price.toLocaleString()}` : "—" },
                { label: "Margin",        value: margin ? `${margin}%` : "—", cls: margin > 30 ? "text-green-400" : "text-yellow-400" },
                { label: "Reorder Point", value: `${product.reorder_point || 10} units`  },
                { label: "Reorder Qty",   value: `${product.reorder_qty   || 50} units`  },
                { label: "Inventory Value", value: `₹${(product.stock * product.price).toLocaleString()}` },
              ].map(f => (
                <div key={f.label} className="bg-muted/30 border border-border rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">{f.label}</p>
                  <p className={`font-semibold text-sm ${f.cls || "text-foreground"}`}>{f.value}</p>
                </div>
              ))}
            </div>

            {product.description && (
              <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm text-foreground">{product.description}</p>
              </div>
            )}
          </div>

          {/* Stock History */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-foreground">Stock History</h2>
              {summary && (
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span className="text-green-400">+{summary.total_added} added</span>
                  <span className="text-red-400">−{summary.total_removed} removed</span>
                </div>
              )}
            </div>

            {history.length === 0 ? (
              <p className="text-sm text-muted-foreground">No stock history available.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ACTION_STYLE[h.action] || "bg-muted text-muted-foreground border-border"}`}>
                        {h.action}
                      </span>
                      <div>
                        {h.note && <p className="text-xs text-muted-foreground">{h.note}</p>}
                        {h.stock_before != null && (
                          <p className="text-xs text-muted-foreground">
                            {h.stock_before} → {h.stock_after}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`font-semibold text-sm ${h.change > 0 ? "text-green-400" : "text-red-400"}`}>
                        {h.change > 0 ? "+" : ""}{h.change}
                      </span>
                      {h.created_at && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(h.created_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="space-y-5">

          {/* History Summary */}
          {summary && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Stock Summary</h2>
              <div className="space-y-2">
                {[
                  { label: "Current Stock",   value: `${summary.current_stock} units` },
                  { label: "Total Added",     value: `+${summary.total_added}`,  cls: "text-green-400" },
                  { label: "Total Removed",   value: `-${summary.total_removed}`, cls: "text-red-400"   },
                  { label: "Total Entries",   value: summary.total_entries       },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className={`text-xs font-semibold ${s.cls || "text-foreground"}`}>{s.value}</span>
                  </div>
                ))}
              </div>
              {summary.by_action && Object.keys(summary.by_action).length > 0 && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted-foreground mb-2">By action</p>
                  {Object.entries(summary.by_action).map(([action, count]) => (
                    <div key={action} className="flex justify-between items-center py-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${ACTION_STYLE[action] || "bg-muted text-muted-foreground border-border"}`}>
                        {action}
                      </span>
                      <span className="text-xs text-muted-foreground">{count}×</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Forecast summary */}
          {forecast && !forecast.message && (
            <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
              <h2 className="font-semibold text-foreground mb-4">Forecast</h2>
              <div className="space-y-2">
                {[
                  { label: "Days of Stock",  value: forecast.days_of_stock_left ? `~${forecast.days_of_stock_left}d` : "—" },
                  { label: "Reorder Point",  value: `${forecast.reorder_point} units`, cls: "text-yellow-400" },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center py-1.5 border-b border-border last:border-0">
                    <span className="text-xs text-muted-foreground">{s.label}</span>
                    <span className={`text-xs font-semibold ${s.cls || "text-foreground"}`}>{s.value}</span>
                  </div>
                ))}
                {forecast.forecast?.slice(0, 3).map((f, i) => (
                  <div key={i} className="flex justify-between items-center py-1">
                    <span className="text-xs text-muted-foreground">{f.month}</span>
                    <span className="text-xs font-semibold text-indigo-400">{f.predicted_demand} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <h2 className="font-semibold text-foreground mb-3">Metadata</h2>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Product ID</span>
                <span className="font-mono text-foreground">#{product.id}</span>
              </div>
              {product.created_at && (
                <div className="flex justify-between">
                  <span>Created</span>
                  <span>{new Date(product.created_at).toLocaleDateString()}</span>
                </div>
              )}
              {product.updated_at && (
                <div className="flex justify-between">
                  <span>Updated</span>
                  <span>{new Date(product.updated_at).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}

export default ProductDetail;
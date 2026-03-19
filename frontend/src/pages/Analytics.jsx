import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { getAnalytics } from "../services/productAPI";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer
} from "recharts";

const COLORS = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];

const INSIGHT_STYLES = {
  danger:  { bg: "bg-red-500/10",    border: "border-red-500/20",    text: "text-red-400",    icon: "⛔", label: "Critical" },
  warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", icon: "⚠️", label: "Warning"  },
  info:    { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   icon: "💡", label: "Info"     },
};

const STATUS_BADGE = {
  out_of_stock: "bg-red-500/15 text-red-400 border border-red-500/20",
  low:          "bg-yellow-500/15 text-yellow-400 border border-yellow-500/20",
  moderate:     "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  healthy:      "bg-green-500/15 text-green-400 border border-green-500/20",
};

// Naya function add kiya bade numbers ko compact format (K, M, Cr) mein dikhane ke liye
const formatCompactNumber = (number) => {
  if (number === undefined || number === null) return "0";
  return new Intl.NumberFormat('en-IN', { 
    notation: 'compact', 
    maximumFractionDigits: 2 
  }).format(number);
};

// KPICard ko update kiya: min-w-0 aur truncate classes add ki, aur hover title diya
function KPICard({ label, value, sub, fullValue }) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-lg hover:scale-[1.02] transition min-w-0">
      <p className="text-sm text-muted-foreground mb-2 truncate">{label}</p>
      <p 
        className="text-2xl xl:text-3xl font-bold text-foreground truncate" 
        title={fullValue || value} // Hover karne par poori value dikhegi
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { fetchAnalytics(); }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await getAnalytics();
      setData(res.data);
    } catch (err) {
      setError("Failed to load analytics. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24 text-muted-foreground text-sm">
          Loading analytics...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24 text-red-400 text-sm">
          {error}
        </div>
      </Layout>
    );
  }

  const kpis          = data.kpis          ?? {};
  const stock_data    = data.stock_data    ?? [];
  const category_data = data.category_data ?? [];
  const sales_trend   = data.sales_trend   ?? [];
  const top_products  = data.top_products  ?? [];
  const insights      = data.insights      ?? [];

  const inv_value    = kpis.total_inventory_value ?? 0;
  const total_skus   = kpis.total_skus            ?? 0;
  const total_units  = kpis.total_units_in_stock  ?? 0;
  const total_orders = kpis.total_orders          ?? 0;
  const out_of_stock = kpis.out_of_stock_count    ?? 0;
  const low_stock    = kpis.low_stock_count       ?? 0;

  return (
    <Layout>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground truncate">Inventory Analytics</h1>
        <span className="text-xs text-muted-foreground shrink-0 ml-4">
          Last updated: {new Date(data.generated_at).toLocaleTimeString()}
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KPICard 
          label="Inventory Value"  
          value={`₹${formatCompactNumber(inv_value)}`} 
          fullValue={`₹${inv_value.toLocaleString('en-IN')}`} // Tooltip ke liye raw number
        />
        <KPICard 
          label="Total SKUs"       
          value={formatCompactNumber(total_skus)} 
          fullValue={total_skus.toLocaleString()}
        />
        <KPICard 
          label="Total Units"      
          value={formatCompactNumber(total_units)} 
          fullValue={total_units.toLocaleString()}
        />
        <KPICard 
          label="Total Orders"     
          value={formatCompactNumber(total_orders)} 
          fullValue={total_orders.toLocaleString()}
        />
        <KPICard label="Out of Stock"     value={out_of_stock} sub="needs reorder" />
        <KPICard label="Low Stock"        value={low_stock}    sub="below threshold" />
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Bar Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Stock by Product</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={stock_data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="product" stroke="#888" tick={{ fontSize: 11 }} tickMargin={8} />
              <YAxis stroke="#888" tick={{ fontSize: 11 }} width={45} />
              <Tooltip
                contentStyle={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
              />
              <Bar dataKey="stock" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Pie Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Category Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={category_data} dataKey="value" outerRadius={90} label={({ name, pct }) => `${name} ${pct}%`}>
                {category_data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(val, name, props) => [`${val} SKUs`, props.payload.name]}
                contentStyle={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* ── Line Chart ── */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-lg mb-6 min-w-0">
        <h2 className="font-semibold text-foreground mb-4 truncate">Monthly Sales Trend</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={sales_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 11 }} tickMargin={10} minTickGap={15} />
            <YAxis stroke="#888" tick={{ fontSize: 11 }} width={45} />
            <Tooltip
              contentStyle={{ background: "#1e2130", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", fontSize: "12px" }}
            />
            <Line type="monotone" dataKey="sales" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
            <Line type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 3" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Bottom Row: Top Products + Insights ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Products */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Top Selling Products</h2>
          <div className="space-y-3">
            {top_products.map((p, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground">
                    {i + 1}
                  </span>
                  <span className="text-sm text-foreground font-medium truncate">{p.name}</span>
                </div>
                <span className="text-sm text-muted-foreground shrink-0 ml-2">{p.units_sold} units</span>
              </div>
            ))}
            {top_products.length === 0 && (
              <p className="text-sm text-muted-foreground">No sales data available.</p>
            )}
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-lg min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">
            AI Insights
            {insights.length > 0 && (
              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                {insights.length}
              </span>
            )}
          </h2>

          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">All good — no issues detected.</p>
          ) : (
            <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {insights.map((insight, index) => {
                const style = INSIGHT_STYLES[insight.type] ?? INSIGHT_STYLES.info;
                return (
                  <li
                    key={index}
                    className={`${style.bg} border ${style.border} p-3 rounded-xl transition hover:opacity-90`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-base shrink-0">{style.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${style.text} shrink-0`}>
                            {style.label}
                          </span>
                          {insight.product && (
                            <span className="text-xs text-muted-foreground truncate">
                              · {insight.product}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-foreground leading-snug">
                          {insight.message}
                        </p>
                        {insight.action && (
                          <p className="text-xs text-muted-foreground mt-1">
                            → {insight.action}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

      </div>

      {/* ── Stock Status Table ── */}
      <div className="bg-card border border-border rounded-2xl shadow-lg mt-6 overflow-hidden">
        <div className="p-6 border-b border-border">
          <h2 className="font-semibold text-foreground">Stock Status Detail</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Product</th>
                <th className="text-left px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Category</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Stock</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Value</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Sold</th>
                <th className="text-right px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Turnover</th>
                <th className="text-center px-6 py-3 text-muted-foreground font-medium whitespace-nowrap">Status</th>
              </tr>
            </thead>
            <tbody>
              {stock_data.map((item, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition">
                  <td className="px-6 py-3 font-medium text-foreground whitespace-nowrap">{item.product}</td>
                  <td className="px-6 py-3 text-muted-foreground whitespace-nowrap">{item.category}</td>
                  <td className="px-6 py-3 text-right text-foreground whitespace-nowrap">{item.stock}</td>
                  <td className="px-6 py-3 text-right text-foreground whitespace-nowrap">₹{item.value.toLocaleString('en-IN')}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground whitespace-nowrap">{item.units_sold ?? "—"}</td>
                  <td className="px-6 py-3 text-right text-muted-foreground whitespace-nowrap">
                    {item.turnover_rate != null ? item.turnover_rate.toFixed(2) : "—"}
                  </td>
                  <td className="px-6 py-3 text-center whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[item.status] ?? ""}`}>
                      {item.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </Layout>
  );
}

export default Analytics;
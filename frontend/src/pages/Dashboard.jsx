import Layout from "../components/Layout";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { getProducts, getAnalytics, getOrders } from "../services/productAPI";
import { useEffect, useState } from "react";

// Naya function add kiya bade numbers ko compact format (K, M, Cr) mein dikhane ke liye
const formatCompactNumber = (number) => {
  if (number === undefined || number === null) return "0";
  return new Intl.NumberFormat('en-IN', { 
    notation: 'compact', 
    maximumFractionDigits: 2 
  }).format(number);
};

// StatCard ko update kiya: min-w-0 aur truncate classes add ki, aur hover title diya
function StatCard({ label, value, sub, valueClass = "text-foreground", fullValue }) {
  return (
    <div className="bg-card border border-border p-6 rounded-2xl shadow-sm hover:scale-[1.02] transition min-w-0">
      <p className="text-sm text-muted-foreground mb-2 truncate">{label}</p>
      <p 
        className={`text-2xl xl:text-3xl font-bold truncate ${valueClass}`}
        title={fullValue || value} // Hover karne par poori value dikhegi
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
    </div>
  );
}

function Dashboard() {
  const [products,  setProducts]  = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [prodRes, analyticsRes, ordersRes] = await Promise.all([
        getProducts(),
        getAnalytics(),
        getOrders(),
      ]);
      setProducts(prodRes.data);
      setAnalytics(analyticsRes.data);
      setOrders(ordersRes.data.slice(0, 5)); // latest 5
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24 text-muted-foreground text-sm">
          Loading dashboard...
        </div>
      </Layout>
    );
  }

  // KPIs — Mapped to the updated backend structure
  const kpis          = analytics?.kpis ?? {};
  const totalProducts = kpis.total_skus            ?? products.length;
  const invValue      = kpis.total_inventory_value ?? products.reduce((s, p) => s + p.price * p.stock, 0);
  const outOfStock    = kpis.out_of_stock_count    ?? 0;
  const lowStockCount = kpis.low_stock_count       ?? 0;
  const totalOrders   = kpis.total_orders          ?? orders.length;

  // chart data
  const chartData = (analytics?.stock_data ?? products.map(p => ({ product: p.name, stock: p.stock })))
    .slice(0, 10);

  // low stock list
  const lowStock = products
    .filter(p => p.stock > 0 && p.stock < (p.reorder_point || 10))
    .slice(0, 6);

  const outList = products.filter(p => p.stock === 0).slice(0, 4);

  // insights
  const insights = (analytics?.insights ?? []).slice(0, 4);

  return (
    <Layout>

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-foreground truncate">Dashboard</h1>
        {analytics?.generated_at && (
          <span className="text-xs text-muted-foreground shrink-0 ml-4">
            Updated {new Date(analytics.generated_at).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        <StatCard 
          label="Total Products"    
          value={formatCompactNumber(totalProducts)} 
          fullValue={totalProducts.toLocaleString()}
        />
        <StatCard 
          label="Inventory Value"   
          value={`₹${formatCompactNumber(invValue)}`} 
          fullValue={`₹${Number(invValue).toLocaleString('en-IN')}`}
        />
        <StatCard 
          label="Total Orders"      
          value={formatCompactNumber(totalOrders)} 
          fullValue={totalOrders.toLocaleString()}
        />
        <StatCard 
          label="Low Stock"         
          value={formatCompactNumber(lowStockCount)} 
          fullValue={lowStockCount}
          valueClass="text-yellow-500" 
          sub="below threshold" 
        />
        <StatCard 
          label="Out of Stock"      
          value={formatCompactNumber(outOfStock)} 
          fullValue={outOfStock}
          valueClass="text-red-500"    
          sub="needs reorder" 
        />
      </div>

      {/* ── Chart + Alerts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Bar Chart */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Stock Overview</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
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

        {/* Low Stock + Out of Stock */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Stock Alerts</h2>

          {outList.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-red-400 uppercase tracking-wide font-medium mb-2">Out of Stock</p>
              {outList.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 min-w-0">
                  <span className="text-sm text-foreground truncate mr-2">{item.name}</span>
                  <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full shrink-0">
                    Out of stock
                  </span>
                </div>
              ))}
            </div>
          )}

          {lowStock.length === 0 && outList.length === 0 ? (
            <p className="text-sm text-green-400">All products have sufficient stock.</p>
          ) : (
            <>
              {lowStock.length > 0 && (
                <p className="text-xs text-yellow-400 uppercase tracking-wide font-medium mb-2">Low Stock</p>
              )}
              {lowStock.map((item, i) => (
                <div key={i} className="flex justify-between py-2 border-b border-border last:border-0 min-w-0">
                  <span className="text-sm text-foreground truncate mr-2">{item.name}</span>
                  <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full shrink-0">
                    {item.stock} left
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

      </div>

      {/* ── AI Insights + Recent Orders ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* AI Insights */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">AI Insights</h2>
          {insights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issues detected.</p>
          ) : (
            <div className="space-y-3">
              {insights.map((ins, i) => {
                const styles = {
                  danger:  { bg: "bg-red-500/10",    border: "border-red-500/20",    text: "text-red-400",    icon: "⛔" },
                  warning: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", icon: "⚠️" },
                  info:    { bg: "bg-blue-500/10",   border: "border-blue-500/20",   text: "text-blue-400",   icon: "💡" },
                };
                const s = styles[ins.type] ?? styles.info;
                return (
                  <div key={i} className={`${s.bg} border ${s.border} p-3 rounded-xl`}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm shrink-0">{s.icon}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">{ins.message}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">→ {ins.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm min-w-0">
          <h2 className="font-semibold text-foreground mb-4 truncate">Recent Orders</h2>
          {orders.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="space-y-0">
              {orders.map((order, i) => {
                const statusColors = {
                  confirmed: "bg-green-500/10 text-green-400 border-green-500/20",
                  pending:   "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
                  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
                  shipped:   "bg-blue-500/10 text-blue-400 border-blue-500/20",
                  delivered: "bg-teal-500/10 text-teal-400 border-teal-500/20",
                };
                const sc = statusColors[order.status] ?? "bg-muted text-muted-foreground border-border";
                return (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-border last:border-0 min-w-0">
                    <div className="min-w-0 mr-2">
                      <p className="text-sm text-foreground font-medium truncate">Order #{order.id}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {order.quantity} units · {new Date(order.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full border shrink-0 ${sc}`}>
                      {order.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </Layout>
  );
}

export default Dashboard;
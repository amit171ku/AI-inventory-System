import Layout from "../components/Layout";
import { useEffect, useState } from "react";
import { getForecast, getProducts, getProductForecast } from "../services/productAPI";
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, ResponsiveContainer, ReferenceLine, Area, AreaChart
} from "recharts";

function Forecast() {
  const [globalForecast, setGlobalForecast] = useState(null);
  const [products,       setProducts]       = useState([]);
  const [selectedId,     setSelectedId]     = useState("");
  const [productForecast, setProductForecast] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error,          setError]          = useState("");

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [forecastRes, productsRes] = await Promise.all([getForecast(), getProducts()]);
      setGlobalForecast(forecastRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to load forecast.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProductForecast = async (id) => {
    if (!id) { setProductForecast(null); return; }
    setLoadingProduct(true);
    try {
      const res = await getProductForecast(id);
      setProductForecast(res.data);
    } catch {
      setProductForecast(null);
    } finally {
      setLoadingProduct(false);
    }
  };

  // Build chart data from new API format
  const buildChartData = (forecast) => {
    if (!forecast?.forecast) return [];
    return forecast.forecast.map(f => ({
      month:       f.month,
      demand:      f.predicted_demand,
      // Default to demand if bounds are missing (like in Cold Start Fallback)
      lower:       f.lower_bound ?? f.predicted_demand, 
      upper:       f.upper_bound ?? f.predicted_demand,
    }));
  };

  const getTrend = (forecast) => {
    const data = forecast?.forecast || [];
    if (data.length < 2) return "Stable";
    const first = data[0].predicted_demand;
    const last  = data[data.length - 1].predicted_demand;
    const diff  = ((last - first) / first) * 100;
    if (diff > 5)  return "Increasing";
    if (diff < -5) return "Decreasing";
    return "Stable";
  };

  const trend       = getTrend(globalForecast);
  const chartData   = buildChartData(globalForecast);
  const productChartData = buildChartData(productForecast);

  const TREND_STYLE = {
    Increasing: "text-green-400",
    Decreasing: "text-red-400",
    Stable:     "text-yellow-400",
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card border border-border rounded-lg p-3 text-xs shadow-lg">
        <p className="font-medium text-foreground mb-1">{label}</p>
        {payload.map(p => {
          // Hide upper/lower bounds in tooltip if they are exactly the same as demand (Cold Start scenario)
          if ((p.dataKey === "upper" || p.dataKey === "lower") && p.value === payload.find(x => x.dataKey === "demand")?.value) {
              return null;
          }
          return (
            <p key={p.dataKey} style={{ color: p.color }}>
              {p.dataKey === "demand" ? "Forecast" : p.dataKey === "upper" ? "Upper" : "Lower"}: {Number(p.value).toFixed(1)}
            </p>
          )
        })}
      </div>
    );
  };

  // Helper to render a nice badge based on the model used
  const renderModelBadge = (modelString) => {
    if (!modelString) return "—";
    if (modelString.includes("Category Average")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
          💡 New Product Fallback
        </span>
      );
    }
    if (modelString.includes("Moving Average")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-500/15 text-yellow-400 border border-yellow-500/20">
          📊 Moving Average
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/15 text-indigo-400 border border-indigo-500/20">
        🤖 ARIMA
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center py-24 text-muted-foreground text-sm">
          Generating AI forecast...
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">AI Demand Forecast</h1>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ── Global KPI cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Model",             value: globalForecast?.model ? renderModelBadge(globalForecast.model) : "—", sub: globalForecast?.model },
          { label: "Forecast Horizon",  value: `${globalForecast?.forecast_horizon || 3} months`, sub: null },
          { label: "Recommended Stock", value: `${globalForecast?.recommended_stock || 0} units`,  sub: "with 20% buffer", cls: "text-indigo-400" },
          { label: "Demand Trend",      value: trend, sub: null, cls: TREND_STYLE[trend] },
        ].map(k => (
          <div key={k.label} className="bg-card border border-border p-5 rounded-2xl shadow-sm">
            <p className="text-xs text-muted-foreground mb-2">{k.label}</p>
            {/* If value is a string (like numbers), render text. If it's a React element (like our badge), render directly */}
            {typeof k.value === "string" ? (
              <p className={`text-xl font-bold ${k.cls || "text-foreground"}`}>{k.value}</p>
            ) : (
              <div className="mb-1">{k.value}</div>
            )}
            
            {k.sub && <p className="text-[10px] text-muted-foreground mt-1 truncate" title={k.sub}>{k.sub}</p>}
          </div>
        ))}
      </div>

      {/* ── Global forecast chart ── */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-foreground">Global Demand Forecast</h2>
          <span className="text-xs text-muted-foreground">
            Based on {globalForecast?.historical_points || 0} historical data points
          </span>
        </div>
        
        {chartData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="demandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 11 }} />
                <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="upper"  stroke="rgba(99,102,241,0.3)" fill="rgba(99,102,241,0.05)" strokeDasharray="4 3" dot={false} />
                <Area type="monotone" dataKey="demand" stroke="#6366f1" fill="url(#demandGrad)" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Area type="monotone" dataKey="lower"  stroke="rgba(99,102,241,0.3)" fill="rgba(99,102,241,0.05)" strokeDasharray="4 3" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground mt-2 text-center">Shaded area = confidence interval</p>
          </>
        ) : (
          <div className="py-12 text-center">
            <p className="text-sm text-muted-foreground">
              {globalForecast?.message || "Not enough order data to generate forecast. Add orders first."}
            </p>
          </div>
        )}
      </div>

      {/* ── Per-product forecast ── */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="font-semibold text-foreground">Per-Product Forecast</h2>
          <select
            className="h-9 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none w-full sm:w-auto min-w-[200px]"
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); fetchProductForecast(e.target.value); }}
          >
            <option value="">Select a product...</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {loadingProduct && <p className="text-sm text-muted-foreground py-8 text-center">Loading product forecast...</p>}

        {productForecast && !loadingProduct && (
          <div className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: "Current Stock",   value: `${productForecast.current_stock} units`                         },
                { label: "Reorder Point",   value: `${productForecast.reorder_point} units`, cls: "text-yellow-400" },
                { label: "Days of Stock",   value: productForecast.days_of_stock_left ? `~${productForecast.days_of_stock_left} days` : "—" },
                { label: "Prediction Model", value: renderModelBadge(productForecast.model)                         },
              ].map(k => (
                <div key={k.label} className="bg-muted/30 border border-border rounded-xl p-4">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  {typeof k.value === "string" ? (
                     <p className={`text-lg font-semibold mt-1 ${k.cls || "text-foreground"}`}>{k.value}</p>
                  ) : (
                     <div className="mt-2">{k.value}</div>
                  )}
                </div>
              ))}
            </div>
            
            {productForecast.message && productForecast.message.includes("No order history") && (
              <div className="mb-5 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm flex items-center gap-2">
                💡 <span>{productForecast.message}</span>
              </div>
            )}

            {productChartData.length > 0 && (
              <div className="mb-6 border border-border rounded-xl p-4 bg-muted/10">
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={productChartData}>
                    <defs>
                      <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}    />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" stroke="#888" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#888" tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {/* Render bounds only if it's not a cold start fallback (where bounds equal demand) */}
                    {!productForecast?.model?.includes("Category Average") && (
                      <Area type="monotone" dataKey="upper"  stroke="rgba(34,197,94,0.3)" fill="rgba(34,197,94,0.05)" strokeDasharray="4 3" dot={false} />
                    )}
                    <Area type="monotone" dataKey="demand" stroke="#22c55e" fill="url(#prodGrad)" strokeWidth={2} dot={{ r: 3 }} />
                    {!productForecast?.model?.includes("Category Average") && (
                      <Area type="monotone" dataKey="lower"  stroke="rgba(34,197,94,0.3)" fill="rgba(34,197,94,0.05)" strokeDasharray="4 3" dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Forecast table */}
            {productForecast.forecast?.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Month</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Predicted Demand</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Lower Bound</th>
                      <th className="px-4 py-3 text-right text-muted-foreground font-medium">Upper Bound</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productForecast.forecast.map((f, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 text-foreground font-medium">{f.month}</td>
                        <td className="px-4 py-3 text-right text-indigo-400 font-bold">{f.predicted_demand} units</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{f.lower_bound ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-muted-foreground">{f.upper_bound ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── AI Insights ── */}
      <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
        <h2 className="font-semibold text-foreground mb-4">AI Insights</h2>
        <ul className="space-y-3 text-sm">
          {[
            { icon: "📈", text: `Global demand is expected to be ${trend.toLowerCase()} in upcoming months.` },
            { icon: "📦", text: `Global recommended stock level: ${globalForecast?.recommended_stock || 0} units (includes 20% safety buffer).` },
            { icon: "🤖", text: `Global forecast generated using ${globalForecast?.model || "ARIMA"} on ${globalForecast?.historical_points || 0} historical data points.` },
            { icon: "⚠️", text: "Select a product above to see individual demand forecast and days-of-stock remaining." },
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-3 p-3 rounded-xl bg-muted/20 border border-border">
              <span className="shrink-0">{item.icon}</span>
              <span className="text-muted-foreground leading-relaxed">{item.text}</span>
            </li>
          ))}
        </ul>
      </div>

    </Layout>
  );
}

export default Forecast;
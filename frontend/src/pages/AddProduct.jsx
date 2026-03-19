import { useState } from "react";
import Layout from "../components/Layout";
import { createProduct, bulkUpload } from "../services/productAPI";
import { useNavigate } from "react-router-dom";

const EMPTY = { name: "", sku: "", category: "", stock: "", price: "", cost_price: "", reorder_point: "10", reorder_qty: "50", description: "" };

function AddProduct() {
  const [form,       setForm]       = useState(EMPTY);
  const [file,       setFile]       = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [error,      setError]      = useState("");
  const [bulkResult, setBulkResult] = useState(null);
  const navigate = useNavigate();

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.sku || !form.stock || !form.price) {
      setError("Name, SKU, Stock and Price are required."); return;
    }
    setSubmitting(true); setError("");
    try {
      await createProduct({
        name:          form.name.trim(),
        sku:           form.sku.trim(),
        category:      form.category.trim() || "General",
        stock:         Number(form.stock),
        price:         Number(form.price),
        cost_price:    form.cost_price    ? Number(form.cost_price)    : null,
        reorder_point: form.reorder_point ? Number(form.reorder_point) : 10,
        reorder_qty:   form.reorder_qty   ? Number(form.reorder_qty)   : 50,
        description:   form.description.trim() || null,
      });
      navigate("/inventory");
    } catch (err) {
      setError(err?.response?.data?.detail || "Failed to add product.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkUpload = async () => {
    if (!file) { setError("Please select a CSV file first."); return; }
    setUploading(true); setError(""); setBulkResult(null);
    try {
      const res = await bulkUpload(file);
      setBulkResult(res.data);
      if (res.data.errors?.length === 0) {
        setTimeout(() => navigate("/inventory"), 1500);
      }
    } catch (err) {
      setError(err?.response?.data?.detail || "Bulk upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "name,sku,category,stock,price,cost_price,reorder_point\nSample Product,SKU001,Electronics,100,999,750,10";
    const a   = document.createElement("a");
    a.href    = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "product_template.csv";
    a.click();
  };

  const FIELDS = [
    { label: "Product Name *", key: "name",          type: "text",   placeholder: "e.g. USB-C Hub Pro",   col: 2 },
    { label: "SKU *",          key: "sku",            type: "text",   placeholder: "e.g. USB-HUB-001",     col: 1 },
    { label: "Category",       key: "category",       type: "text",   placeholder: "e.g. Electronics",     col: 1 },
    { label: "Stock *",        key: "stock",          type: "number", placeholder: "0",                    col: 1 },
    { label: "Price (₹) *",    key: "price",          type: "number", placeholder: "0.00",                 col: 1 },
    { label: "Cost Price (₹)", key: "cost_price",     type: "number", placeholder: "0.00",                 col: 1 },
    { label: "Reorder Point",  key: "reorder_point",  type: "number", placeholder: "10",                   col: 1 },
    { label: "Description",    key: "description",    type: "text",   placeholder: "Optional description", col: 2 },
  ];

  return (
    <Layout>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate("/inventory")}
          className="text-sm text-muted-foreground hover:text-foreground transition">
          ← Inventory
        </button>
        <span className="text-muted-foreground">/</span>
        <h1 className="text-2xl font-bold text-foreground">Add Product</h1>
      </div>

      {error && (
        <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm max-w-3xl">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 max-w-5xl">

        {/* ── Single Product Form ── */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-foreground mb-5">Single Product</h2>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              {FIELDS.map(f => (
                <div key={f.key} className={f.col === 2 ? "col-span-2" : ""}>
                  <label className="text-xs text-muted-foreground uppercase tracking-wide mb-1 block">{f.label}</label>
                  <input
                    type={f.type} placeholder={f.placeholder}
                    className="w-full h-10 px-3 rounded-lg bg-background border border-input text-foreground text-sm outline-none focus:border-indigo-500 transition"
                    value={form[f.key]}
                    onChange={e => { set(f.key, e.target.value); setError(""); }}
                  />
                </div>
              ))}
            </div>

            {/* margin preview */}
            {form.price && form.cost_price && (
              <div className="p-3 rounded-lg bg-muted/40 border border-border text-xs text-muted-foreground mb-4">
                Margin: ₹{(Number(form.price) - Number(form.cost_price)).toFixed(2)}
                {" "}({((Number(form.price) - Number(form.cost_price)) / Number(form.price) * 100).toFixed(1)}%)
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="w-full h-10 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {submitting ? "Adding..." : "Add Product"}
            </button>
          </form>
        </div>

        {/* ── Bulk Upload ── */}
        <div className="bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="font-semibold text-foreground mb-2">Bulk Upload (CSV)</h2>
          <p className="text-sm text-muted-foreground mb-5">
            Upload multiple products at once using a CSV file.
          </p>

          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-border rounded-xl p-8 text-center mb-4 cursor-pointer hover:border-indigo-500 transition"
            onClick={() => document.getElementById("csv-input").click()}
          >
            {file ? (
              <div>
                <p className="text-sm font-medium text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground">Click to select CSV file</p>
                <p className="text-xs text-muted-foreground mt-1">Only .csv files accepted</p>
              </div>
            )}
          </div>

          <input id="csv-input" type="file" accept=".csv"
            className="hidden"
            onChange={e => { setFile(e.target.files[0]); setError(""); setBulkResult(null); }}
          />

          <div className="flex gap-3 mb-4">
            <button onClick={handleBulkUpload} disabled={uploading || !file}
              className="flex-1 h-10 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition disabled:opacity-50">
              {uploading ? "Uploading..." : "Upload CSV"}
            </button>
            <button onClick={downloadTemplate}
              className="h-10 px-4 rounded-lg border border-border text-sm text-muted-foreground hover:bg-muted transition">
              Template
            </button>
          </div>

          {/* CSV format hint */}
          <div className="p-3 rounded-lg bg-muted/40 border border-border">
            <p className="text-xs text-muted-foreground font-medium mb-1">Required columns:</p>
            <code className="text-xs text-foreground">name, sku, stock, price</code>
            <p className="text-xs text-muted-foreground mt-1">Optional: category, cost_price, reorder_point</p>
          </div>

          {/* Bulk result */}
          {bulkResult && (
            <div className="mt-4 p-3 rounded-lg bg-muted/40 border border-border text-xs space-y-1">
              <p className="text-green-400 font-medium">{bulkResult.message}</p>
              {bulkResult.skipped?.length > 0 && (
                <p className="text-yellow-400">Skipped (duplicate SKU): {bulkResult.skipped.join(", ")}</p>
              )}
              {bulkResult.errors?.length > 0 && (
                <div className="text-red-400">
                  {bulkResult.errors.map((e, i) => (
                    <p key={i}>Row {e.row}: {e.error}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </Layout>
  );
}

export default AddProduct;
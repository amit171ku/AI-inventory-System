import Layout from "../components/Layout";
import { useState, useRef, useEffect } from "react";
import { askAI, getAISummary } from "../services/productAPI";

const QUICK_PROMPTS = [
  "How many products are low on stock?",
  "What is the total inventory value?",
  "Which product has the highest stock?",
  "Are there any out of stock items?",
  "How many total orders are there?",
];

function ChatBubble({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
          AI
        </div>
      )}
      <div className={`px-4 py-2.5 rounded-2xl max-w-lg text-sm leading-relaxed whitespace-pre-wrap
        ${isUser
          ? "bg-indigo-500 text-white rounded-br-sm"
          : "bg-card border border-border text-foreground rounded-bl-sm"
        }`}>
        {msg.text}
      </div>
    </div>
  );
}

function AIAssistant() {
  const [messages,  setMessages]  = useState([
    { role: "ai", text: "Hello! I am your AI Inventory Assistant. Ask me anything about your stock, orders, or products." }
  ]);
  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [summary,  setSummary]  = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    getAISummary().then(res => setSummary(res.data)).catch(() => {});
  }, []);

  const sendMessage = async (text) => {
    const q = (text || input).trim();
    if (!q) return;

    setMessages(prev => [...prev, { role: "user", text: q }]);
    setInput("");
    setLoading(true);

    try {
      const res = await askAI(q);
      setMessages(prev => [...prev, { role: "ai", text: res.data.answer }]);
    } catch {
      setMessages(prev => [...prev, { role: "ai", text: "Sorry, I couldn't connect to the AI service. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Layout>
      <h1 className="text-2xl font-bold mb-6 text-foreground">AI Inventory Assistant</h1>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 max-w-6xl">

        {/* ── Sidebar: Summary + Quick Prompts ── */}
        <div className="space-y-4">

          {/* Inventory snapshot */}
          {summary && (
            <div className="bg-card border border-border rounded-2xl p-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-medium">Inventory Snapshot</p>
              <div className="space-y-2">
                {[
                  { label: "Total Products", value: summary.total_products },
                  { label: "Total Orders",   value: summary.total_orders   },
                  { label: "Out of Stock",   value: summary.out_of_stock, danger: summary.out_of_stock > 0 },
                  { label: "Low Stock",      value: summary.low_stock,    warn:   summary.low_stock   > 0 },
                  { label: "Inv. Value",     value: `₹${Number(summary.inventory_value).toLocaleString()}` },
                ].map(item => (
                  <div key={item.label} className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">{item.label}</span>
                    <span className={`text-xs font-semibold
                      ${item.danger ? "text-red-400" : item.warn ? "text-yellow-400" : "text-foreground"}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick prompts */}
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-medium">Quick Ask</p>
            <div className="space-y-2">
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => sendMessage(p)} disabled={loading}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted px-3 py-2 rounded-lg transition disabled:opacity-40">
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Clear chat */}
          <button
            onClick={() => setMessages([{ role: "ai", text: "Chat cleared. How can I help you?" }])}
            className="w-full text-xs text-muted-foreground border border-border rounded-xl py-2 hover:bg-muted transition">
            Clear Chat
          </button>
        </div>

        {/* ── Chat Window ── */}
        <div className="lg:col-span-3 flex flex-col bg-card border border-border rounded-2xl shadow-sm overflow-hidden" style={{ height: "70vh" }}>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg, i) => <ChatBubble key={i} msg={msg} />)}

            {loading && (
              <div className="flex justify-start">
                <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs mr-2 mt-1 flex-shrink-0">
                  AI
                </div>
                <div className="bg-card border border-border px-4 py-3 rounded-2xl rounded-bl-sm">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400"
                        style={{ animation: `bounce 1s ${i * 0.15}s infinite` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-3">
              <input
                className="flex-1 h-11 px-4 rounded-xl bg-background border border-input text-foreground text-sm placeholder:text-muted-foreground outline-none focus:border-indigo-500 transition"
                placeholder="Ask something about your inventory..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
              />
              <button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="px-5 h-11 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold transition disabled:opacity-40">
                Send
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">Press Enter to send</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
      `}</style>
    </Layout>
  );
}

export default AIAssistant;
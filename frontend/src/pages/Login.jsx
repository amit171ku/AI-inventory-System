import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom"; // Link import add kiya
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck,
         BarChart2, Zap, RefreshCw, BellOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { loginUser } from "../services/productAPI";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

  .login-root {
    min-height: 100vh;
    display: flex;
    background: #060912;
    font-family: 'Inter', sans-serif;
    color: #e8eaf0;
    overflow: hidden;
  }

  /* LEFT */
  .lp {
    position: relative;
    width: 52%;
    display: none;
    flex-direction: column;
    justify-content: center;
    padding: 56px 60px;
    overflow: hidden;
    border-right: 0.5px solid rgba(255,255,255,0.06);
  }
  @media (min-width: 1024px) { .lp { display: flex; } }

  /* RIGHT */
  .rp {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
    padding: 32px 24px;
    background: #080b14;
    overflow: hidden;
  }

  /* FORM */
  .form-card {
    position: relative;
    width: 100%;
    max-width: 420px;
    background: rgba(255,255,255,0.03);
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 20px;
    padding: 44px 40px;
    backdrop-filter: blur(24px);
    z-index: 2;
  }

  /* INPUTS */
  .field-wrap { position: relative; }
  .field-icon {
    position: absolute; left: 14px; top: 50%;
    transform: translateY(-50%);
    color: rgba(148,163,184,0.4);
    pointer-events: none;
    display: flex; align-items: center;
  }
  .field-input {
    width: 100%;
    padding: 13px 14px 13px 42px;
    background: rgba(0,0,0,0.35);
    border: 0.5px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    color: #e8eaf0;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s, background 0.2s;
    box-sizing: border-box;
  }
  .field-input::placeholder { color: rgba(148,163,184,0.3); }
  .field-input:focus {
    border-color: rgba(14,165,233,0.5);
    background: rgba(14,165,233,0.04);
  }
  .field-input-pr { padding-right: 42px; }

  /* BUTTON */
  .btn-submit {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #0ea5e9, #6366f1);
    border: none;
    border-radius: 10px;
    color: #fff;
    font-family: 'Inter', sans-serif;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    letter-spacing: 0.02em;
    box-shadow: 0 0 28px rgba(14,165,233,0.25);
    transition: box-shadow 0.25s, opacity 0.2s;
  }
  .btn-submit:hover { box-shadow: 0 0 40px rgba(14,165,233,0.4); }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

  /* FEATURE ITEMS */
  .feature-item {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    padding: 18px 20px;
    background: rgba(255,255,255,0.025);
    border: 0.5px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    transition: border-color 0.2s, background 0.2s;
  }
  .feature-item:hover {
    background: rgba(255,255,255,0.04);
    border-color: rgba(14,165,233,0.15);
  }
  .feature-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }
`;

/* ── HEX CANVAS ── */
function HexCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let raf, t = 0;

    const hexPath = (cx, cy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        i === 0 ? ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a))
                : ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      }
      ctx.closePath();
    };

    const draw = () => {
      const W = canvas.width  = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      const size = 40, colW = size * Math.sqrt(3), rowH = size * 1.5;
      const cols = Math.ceil(W / colW) + 2, rows = Math.ceil(H / rowH) + 2;
      for (let row = -1; row < rows; row++) {
        for (let col = -1; col < cols; col++) {
          const cx = col * colW + (row % 2 === 0 ? 0 : colW / 2);
          const cy = row * rowH;
          const p = Math.sin(t * 0.7 + col * 0.4 + row * 0.6);
          hexPath(cx, cy, size - 2);
          ctx.strokeStyle = `rgba(14,165,233,${Math.max(0, 0.03 + p * 0.02)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
          if (p > 0.93) {
            hexPath(cx, cy, size - 2);
            ctx.fillStyle = `rgba(14,165,233,${(p - 0.93) * 0.5})`;
            ctx.fill();
          }
        }
      }
      // diagonal scan
      const sx = (W * 1.4 * ((t * 0.12) % 1)) - W * 0.2;
      const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
      sg.addColorStop(0, "rgba(14,165,233,0)");
      sg.addColorStop(0.5, "rgba(14,165,233,0.035)");
      sg.addColorStop(1, "rgba(14,165,233,0)");
      ctx.fillStyle = sg;
      ctx.fillRect(sx - 60, 0, 120, H);
      t += 0.016;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <canvas ref={ref} style={{
      position: "absolute", inset: 0,
      width: "100%", height: "100%",
      pointerEvents: "none",
    }} />
  );
}

/* ── FEATURES DATA ── */
const FEATURES = [
  {
    icon: <BarChart2 size={17} />,
    color: "#0ea5e9",
    bg: "rgba(14,165,233,0.1)",
    title: "AI Demand Forecasting",
    desc: "Predict stock needs weeks ahead using ML models trained on your sales history.",
  },
  {
    icon: <BellOff size={17} />,
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.1)",
    title: "Smart Low Stock Alerts",
    desc: "Get notified before a stockout happens — not after.",
  },
  {
    icon: <RefreshCw size={17} />,
    color: "#34d399",
    bg: "rgba(52,211,153,0.1)",
    title: "Automated Reorders",
    desc: "Auto-generate purchase orders based on forecast + supplier lead times.",
  },
  {
    icon: <Zap size={17} />,
    color: "#a78bfa",
    bg: "rgba(167,139,250,0.1)",
    title: "Real-time Analytics",
    desc: "Live dashboard with inventory health, turnover rates and category insights.",
  },
];

/* ── LEFT PANEL ── */
function LeftPanel() {
  return (
    <div className="lp">
      {/* radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 55% at 35% 50%, rgba(14,165,233,0.07) 0%, transparent 70%), radial-gradient(ellipse 45% 40% at 80% 85%, rgba(99,102,241,0.06) 0%, transparent 60%)",
      }} />
      <HexCanvas />

      <div style={{ position: "relative", zIndex: 2, maxWidth: "440px" }}>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          style={{ display: "flex", alignItems: "center", gap: "13px", marginBottom: "48px" }}
        >
          <div style={{
            width: "44px", height: "44px", borderRadius: "11px",
            background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(14,165,233,0.4)",
          }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 20h20M6 20V10M12 20V4M18 20v-8"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.3px", color: "#e8eaf0" }}>
              AI Inventory
            </div>
            <div style={{ fontSize: "10px", color: "rgba(14,165,233,0.6)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "1px" }}>
              System · v2.4
            </div>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.55 }}
          style={{ marginBottom: "40px" }}
        >
          <h1 style={{
            fontSize: "38px", fontWeight: 700, lineHeight: 1.12,
            letterSpacing: "-0.5px", color: "#f1f5f9", margin: 0,
          }}>
            Predict demand.<br />
            <span style={{
              background: "linear-gradient(90deg, #0ea5e9, #818cf8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              Never stock out.
            </span>
          </h1>
          <p style={{
            fontSize: "14px", color: "rgba(148,163,184,0.55)",
            marginTop: "14px", lineHeight: 1.7, maxWidth: "360px",
          }}>
            Everything your inventory team needs — forecasting, alerts, and automation — in one intelligent platform.
          </p>
        </motion.div>

        {/* Feature list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              className="feature-item"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.22 + i * 0.08, duration: 0.5 }}
            >
              <div className="feature-icon" style={{ background: f.bg }}>
                <span style={{ color: f.color }}>{f.icon}</span>
              </div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, color: "#e2e8f0", marginBottom: "3px" }}>
                  {f.title}
                </div>
                <div style={{ fontSize: "12px", color: "rgba(148,163,184,0.5)", lineHeight: 1.55 }}>
                  {f.desc}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </div>
  );
}

/* ── RIGHT PANEL ── */
function RightPanel() {
  const [email, setEmail]               = useState("");
  const [password, setPassword]         = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe]     = useState(false); // New state added
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [focused, setFocused]           = useState(null);
  
  const navigate = useNavigate();
  const { login } = useAuth();

  // Load remembered email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      // Remember Me logic
      if (rememberMe) {
        localStorage.setItem("rememberedEmail", email);
      } else {
        localStorage.removeItem("rememberedEmail");
      }

      const res = await loginUser({ email, password });
      login(res.data);
      navigate("/dashboard");
    } catch {
      setError("Invalid email or password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rp">
      {/* bg glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 70% 50% at 75% 30%, rgba(14,165,233,0.05) 0%, transparent 70%), radial-gradient(ellipse 40% 40% at 20% 85%, rgba(99,102,241,0.05) 0%, transparent 60%)",
      }} />

      {/* corner brackets */}
      <svg style={{ position:"absolute", top:0, right:0, pointerEvents:"none", opacity:0.12 }} width="140" height="140">
        <path d="M140 0 L140 60 M140 0 L80 0" stroke="#0ea5e9" strokeWidth="0.5" fill="none"/>
        <path d="M140 0 L140 30 M140 0 L110 0" stroke="#0ea5e9" strokeWidth="0.5" fill="none"/>
      </svg>
      <svg style={{ position:"absolute", bottom:0, left:0, pointerEvents:"none", opacity:0.12 }} width="140" height="140">
        <path d="M0 140 L0 80 M0 140 L60 140" stroke="#6366f1" strokeWidth="0.5" fill="none"/>
      </svg>

      <motion.div
        className="form-card"
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Heading */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "6px",
            background: "rgba(14,165,233,0.07)", border: "0.5px solid rgba(14,165,233,0.15)",
            borderRadius: "99px", padding: "3px 10px", marginBottom: "14px",
          }}>
            <ShieldCheck size={11} color="rgba(14,165,233,0.7)" />
            <span style={{ fontSize: "10px", color: "rgba(14,165,233,0.7)", fontFamily: "'Inter',sans-serif", letterSpacing: "0.07em" }}>
              SECURE ACCESS
            </span>
          </div>
          <h2 style={{ fontSize: "26px", fontWeight: 700, color: "#f1f5f9", letterSpacing: "-0.6px", margin: 0 }}>
            Welcome back
          </h2>
          <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.45)", marginTop: "6px" }}>
            Sign in to your inventory workspace
          </p>
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: "auto", marginBottom: "20px" }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              style={{
                background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)",
                color: "#f87171", borderRadius: "10px", padding: "11px 14px",
                fontSize: "13px", overflow: "hidden",
              }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

          {/* Email */}
          <div>
            <label style={{
              fontSize: "10px", color: "rgba(148,163,184,0.45)", letterSpacing: "0.07em",
              textTransform: "uppercase", marginBottom: "7px", display: "block",
              fontFamily: "'Inter',sans-serif",
            }}>
              Email address
            </label>
            <div className="field-wrap">
              <span className="field-icon"><Mail size={15} /></span>
              <input
                type="email" className="field-input" placeholder="you@company.com"
                value={email} onChange={e => setEmail(e.target.value)} required
                onFocus={() => setFocused("email")} onBlur={() => setFocused(null)}
                style={{ borderColor: focused === "email" ? "rgba(14,165,233,0.45)" : "rgba(255,255,255,0.08)" }}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "7px" }}>
              <label style={{
                fontSize: "10px", color: "rgba(148,163,184,0.45)", letterSpacing: "0.07em",
                textTransform: "uppercase", fontFamily: "'Inter',sans-serif",
              }}>
                Password
              </label>
              <Link to="/forgot-password" style={{ fontSize: "11px", color: "rgba(14,165,233,0.55)", textDecoration: "none" }}>
                Forgot?
              </Link>
            </div>
            <div className="field-wrap">
              <span className="field-icon"><Lock size={15} /></span>
              <input
                type={showPassword ? "text" : "password"} className="field-input field-input-pr"
                placeholder="••••••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                onFocus={() => setFocused("pass")} onBlur={() => setFocused(null)}
                style={{ borderColor: focused === "pass" ? "rgba(14,165,233,0.45)" : "rgba(255,255,255,0.08)" }}
              />
              <button
                type="button" onClick={() => setShowPassword(p => !p)}
                style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.4)", display: "flex", padding: 0 }}
              >
                {showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>

          {/* Remember Me Checkbox */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px", marginBottom: "4px" }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                accentColor: "#0ea5e9",
                width: "14px",
                height: "14px",
                cursor: "pointer",
              }}
            />
            <label htmlFor="rememberMe" style={{
              fontSize: "12px", 
              color: "rgba(148,163,184,0.6)", 
              cursor: "pointer",
              fontFamily: "'Inter',sans-serif"
            }}>
              Remember me
            </label>
          </div>

          <div style={{ height: "2px" }} />

          {/* Submit */}
          <motion.button
            type="submit" className="btn-submit" disabled={loading}
            whileHover={!loading ? { scale: 1.015 } : {}}
            whileTap={!loading ? { scale: 0.975 } : {}}
          >
            {loading ? (
              <>
                <svg style={{ animation: "spin 0.8s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Authenticating...
              </>
            ) : (
              <>Sign in to dashboard <ArrowRight size={16} /></>
            )}
          </motion.button>

        </form>

        {/* Trust bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center", gap: "20px",
          marginTop: "28px", paddingTop: "20px",
          borderTop: "0.5px solid rgba(255,255,255,0.05)",
        }}>
          {[{ icon: "🔒", text: "E2E encrypted" }, { icon: "⚡", text: "99.9% uptime" }].map(item => (
            <div key={item.text} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ fontSize: "11px" }}>{item.icon}</span>
              <span style={{ fontSize: "11px", color: "rgba(148,163,184,0.3)", fontFamily: "'Inter',sans-serif" }}>
                {item.text}
              </span>
            </div>
          ))}
        </div>

      </motion.div>
    </div>
  );
}

/* ── ROOT ── */
export default function Login() {
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="login-root">
        <LeftPanel />
        <RightPanel />
      </div>
    </>
  );
}
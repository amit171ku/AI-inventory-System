import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8001";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
  .fp-root { min-height:100vh;display:flex;align-items:center;justify-content:center;background:#060912;font-family:'Inter',sans-serif;padding:24px; }
  .fp-card { width:100%;max-width:420px;background:rgba(255,255,255,0.03);border:0.5px solid rgba(255,255,255,0.08);border-radius:20px;padding:44px 40px;backdrop-filter:blur(24px); }
  .fp-input { width:100%;padding:13px 14px 13px 42px;background:rgba(0,0,0,0.35);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;color:#e8eaf0;font-family:'Inter',sans-serif;font-size:14px;outline:none;transition:border-color 0.2s,background 0.2s;box-sizing:border-box; }
  .fp-input:focus { border-color:rgba(14,165,233,0.5);background:rgba(14,165,233,0.04); }
  .fp-input::placeholder { color:rgba(148,163,184,0.3); }
  .fp-btn { width:100%;padding:14px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border:none;border-radius:10px;color:#fff;font-family:'Inter',sans-serif;font-size:15px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 0 28px rgba(14,165,233,0.25);transition:opacity 0.2s; }
  .fp-btn:disabled { opacity:0.5;cursor:not-allowed; }
  .fp-label { font-size:10px;color:rgba(148,163,184,0.45);letter-spacing:0.07em;text-transform:uppercase;margin-bottom:7px;display:block; }
  .otp-box { width:48px;height:56px;text-align:center;font-size:22px;font-weight:600;background:rgba(0,0,0,0.35);border:0.5px solid rgba(255,255,255,0.08);border-radius:10px;color:#e8eaf0;font-family:monospace;outline:none;transition:border-color 0.2s; }
  .otp-box:focus { border-color:rgba(14,165,233,0.5);background:rgba(14,165,233,0.04); }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

const STEPS = ["Email", "OTP", "New Password"];

function StepDots({ current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "28px" }}>
      {STEPS.map((s, i) => (
        <div key={s} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <div style={{
            width: "24px", height: "24px", borderRadius: "50%",
            background: i < current ? "linear-gradient(135deg,#0ea5e9,#6366f1)"
              : i === current ? "rgba(14,165,233,0.15)" : "rgba(255,255,255,0.05)",
            border: i === current ? "0.5px solid rgba(14,165,233,0.4)" : "0.5px solid rgba(255,255,255,0.08)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "11px", fontWeight: 600,
            color: i <= current ? (i < current ? "#fff" : "rgba(14,165,233,0.9)") : "rgba(148,163,184,0.3)",
            transition: "all 0.3s",
          }}>
            {i < current ? "✓" : i + 1}
          </div>
          <span style={{ fontSize: "11px", color: i === current ? "rgba(14,165,233,0.7)" : "rgba(148,163,184,0.35)" }}>
            {s}
          </span>
          {i < STEPS.length - 1 && (
            <div style={{ width: "20px", height: "0.5px", background: i < current ? "#0ea5e9" : "rgba(255,255,255,0.08)", marginLeft: "2px" }} />
          )}
        </div>
      ))}
    </div>
  );
}

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step,        setStep]        = useState(0); // 0=email, 1=otp, 2=password, 3=done
  const [email,       setEmail]       = useState("");
  const [otp,         setOtp]         = useState(["", "", "", "", "", ""]);
  const [resetToken,  setResetToken]  = useState("");
  const [password,    setPassword]    = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [showPass,    setShowPass]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // ── Step 1: send OTP ──────────────────────────────────────────────────
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      setStep(1);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 2: verify OTP ────────────────────────────────────────────────
  const handleVerifyOTP = async () => {
    const code = otp.join("");
    if (code.length < 6) { setError("Enter the complete 6-digit code."); return; }
    setLoading(true); setError("");
    try {
      const res = await axios.post(`${API}/auth/verify-otp`, { email, otp: code });
      setResetToken(res.data.reset_token);
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.detail || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Step 3: reset password ────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true); setError("");
    try {
      await axios.post(`${API}/auth/reset-password`, { reset_token: resetToken, password });
      setStep(3);
    } catch (err) {
      setError(err?.response?.data?.detail || "Reset failed. Please start over.");
    } finally {
      setLoading(false);
    }
  };

  // OTP input handler
  const handleOtpChange = (val, idx) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    setError("");
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  };

  const handleOtpKey = (e, idx) => {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const strength = password.length >= 12 ? 4 : password.length >= 8 ? 3 : password.length >= 6 ? 2 : password.length > 0 ? 1 : 0;
  const strengthColor = ["", "#ef4444", "#f59e0b", "#22c55e", "#0ea5e9"][strength];

  return (
    <>
      <style>{css}</style>
      <div className="fp-root">
        <motion.div
          className="fp-card"
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          {step < 3 && <StepDots current={step} />}

          {error && (
            <div style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", color: "#f87171", borderRadius: "10px", padding: "10px 14px", fontSize: "13px", marginBottom: "16px" }}>
              {error}
            </div>
          )}

          <AnimatePresence mode="wait">

            {/* ── Step 0: Email ── */}
            {step === 0 && (
              <motion.div key="s0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>Forgot password?</h2>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.5)", marginBottom: "24px" }}>
                  Enter your email. We'll send a 6-digit OTP. All admins will be notified.
                </p>
                <form onSubmit={handleSendOTP} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div>
                    <label className="fp-label">Email address</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,0.4)", display: "flex" }}><Mail size={15} /></span>
                      <input type="email" className="fp-input" placeholder="you@company.com"
                        value={email} onChange={e => { setEmail(e.target.value); setError(""); }} required />
                    </div>
                  </div>
                  <button type="submit" className="fp-btn" disabled={loading}>
                    {loading ? "Sending OTP..." : <>Send OTP <ArrowRight size={16} /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 1: OTP ── */}
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>Check your email</h2>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.5)", marginBottom: "24px" }}>
                  Enter the 6-digit code sent to <strong style={{ color: "#e2e8f0" }}>{email}</strong>. Expires in 10 minutes.
                </p>

                <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginBottom: "24px" }}>
                  {otp.map((val, i) => (
                    <input
                      key={i} id={`otp-${i}`} className="otp-box"
                      value={val} maxLength={1} inputMode="numeric"
                      onChange={e => handleOtpChange(e.target.value, i)}
                      onKeyDown={e => handleOtpKey(e, i)}
                    />
                  ))}
                </div>

                <button className="fp-btn" disabled={loading || otp.join("").length < 6} onClick={handleVerifyOTP}>
                  {loading ? "Verifying..." : <>Verify OTP <ArrowRight size={16} /></>}
                </button>

                <button onClick={() => { setStep(0); setOtp(["","","","","",""]); setError(""); }}
                  style={{ width: "100%", marginTop: "12px", background: "none", border: "0.5px solid rgba(255,255,255,0.08)", borderRadius: "10px", padding: "10px", color: "rgba(148,163,184,0.5)", fontSize: "13px", cursor: "pointer" }}>
                  Resend OTP
                </button>
              </motion.div>
            )}

            {/* ── Step 2: New Password ── */}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 style={{ fontSize: "22px", fontWeight: 700, color: "#f1f5f9", margin: "0 0 6px" }}>Set new password</h2>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.5)", marginBottom: "24px" }}>
                  Choose a strong password for your account.
                </p>
                <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div>
                    <label className="fp-label">New password</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,0.4)", display: "flex" }}><Lock size={15} /></span>
                      <input type={showPass ? "text" : "password"} className="fp-input" placeholder="Min. 6 characters"
                        value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required
                        style={{ paddingRight: "42px" }}
                      />
                      <button type="button" onClick={() => setShowPass(p => !p)}
                        style={{ position: "absolute", right: "13px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.4)", display: "flex", padding: 0 }}>
                        {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                    {strength > 0 && (
                      <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                        {[1,2,3,4].map(i => (
                          <div key={i} style={{ flex: 1, height: "3px", borderRadius: "99px", background: i <= strength ? strengthColor : "rgba(255,255,255,0.1)", transition: "background 0.2s" }} />
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="fp-label">Confirm password</label>
                    <div style={{ position: "relative" }}>
                      <span style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "rgba(148,163,184,0.4)", display: "flex" }}><Lock size={15} /></span>
                      <input type="password" className="fp-input" placeholder="Repeat new password"
                        value={confirm} onChange={e => { setConfirm(e.target.value); setError(""); }} required />
                    </div>
                  </div>
                  <div style={{ height: "4px" }} />
                  <button type="submit" className="fp-btn" disabled={loading}>
                    {loading ? "Resetting..." : <>Reset Password <ArrowRight size={16} /></>}
                  </button>
                </form>
              </motion.div>
            )}

            {/* ── Step 3: Done ── */}
            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "48px", marginBottom: "16px" }}>✅</div>
                <h3 style={{ fontSize: "20px", fontWeight: 600, color: "#f1f5f9", margin: "0 0 8px" }}>Password reset!</h3>
                <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.5)", marginBottom: "24px" }}>
                  Your password has been changed. Redirecting to login...
                </p>
                <button onClick={() => navigate("/login")} className="fp-btn">
                  Go to Login <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

          </AnimatePresence>

          {step < 3 && (
            <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "rgba(148,163,184,0.35)" }}>
              Remember it? <Link to="/login" style={{ color: "rgba(14,165,233,0.6)", textDecoration: "none" }}>Back to login</Link>
            </p>
          )}

        </motion.div>
      </div>
    </>
  );
}
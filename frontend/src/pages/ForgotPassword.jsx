import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, ArrowRight, ArrowLeft, KeyRound } from "lucide-react";

// Note: Ensure you import or create these API functions in your services
// import { requestPasswordReset, resetPassword } from "../services/productAPI";

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  .auth-root { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: #060912; font-family: 'Inter', sans-serif; color: #e8eaf0; overflow: hidden; position: relative; }
  .form-card { position: relative; width: 100%; max-width: 420px; background: rgba(255,255,255,0.03); border: 0.5px solid rgba(255,255,255,0.08); border-radius: 20px; padding: 44px 40px; backdrop-filter: blur(24px); z-index: 2; }
  .field-wrap { position: relative; }
  .field-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(148,163,184,0.4); pointer-events: none; display: flex; align-items: center; }
  .field-input { width: 100%; padding: 13px 14px 13px 42px; background: rgba(0,0,0,0.35); border: 0.5px solid rgba(255,255,255,0.08); border-radius: 10px; color: #e8eaf0; font-family: 'Inter', sans-serif; font-size: 14px; outline: none; transition: border-color 0.2s, background 0.2s; box-sizing: border-box; }
  .field-input::placeholder { color: rgba(148,163,184,0.3); }
  .field-input:focus { border-color: rgba(14,165,233,0.5); background: rgba(14,165,233,0.04); }
  .btn-submit { width: 100%; padding: 14px; background: linear-gradient(135deg, #0ea5e9, #6366f1); border: none; border-radius: 10px; color: #fff; font-family: 'Inter', sans-serif; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; letter-spacing: 0.02em; box-shadow: 0 0 28px rgba(14,165,233,0.25); transition: box-shadow 0.25s, opacity 0.2s; }
  .btn-submit:hover { box-shadow: 0 0 40px rgba(14,165,233,0.4); }
  .btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1 = Email, 2 = OTP & New Password
  
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSendResetLink = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      // API Call: await requestPasswordReset({ email });
      // Dummy delay
      await new Promise(r => setTimeout(r, 1000));
      
      setSuccess("If that email exists, an OTP has been sent to it.");
      setStep(2); // Move to OTP step
    } catch {
      setError("Failed to process request. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true); setError(""); setSuccess("");
    try {
      // API Call: await resetPassword({ email, reset_token: otp, new_password: newPassword });
      // Dummy delay
      await new Promise(r => setTimeout(r, 1000));
      
      setSuccess("Password reset successfully! Redirecting...");
      setTimeout(() => navigate("/login"), 2000); // Redirect to login
    } catch {
      setError("Invalid OTP or connection error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div className="auth-root">
        
        {/* Background glow effects */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(ellipse 70% 50% at 50% 50%, rgba(14,165,233,0.06) 0%, transparent 70%)" }} />

        <motion.div
          className="form-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div style={{ marginBottom: "28px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "14px", background: "rgba(14,165,233,0.1)", border: "0.5px solid rgba(14,165,233,0.2)", marginBottom: "16px" }}>
              <KeyRound size={22} color="#0ea5e9" />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#f1f5f9", margin: 0 }}>
              {step === 1 ? "Forgot Password?" : "Reset Password"}
            </h2>
            <p style={{ fontSize: "13px", color: "rgba(148,163,184,0.6)", marginTop: "8px" }}>
              {step === 1 
                ? "Enter your email to receive a secure reset code." 
                : "Enter the code we sent and your new password."}
            </p>
          </div>

          {/* Messages */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ background: "rgba(239,68,68,0.08)", border: "0.5px solid rgba(239,68,68,0.2)", color: "#f87171", borderRadius: "10px", padding: "10px", fontSize: "12px", marginBottom: "16px", textAlign: "center" }}>
                {error}
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ background: "rgba(34,197,94,0.08)", border: "0.5px solid rgba(34,197,94,0.2)", color: "#4ade80", borderRadius: "10px", padding: "10px", fontSize: "12px", marginBottom: "16px", textAlign: "center" }}>
                {success}
              </motion.div>
            )}
          </AnimatePresence>

          {/* STEP 1: Email Form */}
          {step === 1 ? (
            <motion.form 
              onSubmit={handleSendResetLink} 
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>Email address</label>
                <div className="field-wrap">
                  <span className="field-icon"><Mail size={15} /></span>
                  <input type="email" className="field-input" placeholder="you@company.com" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: "8px" }}>
                {loading ? "Sending..." : "Send Reset Link"}
              </button>
            </motion.form>

          ) : (

          /* STEP 2: OTP & New Password Form */
            <motion.form 
              onSubmit={handleResetPassword} 
              initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: "16px" }}
            >
              <div>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>6-Digit OTP</label>
                <div className="field-wrap">
                  <input type="text" className="field-input" placeholder="123456" style={{ paddingLeft: "14px", letterSpacing: "2px", fontWeight: "bold" }} value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: "10px", color: "rgba(148,163,184,0.5)", textTransform: "uppercase", marginBottom: "6px", display: "block" }}>New Password</label>
                <div className="field-wrap">
                  <span className="field-icon"><Lock size={15} /></span>
                  <input type="password" className="field-input" placeholder="••••••••••••" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
              </div>

              <button type="submit" className="btn-submit" disabled={loading} style={{ marginTop: "8px" }}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </motion.form>
          )}

          {/* Back to Login Link */}
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Link to="/login" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "13px", color: "rgba(148,163,184,0.7)", textDecoration: "none", transition: "color 0.2s" }} onMouseEnter={e => e.currentTarget.style.color = "#0ea5e9"} onMouseLeave={e => e.currentTarget.style.color = "rgba(148,163,184,0.7)"}>
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </div>

        </motion.div>
      </div>
    </>
  );
}
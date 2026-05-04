import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);

  const [form, setForm] = useState({
    user_Phone: "",
    otp: "",
    new_Pin: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  // 🔵 STEP 1: SEND OTP
  const sendOtp = async () => {
    try {
      const res = await fetch("http://localhost:3000/user/forgot_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputdata: {
            user_Phone: form.user_Phone
          }
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        toast.success("OTP sent successfully");
        setStep(2);
      } else {
        toast.error(data.msg || "Failed to send OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  // 🔵 STEP 2: VERIFY OTP + STORE RESET TOKEN
  const verifyOtp = async () => {
    try {
      const res = await fetch("http://localhost:3000/user/verify_otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputdata: {
            user_Phone: form.user_Phone,
            otp: form.otp
          }
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        toast.success("OTP verified");

        // 🔥 IMPORTANT: store EXACT backend key
        const resetToken =
          data?.data?.reset_token || data?.data?.reset_Token;

        if (!resetToken) {
          toast.error("Reset token not received from backend");
          return;
        }

        localStorage.setItem("reset_token", resetToken);

        setStep(3);
      } else {
        toast.error(data.msg || "Invalid OTP");
      }
    } catch (err) {
      console.error(err);
      toast.error("OTP verification failed");
    }
  };

  // 🔵 STEP 3: RESET PASSWORD (FIXED)
  const resetPassword = async () => {
    try {
      const resetToken = localStorage.getItem("reset_token");

      if (!resetToken) {
        toast.error("Reset token missing. Please try again.");
        return;
      }

      const res = await fetch("http://localhost:3000/user/reset_password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inputdata: {
            user_Phone: form.user_Phone,
            new_Pin: form.new_Pin,
            reset_token: resetToken   // ✅ EXACT backend key
          }
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        toast.success("Password reset successful 🎉");

        localStorage.removeItem("reset_token");

        navigate("/");
      } else {
        toast.error(data.msg || "Reset failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div style={styles.container}>
      <Toaster />

      <div style={styles.card}>
        <h2>Forgot Password</h2>

        {/* STEP 1 */}
        {step === 1 && (
          <>
            <input
              name="user_Phone"
              placeholder="Enter Phone"
              onChange={handleChange}
              style={styles.input}
            />
            <button onClick={sendOtp} style={styles.button}>
              Send OTP
            </button>
          </>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <>
            <input
              name="otp"
              placeholder="Enter OTP"
              onChange={handleChange}
              style={styles.input}
            />
            <button onClick={verifyOtp} style={styles.button}>
              Verify OTP
            </button>
          </>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <>
            <input
              name="new_Pin"
              type="password"
              placeholder="New PIN"
              onChange={handleChange}
              style={styles.input}
            />
            <button onClick={resetPassword} style={styles.button}>
              Reset Password
            </button>
          </>
        )}

        <p onClick={() => navigate("/")} style={styles.link}>
          Back to Login
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#667eea"
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    width: "320px"
  },
  input: {
    width: "100%",
    padding: "10px",
    marginTop: "10px"
  },
  button: {
    width: "100%",
    padding: "10px",
    marginTop: "15px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },
  link: {
    color: "blue",
    cursor: "pointer",
    marginTop: "10px",
    textAlign: "center"
  }
};

export default ForgotPassword;
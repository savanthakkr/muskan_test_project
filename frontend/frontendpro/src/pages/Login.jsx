import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    user_Phone: "",
    user_Pin: ""
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));

    setErrors((prev) => ({
      ...prev,
      [e.target.name]: ""
    }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.user_Phone) newErrors.user_Phone = "Phone is required";
    if (!form.user_Pin) newErrors.user_Pin = "PIN is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/user/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputdata: form })
      });

      const data = await res.json();
      console.log("FULL RESPONSE 👉", data);

      if (data.status === "success") {
        const token = data?.data?.token;
        const user_Id = data?.data?.user_Id; // ✅ FIX ADDED

        if (!token || !user_Id) {
          toast.error("Token or User ID not received");
          return;
        }

        localStorage.setItem("token", token);
        localStorage.setItem("user_Id", user_Id); // ✅ IMPORTANT FIX

        toast.success("Login Successful 🎉");
        navigate("/home");
      } else {
        toast.error(data.msg || "Login failed");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <Toaster position="top-right" />

      <div style={styles.card}>
        <h2>Login</h2>

        <input
          name="user_Phone"
          placeholder="Phone"
          onChange={handleChange}
          style={styles.input}
        />
        {errors.user_Phone && (
          <p style={styles.error}>{errors.user_Phone}</p>
        )}

        <input
          name="user_Pin"
          type="password"
          placeholder="PIN"
          onChange={handleChange}
          style={styles.input}
        />
        {errors.user_Pin && (
          <p style={styles.error}>{errors.user_Pin}</p>
        )}

        <button
          onClick={handleLogin}
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p>
          Don't have account?{" "}
          <span
            style={styles.link}
            onClick={() => navigate("/register")}
          >
            Register
          </span>
        </p>

        <p style={{ marginTop: "10px", textAlign: "right", fontSize: "13px" }}>
          <span
            style={{ color: "#667eea", cursor: "pointer", fontWeight: "500" }}
            onClick={() => navigate("/forgot-password")}
          >
            Forgot Password?
          </span>
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
    width: "300px"
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
  error: {
    color: "red",
    fontSize: "12px"
  },
  link: {
    color: "blue",
    cursor: "pointer"
  }
};

export default Login;
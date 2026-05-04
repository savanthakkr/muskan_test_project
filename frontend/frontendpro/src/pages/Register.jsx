import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    user_Name: "",
    user_Phone: "",
    user_Pin: ""
  });

  const [errors, setErrors] = useState({});


  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });

    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    let newErrors = {};

    if (!form.user_Name) {
      newErrors.user_Name = "Name is required";
    }

    if (!form.user_Phone) {
      newErrors.user_Phone = "Phone is required";
    }

    if (!form.user_Pin) {
      newErrors.user_Pin = "PIN is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;

    try {
      const res = await fetch("http://localhost:3000/user/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ inputdata: form })
      });

      const data = await res.json();

      if (data.status === "success") {
        localStorage.setItem("token", data.data.token);
        toast.success("Registered Successfully 🎉");

        // 👉 after register go to home
        setTimeout(() => {
          navigate("/home");
        }, 1000);

      } else {
        toast.error(data.msg);
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>
        <Toaster position="top-right" />

        {/* NAME */}
        <input
          style={styles.input}
          type="text"
          name="user_Name"
          placeholder="Full Name"
          onChange={handleChange}
        />
        {errors.user_Name && <p style={styles.error}>{errors.user_Name}</p>}

        {/* PHONE */}
        <input
          style={styles.input}
          type="text"
          name="user_Phone"
          placeholder="Phone Number"
          onChange={handleChange}
        />
        {errors.user_Phone && <p style={styles.error}>{errors.user_Phone}</p>}

        {/* PIN */}
        <input
          style={styles.input}
          type="password"
          name="user_Pin"
          placeholder="PIN"
          onChange={handleChange}
        />
        {errors.user_Pin && <p style={styles.error}>{errors.user_Pin}</p>}

        <button style={styles.button} onClick={handleRegister}>
          Register
        </button>

        {/* ✅ FIXED LOGIN CLICK */}
        <p style={styles.footer}>
          Already have an account?{" "}
          <span
            style={styles.link}
            onClick={() => navigate("/")}
          >
            Login
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
    background: "linear-gradient(135deg, #667eea, #764ba2)"
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "12px",
    width: "320px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
    textAlign: "center"
  },
  title: {
    marginBottom: "20px"
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "15px",
    borderRadius: "6px",
    border: "1px solid #ddd",
    outline: "none"
  },
  error: {
    color: "red",
    fontSize: "12px",
    marginTop: "-10px",
    marginBottom: "10px",
    textAlign: "left"
  },
  button: {
    width: "100%",
    padding: "10px",
    background: "#667eea",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold"
  },
  footer: {
    marginTop: "15px",
    fontSize: "14px"
  },
  link: {
    color: "#667eea",
    cursor: "pointer",
    fontWeight: "bold",
    textDecoration: "underline"
  }
};

export default Register;
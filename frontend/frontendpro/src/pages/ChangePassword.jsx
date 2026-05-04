import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

function ChangePassword() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    old_Pin: "",
    new_Pin: ""
  });

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleChangePassword = async () => {
    try {
      const user_Id = localStorage.getItem("user_Id"); 
      // ⚠️ make sure you store user_Id during login

      if (!user_Id) {
        toast.error("User not found. Please login again.");
        return;
      }

      const res = await fetch("http://localhost:3000/user/change_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputdata: {
            user_Id: Number(user_Id),
            old_Pin: form.old_Pin,
            new_Pin: form.new_Pin
          }
        })
      });

      const data = await res.json();

      if (data.status === "success") {
        toast.success("Password changed successfully 🎉");
        navigate("/home");
      } else {
        toast.error(data.msg || "Change password failed");
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
        <h2>Change Password</h2>

        <input
          name="old_Pin"
          type="password"
          placeholder="Old PIN"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="new_Pin"
          type="password"
          placeholder="New PIN"
          onChange={handleChange}
          style={styles.input}
        />

        <button onClick={handleChangePassword} style={styles.button}>
          Change Password
        </button>

        <p style={styles.link} onClick={() => navigate("/home")}>
          Back to Home
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

export default ChangePassword;
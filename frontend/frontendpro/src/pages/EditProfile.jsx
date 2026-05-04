import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

function EditProfile() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    mobile: ""
  });

  const [loading, setLoading] = useState(false);

  const user_Id = localStorage.getItem("user_Id");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const handleUpdate = async () => {
    if (!user_Id) {
      toast.error("User not found. Please login again.");
      navigate("/");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/user/edit_profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          inputdata: {
            user_Id,
            ...form
          }
        })
      });

      const data = await res.json();
      console.log("EDIT PROFILE RESPONSE 👉", data);

      if (data.status === "success") {
        toast.success("Profile updated successfully 🎉");
        navigate("/home");
      } else {
        toast.error(data.msg || "Update failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2>Edit Profile</h2>

        <input
          name="first_name"
          placeholder="First Name"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="last_name"
          placeholder="Last Name"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
          style={styles.input}
        />

        <input
          name="mobile"
          placeholder="Mobile"
          onChange={handleChange}
          style={styles.input}
        />

        <button
          onClick={handleUpdate}
          style={styles.button}
          disabled={loading}
        >
          {loading ? "Updating..." : "Update Profile"}
        </button>
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
  }
};

export default EditProfile;
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");

    if (!token) {
      navigate("/");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_Id");
    navigate("/");
  };

  return (
    <div style={styles.container}>
      <h1>Welcome 🎉</h1>
      <p>You are logged in</p>

      {/* Logout Button */}
      <button onClick={handleLogout} style={styles.logoutButton}>
        Logout
      </button>

      {/* Change Password Button */}
      <button
        onClick={() => navigate("/change-password")}
        style={styles.changeButton}
      >
        Change Password
      </button>
      <button onClick={() => navigate("/edit-profile")}>
  Edit Profile
</button>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px"
  },

  logoutButton: {
    padding: "10px 20px",
    background: "red",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  },

  changeButton: {
    padding: "10px 20px",
    background: "blue",
    color: "#fff",
    border: "none",
    cursor: "pointer"
  }
};

export default Home;
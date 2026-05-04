import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import ForgotPassword from "./pages/ForgotPassword";
import ChangePassword from "./pages/ChangePassword";
import EditProfile from "./pages/EditProfile";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <>
      {/* ✅ GLOBAL TOASTER (VERY IMPORTANT) */}
      <Toaster position="top-right" />

      <BrowserRouter>
        <Routes>

          {/* 🔓 Public Routes */}
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/change-password" element={<ChangePassword />} />
          <Route path="/edit-profile" element={<EditProfile />} />

          {/* 🔐 Protected Routes */}
          <Route
            path="/home"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
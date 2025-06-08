// App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";
import { getDatabase, ref, get } from "firebase/database";

import AttendanceDashboard from "./pages/AttendanceDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./Login";
import RoleSelectSignup from "./pages/RoleSelectSignup";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [role, setRole] = useState(null);

  const auth = getAuth();
  const db = getDatabase();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      console.log("🟡 Auth Changed: ", currentUser?.uid);

      if (currentUser) {
        try {
          // ⚠️ Adjust this path based on your Firebase structure
          const roleRef = ref(db, `users/${currentUser.uid}/role`);
          const snapshot = await get(roleRef);

          console.log("🟢 Firebase snapshot exists:", snapshot.exists());
          console.log("🟢 Role from Firebase:", snapshot.val());

          if (snapshot.exists()) {
            setRole(snapshot.val());
          } else {
            setRole(null);
          }
        } catch (err) {
          console.error("🔴 Error fetching role:", err);
          setRole(null);
        }
      } else {
        setRole(null);
      }

      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  // 🕒 Show while checking auth
  if (checkingAuth) {
    return <div className="text-center mt-10">Checking authentication...</div>;
  }

  // 🕒 Show while fetching role after login
  if (user && role === null) {
    return <div className="text-center mt-10">Loading user role...</div>;
  }

  return (
    <Routes>
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />}
      />
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <RoleSelectSignup />}
      />

      {/* Main Dashboard route redirects based on role */}
      <Route
        path="/dashboard"
        element={
          user ? (
            role === "admin" ? (
              <AdminDashboard />
            ) : role === "teacher" ? (
              <TeacherDashboard />
            ) : role === "student" ? (
              <StudentDashboard />
            ) : (
              <div>Role not recognized.</div>
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* Explicit dashboard routes */}
      <Route
        path="/admin-dashboard"
        element={user && role === "admin" ? <AdminDashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/teacher-dashboard"
        element={user && role === "teacher" ? <TeacherDashboard /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/student-dashboard"
        element={user && role === "student" ? <StudentDashboard /> : <Navigate to="/login" replace />}
      />

      {/* Catch-all route */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

// App.jsx
import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, getAuth } from "firebase/auth";

import AttendanceDashboard from "./pages/AttendanceDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./Login";
import RoleSelectSignup from "./pages/RoleSelectSignup";

import { getDatabase, ref, onValue } from "firebase/database";

function App() {
  const [user, setUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [role, setRole] = useState(null);
  const auth = getAuth();
  const db = getDatabase();

  // Listen for auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, [auth]);

  // Fetch role when user changes
  useEffect(() => {
    if (!user) {
      setRole(null);
      return;
    }
    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribeRole = onValue(
      userRef,
      (snapshot) => {
        const data = snapshot.val();
        setRole(data?.role || null);
      },
      { onlyOnce: true }
    );
    return () => unsubscribeRole();
  }, [user, db]);

  if (checkingAuth) {
    return <div className="text-center mt-10">Checking authentication...</div>;
  }

  // If logged in but no role found
  if (user && role === null) {
    return <div className="text-center mt-10">Loading user role...</div>;
  }

  return (
    <Routes>
      {/* Redirect root based on auth */}
      <Route
        path="/"
        element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
      />

      {/* Login */}
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" replace /> : <Login onLogin={setUser} />}
      />

      {/* Signup */}
      <Route
        path="/signup"
        element={user ? <Navigate to="/dashboard" replace /> : <RoleSelectSignup />}
      />

      {/* Role-based dashboard */}
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

      {/* Protected explicit dashboard routes */}
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

      {/* Catch all other routes and redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

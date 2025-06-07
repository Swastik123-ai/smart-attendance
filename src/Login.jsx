import React, { useState } from "react";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getDatabase, ref, onValue } from "firebase/database";
import { app } from "./firebase";

export default function Login() {
  const auth = getAuth(app);
  const db = getDatabase(app);
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userRef = ref(db, `users/${user.uid}`);
      onValue(
        userRef,
        (snapshot) => {
          const userData = snapshot.val();

          if (!userData || !userData.role) {
            setError("User data missing. Please contact admin.");
            return;
          }

          if (userData.role === "student") {
            if (!userData.rollNo) {
              setError("Student roll number not found.");
              return;
            }

            // Pass uid also here for convenience
            navigate("/student-dashboard", {
              state: {
                student: {
                  uid: user.uid,
                  email: userData.email,
                  rollNo: userData.rollNo,
                },
              },
            });
          } else if (userData.role === "teacher") {
            navigate("/teacher-dashboard");
          } else if (userData.role === "admin") {
            navigate("/admin-dashboard");
          } else {
            setError("Unknown user role.");
          }
        },
        { onlyOnce: true }
      );
    } catch (err) {
      setError(err.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-full max-w-md"
      >
        <h2 className="text-2xl font-semibold mb-6 text-center">Login</h2>

        {error && <p className="text-red-600 mb-4 text-center">{error}</p>}

        <div className="mb-4">
          <label className="block mb-1 text-gray-700">Email</label>
          <input
            type="email"
            className="w-full border px-4 py-2 rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="mb-6">
          <label className="block mb-1 text-gray-700">Password</label>
          <input
            type="password"
            className="w-full border px-4 py-2 rounded"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Sign In
        </button>

        <p className="text-sm mt-4 text-center text-gray-600">
          Don't have an account?{" "}
          <a href="/signup" className="text-blue-600 hover:underline">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}

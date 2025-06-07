import { useState } from "react";
import { auth, app } from "../firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";

export default function RoleSelectSignup() {
  const [role, setRole] = useState(""); // "student" or "teacher"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [teacherCode, setTeacherCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();
  const db = getDatabase(app);

  const TEACHER_SECRET_CODE = "SPECIALTEACHER123";

  const handleSignUp = async (e) => {
    e.preventDefault();
    setFormError("");

    // Trim inputs once
    const emailTrimmed = email.trim();
    const passwordTrimmed = password.trim();
    const rollNoTrimmed = rollNo.trim();
    const teacherCodeTrimmed = teacherCode.trim();

    // Validation
    if (!role) {
      setFormError("Please select a role: Student or Teacher");
      return;
    }
    if (!emailTrimmed || !passwordTrimmed) {
      setFormError("Please enter email and password");
      return;
    }
    if (role === "student" && !rollNoTrimmed) {
      setFormError("Please enter your Roll Number");
      return;
    }
    if (role === "teacher" && teacherCodeTrimmed !== TEACHER_SECRET_CODE) {
      setFormError("Invalid teacher signup code.");
      return;
    }

    try {
      setLoading(true);
      const userCredential = await createUserWithEmailAndPassword(auth, emailTrimmed, passwordTrimmed);
      const uid = userCredential.user.uid;

      // Save user data with rollNo if student
      await set(ref(db, `users/${uid}`), {
        email: emailTrimmed,
        role,
        ...(role === "student" && { rollNo: rollNoTrimmed }),
      });

      alert(`Sign up successful as ${role}! Please log in.`);
      navigate("/login");
    } catch (err) {
      setFormError("Sign up failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 px-4">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>

        {!role ? (
          <div className="mb-6 text-center">
            <p className="mb-4 text-lg font-medium">Select your role:</p>
            <button
              onClick={() => setRole("student")}
              className="mr-4 px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              type="button"
            >
              Student
            </button>
            <button
              onClick={() => setRole("teacher")}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              type="button"
            >
              Teacher
            </button>
          </div>
        ) : (
          <form onSubmit={handleSignUp} noValidate>
            <p className="mb-5 text-center font-semibold text-lg">
              Signing up as: <span className="capitalize">{role}</span>
            </p>

            {formError && (
              <p className="mb-4 text-center text-red-600 font-medium">{formError}</p>
            )}

            <input
              type="email"
              placeholder="Email"
              className="w-full p-3 mb-4 border rounded focus:outline-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={loading}
            />

            <input
              type="password"
              placeholder="Password"
              className="w-full p-3 mb-4 border rounded focus:outline-blue-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
              disabled={loading}
            />

            {role === "student" && (
              <input
                type="text"
                placeholder="Enter Roll Number"
                className="w-full p-3 mb-4 border rounded focus:outline-blue-500"
                value={rollNo}
                onChange={(e) => setRollNo(e.target.value)}
                required
                disabled={loading}
              />
            )}

            {role === "teacher" && (
              <input
                type="text"
                placeholder="Enter teacher signup code"
                className="w-full p-3 mb-4 border rounded focus:outline-blue-500"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value)}
                required
                disabled={loading}
              />
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded text-white ${
                loading
                  ? "bg-purple-400 cursor-not-allowed"
                  : "bg-purple-600 hover:bg-purple-700 transition"
              }`}
            >
              {loading ? "Signing up..." : "Sign Up"}
            </button>

            <button
              type="button"
              onClick={() => setRole("")}
              disabled={loading}
              className="mt-4 w-full text-center text-sm text-gray-600 underline hover:text-gray-800 transition"
            >
              Change Role
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

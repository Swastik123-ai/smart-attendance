// src/pages/StudentDashboard.jsx
import React, { useEffect, useState, useMemo } from "react";
import { getDatabase, ref, get } from "firebase/database";
import { getAuth } from "firebase/auth";
import { app } from "../firebase";
import { useLocation, useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function StudentDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const db = getDatabase(app);
  const auth = getAuth(app);

  const [student, setStudent] = useState(location.state?.student || null);
  const [loadingStudent, setLoadingStudent] = useState(!student);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [error, setError] = useState("");
  const [filterMonth, setFilterMonth] = useState("all");
  const [darkMode, setDarkMode] = useState(false);
  const [showDeveloperInfo, setShowDeveloperInfo] = useState(false);

  // Dark mode toggle in <html> class for Tailwind 'dark'
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add("dark");
    else document.documentElement.classList.remove("dark");
  }, [darkMode]);

  const handleLogout = () => {
    auth.signOut();
    navigate("/login");
  };

  useEffect(() => {
    if (!student) {
      const fetchStudent = async () => {
        if (!auth.currentUser) {
          navigate("/login");
          return;
        }

        try {
          setLoadingStudent(true);
          const uid = auth.currentUser.uid;
          const userSnapshot = await get(ref(db, `users/${uid}`));

          if (userSnapshot.exists()) {
            const userData = userSnapshot.val();
            if (userData.role !== "student" || !userData.rollNo) {
              navigate("/login");
              return;
            }
            setStudent({ email: userData.email, rollNo: userData.rollNo, uid });
          } else {
            navigate("/login");
          }
        } catch {
          navigate("/login");
        } finally {
          setLoadingStudent(false);
        }
      };

      fetchStudent();
    }
  }, [student, auth.currentUser, db, navigate]);

  useEffect(() => {
    if (!student) return;

    const fetchAttendance = async () => {
      setLoadingAttendance(true);
      setError("");

      try {
        const snapshot = await get(ref(db, "attendance"));

        if (!snapshot.exists()) {
          setError("No attendance data found.");
          setAttendanceRecords([]);
          return;
        }

        const attendanceData = snapshot.val();
        const records = [];

        for (const date in attendanceData) {
          if (attendanceData[date][student.rollNo]) {
            records.push({ date, ...attendanceData[date][student.rollNo] });
          }
        }

        if (records.length === 0) {
          setError("No attendance records found for your roll number.");
        }

        setAttendanceRecords(records);
      } catch (err) {
        setError("Failed to load attendance: " + err.message);
      } finally {
        setLoadingAttendance(false);
      }
    };

    fetchAttendance();
  }, [student, db]);

  // Filter records by month
  const filteredRecords = useMemo(() => {
    if (filterMonth === "all") return attendanceRecords;
    return attendanceRecords.filter((rec) => rec.date.startsWith(filterMonth));
  }, [attendanceRecords, filterMonth]);

  // Calculate present, absent, total days
  const allDatesSet = useMemo(() => new Set(attendanceRecords.map((r) => r.date)), [attendanceRecords]);
  const totalDays = allDatesSet.size;
  const presentDays = filteredRecords.length;
  const absentDays = totalDays - presentDays;
  const attendancePercent = totalDays === 0 ? 0 : ((presentDays / totalDays) * 100).toFixed(1);

  // Weekly summary (week number -> present count)
  const weeklySummary = useMemo(() => {
    const weekMap = {};
    filteredRecords.forEach(({ date }) => {
      const dt = new Date(date);
      const oneJan = new Date(dt.getFullYear(), 0, 1);
      const weekNum = Math.ceil(((dt - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
      weekMap[weekNum] = (weekMap[weekNum] || 0) + 1;
    });
    return weekMap;
  }, [filteredRecords]);

  // Pie chart data - updated colors: Present = green, Absent = red
  const pieData = {
    labels: ["Present", "Absent"],
    datasets: [
      {
        data: [presentDays, absentDays],
        backgroundColor: ["#16A34A", "#EF4444"], // green and red
        hoverBackgroundColor: ["#15803D", "#B91C1C"],
        borderWidth: 1,
      },
    ],
  };

  // Bar chart data for weekly summary - updated color: Present Days = green
  const barData = {
    labels: Object.keys(weeklySummary).map((w) => `Week ${w}`),
    datasets: [
      {
        label: "Present Days",
        data: Object.values(weeklySummary),
        backgroundColor: "#16A34A", // green
        hoverBackgroundColor: "#15803D",
      },
    ],
  };

  // AI summary (simple motivational summary)
  const attendanceSummary = useMemo(() => {
    if (attendancePercent >= 90) {
      return "Excellent attendance! Keep up the great work!";
    } else if (attendancePercent >= 75) {
      return "Good attendance, but there's room for improvement.";
    } else if (attendancePercent > 0) {
      return "Attendance is low; try to attend more classes.";
    }
    return "No attendance records available.";
  }, [attendancePercent]);

  // Export Excel with extra summary rows
  const handleExportExcel = () => {
    const dataForExcel = filteredRecords.map(({ date, time, mode, name }) => ({
      Date: date,
      Time: time,
      Mode: mode,
      Name: name,
    }));

    // Add summary rows
    dataForExcel.push({});
    dataForExcel.push({ Date: "Summary" });
    dataForExcel.push({ Date: "Total Days", Time: totalDays });
    dataForExcel.push({ Date: "Present Days", Time: presentDays });
    dataForExcel.push({ Date: "Absent Days", Time: absentDays });
    dataForExcel.push({ Date: "Attendance %", Time: `${attendancePercent}%` });

    const worksheet = XLSX.utils.json_to_sheet(dataForExcel, { skipHeader: false });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(blob, "attendance_records.xlsx");
  };

  // Export PDF report with jsPDF + autoTable
  const handleExportPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(18);
    doc.text("Attendance Report", 14, 22);

    // Table data
    const tableColumn = ["Date", "Time", "Mode", "Name"];
    const tableRows = filteredRecords.map(({ date, time, mode, name }) => [date, time, mode, name]);

    autoTable(doc, {
      startY: 30,
      head: [tableColumn],
      body: tableRows,
      styles: { fontSize: 9 },
    });

    doc.text(`Total Days: ${totalDays}`, 14, doc.lastAutoTable.finalY + 10);
    doc.text(`Present Days: ${presentDays}`, 14, doc.lastAutoTable.finalY + 18);
    doc.text(`Absent Days: ${absentDays}`, 14, doc.lastAutoTable.finalY + 26);
    doc.text(`Attendance %: ${attendancePercent}%`, 14, doc.lastAutoTable.finalY + 34);

    doc.save("attendance_report.pdf");
  };

  return (
    <div className={`min-h-screen bg-bgLight dark:bg-bgDark text-textPrimaryLight dark:text-textPrimaryDark font-sans`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-10 border-b border-borderLight dark:border-borderDark pb-4">
          <h1 className="text-3xl font-semibold">Student Dashboard</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded bg-accentLight text-white hover:bg-accentDark transition"
            >
              {darkMode ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={() => setShowDeveloperInfo(true)}
              className="px-4 py-2 rounded border border-accentLight text-accentLight hover:bg-accentLight hover:text-white transition"
            >
              Developer
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded border border-accentLight text-accentLight hover:bg-accentLight hover:text-white transition"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Student info */}
        <section className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-cardLight dark:bg-cardDark p-6 rounded-lg shadow border border-borderLight dark:border-borderDark">
            <h2 className="text-xl font-medium mb-4">Student Info</h2>
            <p><span className="font-semibold">Email:</span> {student?.email || "-"}</p>
            <p><span className="font-semibold">Roll Number:</span> {student?.rollNo || "-"}</p>
          </div>

          {/* Attendance Summary */}
          <div className="bg-cardLight dark:bg-cardDark p-6 rounded-lg shadow border border-borderLight dark:border-borderDark flex flex-col justify-between">
            <h2 className="text-xl font-medium mb-4">Attendance Summary</h2>
            <p className="text-lg mb-2">
              <span className="font-semibold">Total Days:</span> {totalDays}
            </p>
            <p className="text-lg mb-2">
              <span className="font-semibold">Present Days:</span> {presentDays}
            </p>
            <p className="text-lg mb-2">
              <span className="font-semibold">Absent Days:</span> {absentDays}
            </p>
            <p className="text-lg mb-4">
              <span className="font-semibold">Attendance %:</span> {attendancePercent}%
            </p>
            <p className="italic text-accentLight dark:text-accentDark">{attendanceSummary}</p>
          </div>

          {/* Filter & export controls */}
          <div className="bg-cardLight dark:bg-cardDark p-6 rounded-lg shadow border border-borderLight dark:border-borderDark flex flex-col space-y-4">
            <h2 className="text-xl font-medium mb-4">Controls</h2>

            <select
              className="border border-borderLight dark:border-borderDark rounded p-2"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {Array.from(
                new Set(attendanceRecords.map((rec) => rec.date.slice(0, 7)))
              ).map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2 rounded bg-accentLight text-white hover:bg-accentDark transition"
            >
              Export Excel
            </button>

            <button
              onClick={handleExportPDF}
              className="px-4 py-2 rounded bg-accentLight text-white hover:bg-accentDark transition"
            >
              Export PDF
            </button>
          </div>
        </section>

        {/* Attendance Table */}
        <section className="overflow-x-auto mb-10 bg-cardLight dark:bg-cardDark rounded-lg shadow border border-borderLight dark:border-borderDark p-4">
          {loadingAttendance ? (
            <p>Loading attendance data...</p>
          ) : error ? (
            <p className="text-red-500">{error}</p>
          ) : filteredRecords.length === 0 ? (
            <p>No attendance records found for the selected month.</p>
          ) : (
            <table className="min-w-full border-collapse text-center">
              <thead>
                <tr className="bg-accentLight text-white">
                  <th className="border border-accentDark px-4 py-2">Date</th>
                  <th className="border border-accentDark px-4 py-2">Time</th>
                  <th className="border border-accentDark px-4 py-2">Mode</th>
                  <th className="border border-accentDark px-4 py-2">Name</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((rec, idx) => (
                  <tr
                    key={idx}
                    className="border border-borderLight dark:border-borderDark hover:bg-accentLight hover:text-white transition"
                  >
                    <td className="border px-4 py-2">{rec.date}</td>
                    <td className="border px-4 py-2">{rec.time}</td>
                    <td className="border px-4 py-2">{rec.mode}</td>
                    <td className="border px-4 py-2">{rec.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Charts */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-cardLight dark:bg-cardDark p-6 rounded-lg shadow border border-borderLight dark:border-borderDark flex flex-col items-center">
            <h2 className="text-xl font-medium mb-4 text-center">Attendance Breakdown</h2>
            <div style={{ width: 250, height: 250 }}>
              <Pie
                id="attendancePie"
                data={pieData}
                options={{
                  responsive: true,
                  animation: { duration: 800 },
                  plugins: {
                    tooltip: { enabled: true },
                    legend: { position: "bottom" },
                  },
                }}
              />
            </div>
          </div>

          <div className="bg-cardLight dark:bg-cardDark p-6 rounded-lg shadow border border-borderLight dark:border-borderDark flex flex-col items-center">
            <h2 className="text-xl font-medium mb-4 text-center">Weekly Attendance Summary</h2>
            <div style={{ width: "100%", maxWidth: 400, height: 250 }}>
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  animation: { duration: 800 },
                  plugins: {
                    tooltip: { enabled: true },
                    legend: { display: false },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { stepSize: 1 },
                    },
                  },
                }}
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-20 p-6 text-center bg-footerLight dark:bg-footerDark text-textSecondaryLight dark:text-textSecondaryDark rounded-lg shadow">
          © {new Date().getFullYear()} Smart Attendance System — Built with ❤️ by Swastik Bankar
        </footer>

        {/* Developer Info Modal */}
        {showDeveloperInfo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
              <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mb-4">About Developer</h2>
              
              <div className="space-y-3">
                <p>
                  <span className="font-semibold">Name:</span> Swastik Walmik Bankar
                </p>
                <p>
                  <span className="font-semibold">College:</span> CSMSS College of Engineering
                </p>
                <p>
                  <span className="font-semibold">Course:</span> B.Tech in AI & DS (Artificial Intelligence and Data Science)
                </p>
                <p>
                  <span className="font-semibold">Contact:</span> bankarswastik@gmail.com
                </p>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDeveloperInfo(false)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
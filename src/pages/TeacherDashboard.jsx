import React, { useEffect, useState, useMemo } from "react";
import { getDatabase, ref, onValue, set, get } from "firebase/database";
import { app, auth } from "../firebase";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import StudentStatsModal from "./StudentStatsModal";
import * as XLSX from "xlsx";

const TeacherDashboard = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [loading, setLoading] = useState(true);
  const [showInfo, setShowInfo] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("darkMode") === "true" || false
  );
  const [dateRange, setDateRange] = useState({ from: "", to: "" });
  const [showAddAttendanceModal, setShowAddAttendanceModal] = useState(false);
  const [showBulkEntryModal, setShowBulkEntryModal] = useState(false);
  const [studentList, setStudentList] = useState([]);
  const [manualAttendance, setManualAttendance] = useState({
    uid: "",
    name: "",
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    reason: ""
  });
  const [bulkAttendance, setBulkAttendance] = useState([]);
  const [bulkEntryDate, setBulkEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkEntryTime, setBulkEntryTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  const [bulkEntryReason, setBulkEntryReason] = useState("");

  const navigate = useNavigate();
  const db = getDatabase(app);

  useEffect(() => {
    const attendanceRef = ref(db, "attendance");
    const unsubscribe = onValue(attendanceRef, (snapshot) => {
      const data = snapshot.val();
      const formattedData = [];

      if (data) {
        Object.entries(data).forEach(([date, entries]) => {
          if (entries) {
            Object.entries(entries).forEach(([uid, details]) => {
              formattedData.push({
                date,
                uid,
                name: details.name || "N/A",
                time: details.time || "N/A",
                mode: details.mode || "N/A",
                reason: details.reason || "N/A"
              });
            });
          }
        });
      }

      setAttendanceData(formattedData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [db]);

  // Fetch student list for autocomplete
  useEffect(() => {
    const fetchStudents = async () => {
      const dbRef = ref(db, "students");
      const snapshot = await get(dbRef);
      if (snapshot.exists()) {
        const students = Object.entries(snapshot.val()).map(([uid, student]) => ({
          uid,
          name: student.name || "N/A"
        }));
        setStudentList(students);
      }
    };
    fetchStudents();
  }, [db]);

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem("darkMode", darkMode);
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      alert("Logout failed: " + err.message);
    }
  };

  // Handle manual attendance submission with duplicate check
  const handleAddManualAttendance = async () => {
    if (!manualAttendance.uid || !manualAttendance.name || !manualAttendance.date) {
      alert("Please fill all required fields");
      return;
    }

    // Check for duplicate entry
    const dateRef = ref(db, `attendance/${manualAttendance.date}/${manualAttendance.uid}`);
    const snapshot = await get(dateRef);
    if (snapshot.exists()) {
      if (!confirm("This student already has attendance for this date. Overwrite?")) {
        return;
      }
    }

    try {
      await set(dateRef, {
        name: manualAttendance.name,
        time: manualAttendance.time,
        mode: "Manual Entry",
        reason: manualAttendance.reason || "Not specified",
        timestamp: new Date().toISOString()
      });

      alert("Attendance added successfully!");
      setShowAddAttendanceModal(false);
      resetManualAttendanceForm();
    } catch (error) {
      console.error("Error adding manual attendance:", error);
      alert("Failed to add attendance. Please try again.");
    }
  };

  // Handle bulk attendance submission
  const handleBulkAttendance = async () => {
    if (bulkAttendance.length === 0) {
      alert("Please add at least one student");
      return;
    }

    try {
      const updates = {};
      bulkAttendance.forEach(student => {
        updates[`attendance/${bulkEntryDate}/${student.uid}`] = {
          name: student.name,
          time: bulkEntryTime,
          mode: "Manual Entry",
          reason: bulkEntryReason || "Bulk entry",
          timestamp: new Date().toISOString()
        };
      });

      await set(ref(db), updates, { merge: true });
      alert(`${bulkAttendance.length} attendance records added successfully!`);
      setShowBulkEntryModal(false);
      setBulkAttendance([]);
    } catch (error) {
      console.error("Error adding bulk attendance:", error);
      alert("Failed to add bulk attendance. Please try again.");
    }
  };

  // Add student to bulk entry list
  const addToBulkList = (student) => {
    if (!bulkAttendance.some(s => s.uid === student.uid)) {
      setBulkAttendance([...bulkAttendance, student]);
    }
  };

  // Remove student from bulk entry list
  const removeFromBulkList = (uid) => {
    setBulkAttendance(bulkAttendance.filter(student => student.uid !== uid));
  };

  // Reset manual attendance form
  const resetManualAttendanceForm = () => {
    setManualAttendance({
      uid: "",
      name: "",
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      reason: ""
    });
  };

  // Filter data based on search term and mode
  const filteredData = useMemo(() => {
    return attendanceData.filter((entry) => {
      const matchesSearch =
        entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.uid.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesFilter = filterMode === "all" || entry.mode === filterMode;

      // Filter by date range if set
      const fromDate = dateRange.from ? new Date(dateRange.from) : null;
      const toDate = dateRange.to ? new Date(dateRange.to) : null;
      const entryDate = new Date(entry.date);

      // Reset time part for comparison
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      entryDate.setHours(0, 0, 0, 0);

      const inDateRange =
        (!fromDate || entryDate >= fromDate) && 
        (!toDate || entryDate <= toDate);

      return matchesSearch && matchesFilter && inDateRange;
    });
  }, [attendanceData, searchTerm, filterMode, dateRange]);

  // Get unique modes for filter dropdown
  const uniqueModes = useMemo(() => {
    return [...new Set(attendanceData.map((item) => item.mode))];
  }, [attendanceData]);

  // Helper: Group attendance by student
  const attendanceByStudent = useMemo(() => {
    const map = {};
    attendanceData.forEach(({ uid, date, mode }) => {
      if (!map[uid]) map[uid] = [];
      map[uid].push({ date, mode });
    });
    for (const uid in map) {
      map[uid].sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return map;
  }, [attendanceData]);

  const calculateStreak = (records) => {
    if (!records || records.length === 0) return 0;
    
    const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    let streak = 0;
    let prevDate = null;

    for (let i = 0; i < sorted.length; i++) {
      const currentDate = new Date(sorted[i].date);
      if (sorted[i].mode !== "Fingerprint") break;

      if (i === 0) {
        streak = 1;
      } else {
        const diffDays = (prevDate - currentDate) / (1000 * 60 * 60 * 24);
        if (diffDays === 1) {
          streak++;
        } else if (diffDays > 1) {
          break;
        }
      }
      prevDate = currentDate;
    }
    return streak;
  };

  // Unique students from attendanceData (uid -> name)
  const uniqueStudents = useMemo(() => {
    const map = {};
    attendanceData.forEach(({ uid, name }) => {
      if (!map[uid]) map[uid] = name;
    });
    return map;
  }, [attendanceData]);

  // Calculate attendance % for each student in filtered date range
  const attendanceStats = useMemo(() => {
    const stats = {};
    Object.keys(uniqueStudents).forEach((uid) => {
      stats[uid] = { present: 0, total: 0 };
    });

    filteredData.forEach(({ uid, mode }) => {
      if (!stats[uid]) stats[uid] = { present: 0, total: 0 };
      if (mode === "Fingerprint" || mode === "Manual Entry") stats[uid].present++;
      stats[uid].total++;
    });

    Object.keys(stats).forEach((uid) => {
      stats[uid].percentage =
        stats[uid].total === 0 ? 0 : (stats[uid].present / stats[uid].total) * 100;
    });

    return stats;
  }, [filteredData, uniqueStudents]);

  // Download Excel report in the requested format
  const downloadExcelReport = () => {
    try {
      // Get all unique dates in the filtered range
      const allDates = [...new Set(filteredData.map(item => item.date))].sort((a, b) => new Date(a) - new Date(b));
      const totalDaysInRange = allDates.length;
      
      // Create a map of student attendance
      const studentAttendance = {};
      
      // Initialize all students with 0 counts
      Object.keys(uniqueStudents).forEach(uid => {
        studentAttendance[uid] = {
          name: uniqueStudents[uid],
          present: 0,
          attendanceByDate: {}
        };
        
        // Initialize all dates as absent
        allDates.forEach(date => {
          studentAttendance[uid].attendanceByDate[date] = 'A';
        });
      });
      
      // Update attendance based on actual data
      filteredData.forEach(({ uid, date, mode }) => {
        if (mode === "Fingerprint" || mode === "Manual Entry") {
          studentAttendance[uid].present++;
          studentAttendance[uid].attendanceByDate[date] = 'P';
        }
      });
      
      // Prepare the Excel data
      const excelData = [
        // Header row
        ['Roll No.', 'Name', ...allDates, 'Present Days', 'Absent Days', '% Attendance']
      ];
      
      // Add each student's data
      Object.keys(studentAttendance).forEach(uid => {
        const student = studentAttendance[uid];
        const absentDays = totalDaysInRange - student.present;
        const attendancePercentage = totalDaysInRange > 0 
          ? ((student.present / totalDaysInRange) * 100).toFixed(2)
          : 0;
        
        const row = [
          uid,
          student.name,
          ...allDates.map(date => student.attendanceByDate[date]),
          student.present,
          absentDays,
          `${attendancePercentage}%`
        ];
        
        excelData.push(row);
      });
      
      // Create worksheet with the data
      const worksheet = XLSX.utils.aoa_to_sheet(excelData);
      
      // Set column widths
      const colWidths = [
        { wch: 15 }, // Roll No.
        { wch: 20 }, // Name
        ...allDates.map(() => ({ wch: 8 })), // Date columns
        { wch: 12 }, // Present Days
        { wch: 12 }, // Absent Days
        { wch: 15 }  // % Attendance
      ];
      worksheet['!cols'] = colWidths;
      
      // Create workbook and add worksheet
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
      
      // Export to file
      XLSX.writeFile(workbook, "attendance_report.xlsx");
    } catch (error) {
      console.error("Error generating Excel report:", error);
      alert("Failed to generate Excel report. Please try again.");
    }
  };

  return (
    <div className={`${darkMode ? "bg-gray-900 text-gray-100" : "bg-gradient-to-r from-blue-50 to-indigo-100 text-gray-900"} min-h-screen font-sans`}>
      {/* Top bar */}
      <header
        className={`sticky top-0 z-50 flex items-center justify-between ${
          darkMode ? "bg-gray-800 shadow-lg" : "bg-white shadow-md"
        } px-6 py-4`}
      >
        <h1 className="text-2xl font-extrabold tracking-wide text-indigo-700 select-none">
          Teacher Attendance Dashboard
        </h1>

        <div className="flex items-center gap-3">
          {/* Add Manual Attendance Button */}
          <button
            onClick={() => setShowAddAttendanceModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-md shadow-md transition duration-200"
            title="Add Manual Attendance"
          >
            Add Attendance
          </button>

          {/* Bulk Entry Button */}
          <button
            onClick={() => setShowBulkEntryModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-4 py-2 rounded-md shadow-md transition duration-200"
            title="Bulk Entry"
          >
            Bulk Entry
          </button>

          {/* Dark Mode Toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle Dark Mode"
            title="Toggle Dark Mode"
            className={`px-3 py-1 rounded-md font-semibold transition ${
              darkMode
                ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                : "bg-gray-200 hover:bg-gray-300 text-gray-800"
            }`}
          >
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>

          {/* Developer Button */}
          <button
            onClick={() => setShowInfo(true)}
            aria-label="Info"
            title="About Developer"
            className={`font-semibold transition ${
              darkMode
                ? "text-indigo-300 hover:text-indigo-100"
                : "text-indigo-600 hover:text-indigo-800"
            }`}
          >
            Developer
          </button>

          {/* Logout Button */}
          <button
            onClick={logout}
            className="bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-semibold px-4 py-2 rounded-md shadow-md transition duration-200"
            title="Logout"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        {/* Controls */}
        <section className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <input
            type="text"
            placeholder="Search by name or UID..."
            className={`flex-grow md:flex-grow-0 md:w-96 p-3 rounded-lg border focus:outline-none transition duration-300 shadow-sm ${
              darkMode
                ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-indigo-400 focus:ring-indigo-400"
                : "border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-300"
            }`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            className={`w-40 p-3 rounded-lg border focus:outline-none transition duration-300 shadow-sm ${
              darkMode
                ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-indigo-400 focus:ring-indigo-400"
                : "border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-300"
            }`}
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
          >
            <option value="all">All Modes</option>
            {uniqueModes.map((mode) => (
              <option key={mode} value={mode}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </option>
            ))}
          </select>

          {/* Date range filter */}
          <div className="flex gap-2 items-center">
            <label className={`font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>From:</label>
            <input
              type="date"
              className={`p-2 rounded-md border focus:outline-none ${
                darkMode
                  ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-indigo-400 focus:ring-indigo-400"
                  : "border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-300"
              }`}
              value={dateRange.from}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, from: e.target.value }))
              }
            />
            <label className={`font-semibold ${darkMode ? "text-gray-300" : "text-gray-700"}`}>To:</label>
            <input
              type="date"
              className={`p-2 rounded-md border focus:outline-none ${
                darkMode
                  ? "border-gray-600 bg-gray-800 text-gray-100 focus:border-indigo-400 focus:ring-indigo-400"
                  : "border-gray-300 bg-white text-gray-900 focus:border-indigo-500 focus:ring-indigo-300"
              }`}
              value={dateRange.to}
              onChange={(e) =>
                setDateRange((prev) => ({ ...prev, to: e.target.value }))
              }
            />
          </div>

          {/* Download Excel Button */}
          <button
            onClick={downloadExcelReport}
            className="ml-auto bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-semibold px-5 py-3 rounded-md shadow-md transition duration-200"
            title="Download Excel Report"
            disabled={filteredData.length === 0}
          >
            Download Excel
          </button>
        </section>

        {/* Loading spinner */}
        {loading && (
          <div className="flex justify-center py-20">
            <svg
              className={`animate-spin h-12 w-12 ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              ></path>
            </svg>
          </div>
        )}

        {/* Data Table or Empty State */}
        {!loading && (
          <>
            {filteredData.length > 0 ? (
              <div
                className={`overflow-x-auto rounded-lg shadow-lg ${
                  darkMode ? "bg-gray-800" : "bg-white"
                }`}
              >
                <table className="min-w-full table-auto border-collapse">
                  <thead
                    className={`${
                      darkMode ? "bg-indigo-900 text-indigo-200" : "bg-indigo-100 text-indigo-700"
                    } uppercase text-sm font-semibold`}
                  >
                    <tr>
                      <th className="px-6 py-3 border border-indigo-200">Date</th>
                      <th className="px-6 py-3 border border-indigo-200">UID</th>
                      <th className="px-6 py-3 border border-indigo-200">Name</th>
                      <th className="px-6 py-3 border border-indigo-200">Streak 🔥</th>
                      <th className="px-6 py-3 border border-indigo-200">Time</th>
                      <th className="px-6 py-3 border border-indigo-200">Mode</th>
                      <th className="px-6 py-3 border border-indigo-200">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredData.map((entry, i) => {
                      const streak = attendanceByStudent[entry.uid]
                        ? calculateStreak(attendanceByStudent[entry.uid])
                        : 0;
                      return (
                        <tr
                          key={`${entry.uid}-${entry.date}-${i}`}
                          onClick={() => setSelectedStudent(entry)}
                          className={`cursor-pointer ${
                            darkMode
                              ? i % 2 === 0
                                ? "bg-gray-700 hover:bg-gray-600"
                                : "bg-gray-600 hover:bg-gray-500"
                              : i % 2 === 0
                              ? "bg-white hover:bg-indigo-50"
                              : "bg-indigo-50 hover:bg-indigo-100"
                          } transition`}
                        >
                          <td className="border border-indigo-200 px-6 py-3">{entry.date}</td>
                          <td className="border border-indigo-200 px-6 py-3 font-mono">{entry.uid}</td>
                          <td className="border border-indigo-200 px-6 py-3">{entry.name}</td>
                          <td className="border border-indigo-200 px-6 py-3 text-center font-semibold">
                            {streak > 0 ? `${streak} 🔥` : "0"}
                          </td>
                          <td className="border border-indigo-200 px-6 py-3">{entry.time}</td>
                          <td className="border border-indigo-200 px-6 py-3 capitalize">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              entry.mode === "Fingerprint" ? "bg-green-100 text-green-800" :
                              entry.mode === "Manual Entry" ? "bg-blue-100 text-blue-800" :
                              "bg-gray-100 text-gray-800"
                            }`}>
                              {entry.mode}
                            </span>
                          </td>
                          <td className="border border-indigo-200 px-6 py-3">{entry.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div
                className={`flex flex-col items-center justify-center text-center py-20 ${
                  darkMode ? "text-indigo-400" : "text-indigo-600"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-20 w-20 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 17L6 13.25m0 0L2.25 17M6 13.25v8.5m7.5-17.75L12 6m0 0l3.75-3.75M12 6v8.5"
                  />
                </svg>
                <p className="text-xl font-semibold">
                  {attendanceData.length === 0
                    ? "No attendance records available."
                    : "No records match your search or filter."}
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer
        className={`text-center text-sm py-6 select-none ${
          darkMode ? "text-indigo-400" : "text-indigo-600"
        }`}
      >
        © {new Date().getFullYear()} Smart Attendance System — Built with ❤️ by Swastik Bankar
      </footer>

      {/* Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setShowInfo(false)}
          />
          <div className={`relative w-11/12 max-w-md rounded-xl shadow-xl p-6 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}>
            <h2 className="text-indigo-600 text-2xl font-bold mb-3 select-none">About Developer</h2>

            <p className="mb-2">
              <strong>Name:</strong> Swastik Walmik Bankar
            </p>
            <p className="mb-2">
              <strong>College:</strong> CSMSS College of Engineering
            </p>
            <p className="mb-2">
              <strong>Course:</strong> B.Tech in AI & DS (Artificial Intelligence and Data Science)
            </p>
            <p className="mb-4">
              <strong>Contact:</strong> bankarswastik@gmail.com
            </p>

            <button
              onClick={() => setShowInfo(false)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-md transition duration-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Student Stats Modal */}
      {selectedStudent && (
        <StudentStatsModal
          student={selectedStudent}
          data={attendanceData.filter((entry) => entry.uid === selectedStudent.uid)}
          onClose={() => setSelectedStudent(null)}
          darkMode={darkMode}
        />
      )}

      {/* Add Manual Attendance Modal */}
      {showAddAttendanceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setShowAddAttendanceModal(false)}
          />
          <div className={`holographic-container relative w-11/12 max-w-md rounded-xl shadow-xl p-6 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}>
            <div className="holographic-card">
              <h2 className="text-indigo-600 text-2xl font-bold mb-4">Add Manual Attendance</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Student UID/Name</label>
                  <input
                    type="text"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    value={manualAttendance.uid}
                    onChange={(e) => {
                      const input = e.target.value;
                      setManualAttendance(prev => ({
                        ...prev,
                        uid: input,
                        name: studentList.find(s => s.uid === input)?.name || prev.name
                      }));
                    }}
                    placeholder="Start typing UID or name"
                    list="studentAutocomplete"
                  />
                  <datalist id="studentAutocomplete">
                    {studentList.map(student => (
                      <option key={student.uid} value={student.uid}>
                        {student.name}
                      </option>
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Student Name</label>
                  <input
                    type="text"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    value={manualAttendance.name}
                    onChange={(e) => {
                      const input = e.target.value;
                      setManualAttendance(prev => ({
                        ...prev,
                        name: input,
                        uid: studentList.find(s => s.name.toLowerCase() === input.toLowerCase())?.uid || prev.uid
                      }));
                    }}
                    placeholder="Or type name to autocomplete"
                    list="nameAutocomplete"
                  />
                  <datalist id="nameAutocomplete">
                    {studentList.map(student => (
                      <option key={student.uid} value={student.name}>
                        {student.uid}
                      </option>
                    ))}
                  </datalist>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <input
                    type="date"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    value={manualAttendance.date}
                    onChange={(e) => setManualAttendance({...manualAttendance, date: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Time</label>
                  <input
                    type="time"
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    value={manualAttendance.time}
                    onChange={(e) => setManualAttendance({...manualAttendance, time: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                  <select
                    className={`w-full p-2 rounded-md border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                    }`}
                    value={manualAttendance.reason}
                    onChange={(e) => setManualAttendance({...manualAttendance, reason: e.target.value})}
                  >
                    <option value="">Select reason</option>
                    <option value="Fingerprint issue">Fingerprint issue</option>
                    <option value="Late arrival">Late arrival</option>
                    <option value="Makeup class">Makeup class</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddAttendanceModal(false)}
                  className="px-4 py-2 rounded-md bg-gray-300 hover:bg-gray-400 text-gray-800 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddManualAttendance}
                  className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition"
                >
                  Save Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Entry Modal */}
      {showBulkEntryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div 
            className="fixed inset-0 bg-black bg-opacity-30"
            onClick={() => setShowBulkEntryModal(false)}
          />
          <div className={`holographic-container relative w-11/12 max-w-2xl rounded-xl shadow-xl p-6 ${
            darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
          }`}>
            <div className="holographic-card">
              <h2 className="text-indigo-600 text-2xl font-bold mb-4">Bulk Attendance Entry</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Date</label>
                      <input
                        type="date"
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                        }`}
                        value={bulkEntryDate}
                        onChange={(e) => setBulkEntryDate(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Time</label>
                      <input
                        type="time"
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                        }`}
                        value={bulkEntryTime}
                        onChange={(e) => setBulkEntryTime(e.target.value)}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Reason (Optional)</label>
                      <select
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                        }`}
                        value={bulkEntryReason}
                        onChange={(e) => setBulkEntryReason(e.target.value)}
                      >
                        <option value="">Select reason</option>
                        <option value="Class makeup">Class makeup</option>
                        <option value="Field trip">Field trip</option>
                        <option value="Special event">Special event</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-1">Add Students</label>
                      <input
                        type="text"
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-300"
                        }`}
                        placeholder="Search by UID or name"
                        list="bulkStudentAutocomplete"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.target.value) {
                            const student = studentList.find(s => 
                              s.uid === e.target.value || 
                              s.name.toLowerCase() === e.target.value.toLowerCase()
                            );
                            if (student) {
                              addToBulkList(student);
                              e.target.value = '';
                            }
                          }
                        }}
                      />
                      <datalist id="bulkStudentAutocomplete">
                        {studentList.map(student => (
                          <option key={student.uid} value={student.uid}>
                            {student.name}
                          </option>
                        ))}
                      </datalist>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleBulkAttendance}
                    className="mt-4 w-full py-2 rounded-md bg-green-600 hover:bg-green-700 text-white transition"
                    disabled={bulkAttendance.length === 0}
                  >
                    Submit {bulkAttendance.length} Records
                  </button>
                </div>
                
                <div>
                  <h3 className="font-medium mb-2">Selected Students ({bulkAttendance.length})</h3>
                  <div className={`border rounded-md max-h-64 overflow-y-auto ${
                    darkMode ? "border-gray-600" : "border-gray-300"
                  }`}>
                    {bulkAttendance.length > 0 ? (
                      <ul className="divide-y">
                        {bulkAttendance.map(student => (
                          <li key={student.uid} className="p-2 flex justify-between items-center">
                            <span>
                              <span className="font-mono text-sm">{student.uid}</span>
                              <br />
                              {student.name}
                            </span>
                            <button
                              onClick={() => removeFromBulkList(student.uid)}
                              className="text-red-500 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="p-4 text-center text-gray-500">No students added yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
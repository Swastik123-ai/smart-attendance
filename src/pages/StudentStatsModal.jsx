import React, { useEffect, useState, useRef } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from "recharts";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import Papa from "papaparse";

const COLORS = ["#00C49F", "#FF8042"];

const StudentStatsModal = ({ student, data, onClose }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [stats, setStats] = useState(null);
  const chartRef = useRef();

  const handleGenerate = () => {
    if (!fromDate || !toDate) {
      alert("Please select both From and To dates.");
      return;
    }

    const filtered = data.filter((entry) => {
      return (
        entry.uid === student.uid &&
        entry.date >= fromDate &&
        entry.date <= toDate
      );
    });

    const presentCount = filtered.length;
    const totalDays = countDaysBetween(fromDate, toDate);
    const absentCount = Math.max(totalDays - presentCount, 0);

    setStats({
      present: presentCount,
      absent: absentCount,
      fromDate,
      toDate,
    });
  };

  const countDaysBetween = (from, to) => {
    const fromTime = new Date(from).getTime();
    const toTime = new Date(to).getTime();
    const diffDays = Math.floor((toTime - fromTime) / (1000 * 3600 * 24)) + 1;
    return diffDays;
  };

  const handleDownloadPNG = async () => {
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement("a");
    link.download = `${student.name}_report.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  const handleDownloadPDF = async () => {
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF();
    pdf.text(`${student.name} Attendance Report`, 10, 10);
    pdf.addImage(imgData, "PNG", 10, 20, 180, 100);
    pdf.save(`${student.name}_attendance_report.pdf`);
  };

  const handleDownloadCSV = () => {
    if (!stats) return;
    const csv = Papa.unparse([
      ["Name", "UID", "From", "To", "Present", "Absent"],
      [
        student.name,
        student.uid,
        stats.fromDate,
        stats.toDate,
        stats.present,
        stats.absent,
      ],
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${student.name}_attendance_report.csv`;
    link.click();
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black bg-opacity-40 z-40"
        onClick={onClose}
      />
      <div className="fixed top-1/2 left-1/2 w-11/12 max-w-3xl p-6 bg-white rounded-xl shadow-2xl z-50 transform -translate-x-1/2 -translate-y-1/2 overflow-y-auto max-h-[95vh]">
        <h2 className="text-xl font-bold mb-4 text-indigo-700">
          Attendance Report - {student.name}
        </h2>

        <div className="flex gap-4 mb-4 flex-wrap">
          <input
            type="date"
            className="p-2 border rounded w-40"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
          />
          <input
            type="date"
            className="p-2 border rounded w-40"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Generate
          </button>
        </div>

        {stats && (
          <>
            <div ref={chartRef} className="bg-gray-50 p-4 rounded-xl">
              <p className="mb-2 font-semibold text-gray-700">
                Period: {stats.fromDate} to {stats.toDate}
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Present", value: stats.present },
                        { name: "Absent", value: stats.absent },
                      ]}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label
                    >
                      <Cell fill={COLORS[0]} />
                      <Cell fill={COLORS[1]} />
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                {/* Bar Chart */}
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={[
                      { label: "Present", count: stats.present },
                      { label: "Absent", count: stats.absent },
                    ]}
                  >
                    <XAxis dataKey="label" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8884d8" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="mt-6 flex gap-4 flex-wrap">
              <button
                onClick={handleDownloadPNG}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Download JPG
              </button>
              <button
                onClick={handleDownloadPDF}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
              >
                Download PDF
              </button>
              <button
                onClick={handleDownloadCSV}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
              >
                Download CSV
              </button>
            </div>
          </>
        )}

        <button
          onClick={onClose}
          className="mt-6 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </>
  );
};

export default StudentStatsModal;

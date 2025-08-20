
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from "recharts";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRUqd0ID1RjjzM8kHhwgLVrDehem_5SH2pMbosokY11qekM0FR_EnodiB1cxF10dDBX50P5HkaK_rTE/pub?output=csv";

export default function CLOAnalysis() {
  // Month/year filter state
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [rows, setRows] = useState([]);
  const [associates, setAssociates] = useState(["Everyone"]);
  const [selected, setSelected] = useState("Everyone");
  const [allWeeks, setAllWeeks] = useState([]);

  useEffect(() => {
    fetch(CSV_URL)
      .then(res => res.text())
      .then(csv => {
        const parsed = Papa.parse(csv, {
          header: true,
          skipEmptyLines: "greedy"
        });

        const cleaned = [];

        (parsed.data || []).forEach(r => {
          const assoc = (r["Associate"] || "").trim();
          const date = parseDateUS(r["Date"]);
          const errorTF = (r["Associate Error T/F"] || "").toString().trim().toLowerCase();
          const error = errorTF === "true" || errorTF === "yes" || errorTF === "1";
          if (!assoc || !date) return;

          const weekStart = getWeekStart(date);
          const weekLabel = formatUS(weekStart);

          const rawTypes = (r["Error Type"] ?? "").trim();
          const errorTypes = rawTypes
            ? rawTypes.split(",").map(t => t.trim())
            : ["None"];

          errorTypes.forEach(type => {
            cleaned.push({
              associate: assoc,
              date,
              weekDate: weekStart,
              week: weekLabel,
              error,
              errorType: type || "None"
            });
          });
        });

        const weeks = Array.from(new Set(cleaned.map(r => +r.weekDate)))
          .map(ms => new Date(ms))
          .sort((a, b) => a - b);
        const unique = Array.from(new Set(cleaned.map(r => r.associate)))
          .sort((a, b) => a.localeCompare(b));

        setRows(cleaned);
        setAssociates(["Everyone", ...unique]);
        setAllWeeks(weeks);
  // No need to set weekStartIdx for dropdown view
      });
  }, []);

  const filtered = selected === "Everyone"
    ? rows
    : rows.filter(r => r.associate === selected);

  // Weekly error rate
  const rateByWeek = new Map();
  for (const r of filtered) {
    const key = +r.weekDate;
    if (!rateByWeek.has(key)) rateByWeek.set(key, { week: r.week, weekDate: r.weekDate, errors: 0, total: 0 });
    const obj = rateByWeek.get(key);
    obj.total += 1;
    if (r.error) obj.errors += 1;
  }

  // Determine which weeks to show based on viewMode
  // Build year/month options from allWeeks
  const allMonths = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const weekYearMonth = allWeeks.map(w => ({
    year: w.getFullYear(),
    month: w.getMonth(),
    week: w
  }));
  const uniqueYears = Array.from(new Set(weekYearMonth.map(w => w.year))).sort((a, b) => b - a);
  const monthsInYear = selectedYear !== 'all'
    ? Array.from(new Set(weekYearMonth.filter(w => w.year === Number(selectedYear)).map(w => w.month))).sort((a, b) => a - b)
    : [];

  // Filter weeks by year/month
  let weekWindow = allWeeks;
  if (selectedYear !== 'all') {
    weekWindow = weekWindow.filter(w => w.getFullYear() === Number(selectedYear));
    if (selectedMonth !== 'all') {
      weekWindow = weekWindow.filter(w => w.getMonth() === Number(selectedMonth));
    }
  }

  const errorRateData = weekWindow.map(w => {
    const entry = rateByWeek.get(+w);
    return {
      week: formatUS(w),
      errorRate: entry ? Number(((entry.errors / entry.total) * 100).toFixed(1)) : 0
    };
  });

  // Weekly error types
  const typesByWeek = new Map();
  for (const r of filtered) {
    if (!r.error) continue;
    const key = +r.weekDate;
    if (!typesByWeek.has(key)) typesByWeek.set(key, { week: formatUS(r.weekDate), weekDate: r.weekDate });
    const obj = typesByWeek.get(key);
    obj[r.errorType] = (obj[r.errorType] || 0) + 1;
  }

  const errorTypeData = weekWindow.map(w => {
    const entry = typesByWeek.get(+w) || { week: formatUS(w), weekDate: w };
    return entry;
  });

  // Only 2 colors: Green for "DA" in name, Blue for others
  const errorTypeKeys = Array.from(
    new Set(errorTypeData.flatMap(o => Object.keys(o).filter(k => k !== "week" && k !== "weekDate")))
  );

  const errorTypeColors = {};
  errorTypeKeys.forEach(type => {
    if (type.toUpperCase().includes("DA")) {
      errorTypeColors[type] = "#4CAF50"; // green
    } else {
      errorTypeColors[type] = "#2196F3"; // blue
    }
  });

  // Custom tooltip for error types
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "white",
          border: "1px solid #ccc",
          padding: "8px",
          borderRadius: "8px",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          marginBottom: "20px"
        }}>
          <p><strong>{label}</strong></p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.fill, margin: 0 }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 mb-16 bg-white/80 rounded-2xl shadow-2xl p-8 md:p-12 backdrop-blur-lg">
      <div className="mb-6">
        <Link to="/" className="inline-block px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">← Back to Home</Link>
      </div>
      <h2 className="text-3xl font-extrabold text-blue-900 mb-6 text-center tracking-tight">CLO Analysis</h2>

  <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      {/* Year/Month dropdowns */}
      <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
        <label className="font-medium text-gray-700">Year:
          <select
            value={selectedYear}
            onChange={e => { setSelectedYear(e.target.value); setSelectedMonth('all'); }}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm"
          >
            <option value="all">All Time</option>
            {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </label>
        <label className="font-medium text-gray-700">Month:
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm"
            disabled={selectedYear === 'all'}
          >
            <option value="all">All</option>
            {monthsInYear.map(m => <option key={m} value={m}>{allMonths[m]}</option>)}
          </select>
        </label>
        <span className="text-gray-500 mt-1 text-sm">Showing weeks {weekWindow.length > 0 ? formatUS(weekWindow[0]) : ''} to {weekWindow.length > 0 ? formatUS(weekWindow[weekWindow.length-1]) : ''}</span>
      </div>
        <label className="font-medium text-gray-700 text-lg flex items-center gap-2">
          <span>Select Associate:</span>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm"
          >
            {associates.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {/* Weekly Error Rate */}
      <div className="mb-12 bg-blue-50 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Weekly Error Rate (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={errorRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" angle={-40} textAnchor="end" minTickGap={10} height={60} />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
            <Legend />
            <Bar dataKey="errorRate" name="Error Rate (%)" fill="#2196F3" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Weekly Error Types (stacked) */}
      {selected !== "Everyone" && (
        <div className="bg-green-50 rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-green-800 mb-4">Weekly Error Types</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={errorTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" angle={-40} textAnchor="end" minTickGap={10} height={60} />
              <YAxis />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
              <Legend />
              {errorTypeKeys.map(k => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="a"
                  fill={errorTypeColors[k]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function parseDateUS(s) {
  if (!s) return null;
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!m) return null;
    let [, mm, dd, yy] = m;
  mm = parseInt(mm, 10); dd = parseInt(dd, 10); yy = parseInt(yy, 10);
  if (yy < 100) yy += 2000;
  const d2 = new Date(yy, mm - 1, dd);
  return isNaN(d2) ? null : d2;
}

function getWeekStart(d) {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = copy.getDay();
  const diff = copy.getDate() - day + (day === 0 ? -6 : 1);
  copy.setDate(diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatUS(d) {
  return d.toLocaleDateString("en-US");
}

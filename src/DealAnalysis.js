import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid, ResponsiveContainer,
  LineChart, Line
} from "recharts";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTr9lEADK4NPO_ATOkFS0CCYdk64OkbnAyKTd_74KCYza-7zAEJlV1T4zlvOEMWaF_FqcsCzAcnljsz/pub?gid=0&single=true&output=csv";

export default function DealAnalysis() {
  // ...existing state and hooks...


  // ...state hooks...
  const [selectedYear, setSelectedYear] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState("all");
  const [allWeeks, setAllWeeks] = useState([]);
  const [rows, setRows] = useState({ cleaned: [], errorTypeRows: [] });
  const [associates, setAssociates] = useState(["Everyone"]);
  const [selected, setSelected] = useState("Everyone");
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("none"); // live, cached, none
  const [cachedTime, setCachedTime] = useState(null);

  // --- Weekly Average Time Taken Calculation ---
  function parseTimeTaken(val) {
    if (!val || typeof val !== 'string') return null;
    const parts = val.split(':');
    if (parts.length === 2) {
      const hours = parseInt(parts[0], 10);
      const mins = parseInt(parts[1], 10);
      if (!isNaN(hours) && !isNaN(mins)) return hours * 60 + mins;
    }
    return null;
  }

  // Group by week and compute average
  // Use filtered data for associate-specific chart, or all data for 'Everyone'
  const chartRows = selected === "Everyone"
    ? (rows.cleaned || [])
    : (rows.cleaned || []).filter(r => r.associate === selected);

  const weeklyTimeTakenMap = new Map();
  chartRows.forEach(r => {
    const min = parseTimeTaken(r.timeTaken);
    // Only include non-null, non-blank values
    if (min !== null && r.timeTaken && r.timeTaken.trim() !== "" && r.weekDate) {
      const key = +r.weekDate;
      if (!weeklyTimeTakenMap.has(key)) weeklyTimeTakenMap.set(key, { week: formatUS(r.weekDate), total: 0, count: 0 });
      const obj = weeklyTimeTakenMap.get(key);
      obj.total += min;
      obj.count += 1;
    }
  });
  const weeklyAvgTimeTakenData = Array.from(weeklyTimeTakenMap.entries())
    .map(([key, obj]) => ({ week: obj.week, avgMinutes: +(obj.total / obj.count).toFixed(2) }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));

  const allMonths = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("Network response not ok");
      const csvText = await res.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: "greedy" });

      const cleaned = [];
      const errorTypeRows = [];

      (parsed.data || []).forEach(r => {
        const assoc = (r["Associate"] || "").trim();
        const date = parseDateUS(r["Date"]);
        if (!assoc || !date) return;
        const weekStart = getWeekStart(date);
        const weekLabel = formatUS(weekStart);
        const errorTF = (r["Associate Error T/F"] || "").toString().trim().toLowerCase();
        const error = errorTF === "true" || errorTF === "yes" || errorTF === "1";
        const teamErrorTF = (r["Team Error T/F"] || "").toString().trim().toLowerCase();
        const avgTime = parseFloat(r["Average"] || r["Average Time"] || r["Avg"] || r["Avg Time"] || 0);
        cleaned.push({
          associate: assoc,
          date,
          weekDate: weekStart,
          week: weekLabel,
          error,
          teamErrorTF,
          averageTime: avgTime,
          timeTaken: r["Time Taken"]
        });

        const rawTypes = (r["Error Type"] ?? "").trim();
        const errorTypes = rawTypes ? rawTypes.split(",").map(t => t.trim()) : ["None"];
        errorTypes.forEach(type => {
          errorTypeRows.push({ associate: assoc, date, weekDate: weekStart, week: weekLabel, error, errorType: type || "None" });
        });
      });

      const weeks = Array.from(new Set(cleaned.map(r => +r.weekDate))).map(ms => new Date(ms)).sort((a, b) => a - b);
      const unique = Array.from(new Set(cleaned.map(r => r.associate))).sort((a, b) => a.localeCompare(b));

      setRows({ cleaned, errorTypeRows });
      setAssociates(["Everyone", ...unique]);
      setAllWeeks(weeks);

      localStorage.setItem("dealData", JSON.stringify({ cleaned, errorTypeRows, weeks, unique, timestamp: Date.now() }));
      setDataSource("live");
      setCachedTime(null);
    } catch (error) {
      console.error("Fetch failed, loading cached data:", error);
      const cached = localStorage.getItem("dealData");
      if (cached) {
        const { cleaned, errorTypeRows, weeks, unique, timestamp } = JSON.parse(cached);
        setRows({ cleaned, errorTypeRows });
        setAssociates(["Everyone", ...unique]);
        setAllWeeks(weeks);
        setDataSource("cached");
        setCachedTime(timestamp);
      } else {
        setRows({ cleaned: [], errorTypeRows: [] });
        setAllWeeks([]);
        setAssociates(["Everyone"]);
        setDataSource("none");
        setCachedTime(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Year/month options
  const weekYearMonth = allWeeks.map(w => ({ year: w.getFullYear(), month: w.getMonth(), week: w }));
  const uniqueYears = Array.from(new Set(weekYearMonth.map(w => w.year))).sort((a, b) => b - a);
  const monthsInYear = selectedYear !== 'all'
    ? Array.from(new Set(weekYearMonth.filter(w => w.year === Number(selectedYear)).map(w => w.month))).sort((a, b) => a - b)
    : [];

  // Filter weeks by year/month
  let weekWindow = allWeeks;
  if (selectedYear !== 'all') {
    weekWindow = weekWindow.filter(w => w.getFullYear() === Number(selectedYear));
    if (selectedMonth !== 'all') weekWindow = weekWindow.filter(w => w.getMonth() === Number(selectedMonth));
  }

  const filtered = selected === "Everyone" ? rows.cleaned || [] : (rows.cleaned || []).filter(r => r.associate === selected);

  // Weekly error rates
  const associateRateByWeek = new Map();
  const teamRateByWeek = new Map();
  filtered.forEach(r => {
    const key = +r.weekDate;
    if (!associateRateByWeek.has(key)) associateRateByWeek.set(key, { week: r.week, weekDate: r.weekDate, errors: 0, total: 0 });
    const a = associateRateByWeek.get(key); a.total += 1; if (r.error) a.errors += 1;

    if (!teamRateByWeek.has(key)) teamRateByWeek.set(key, { week: r.week, weekDate: r.weekDate, errors: 0, total: 0 });
    const t = teamRateByWeek.get(key); t.total += 1;
    const teamError = r.teamErrorTF === "true" || r.teamErrorTF === "yes" || r.teamErrorTF === "1";
    if (teamError) t.errors += 1;
  });

  const associateErrorRateData = weekWindow.map(w => {
    const entry = associateRateByWeek.get(+w);
    return { week: formatUS(w), errorRate: entry && entry.total > 0 ? Number(((entry.errors / entry.total) * 100).toFixed(2)) : 0, totalDeals: entry ? entry.total : 0 };
  });

  const teamErrorRateData = weekWindow.map(w => {
    const entry = teamRateByWeek.get(+w);
    return { week: formatUS(w), errorRate: entry && entry.total > 0 ? Number(((entry.errors / entry.total) * 100).toFixed(2)) : 0, totalDeals: entry ? entry.total : 0 };
  });

  const errorTypeFiltered = selected === "Everyone" ? (rows.errorTypeRows || []) : (rows.errorTypeRows || []).filter(r => r.associate === selected);

  const typesByWeek = new Map();
  errorTypeFiltered.forEach(r => {
    if (!r.error) return;
    const key = +r.weekDate;
    if (!typesByWeek.has(key)) typesByWeek.set(key, { week: formatUS(r.weekDate), weekDate: r.weekDate });
    const obj = typesByWeek.get(key);
    obj[r.errorType] = (obj[r.errorType] || 0) + 1;
  });

  const errorTypeData = weekWindow.map(w => typesByWeek.get(+w) || { week: formatUS(w), weekDate: w });
  const errorTypeKeys = Array.from(new Set(errorTypeData.flatMap(o => Object.keys(o).filter(k => k !== "week" && k !== "weekDate"))));

  // Color error types: if the type contains 'DA' anywhere (uppercase) → green, else → blue
    const errorTypeColors = {};
  errorTypeKeys.forEach(type => {
  if (type.includes("DA")) {
    errorTypeColors[type] = "#4CAF50"; // green
  } else {
    errorTypeColors[type] = "#2196F3"; // blue
  }
});

  const ErrorRateTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div style={{ background: "white", border: "1px solid #ccc", padding: "8px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", marginBottom: "20px" }}>
          <p><strong>{label}</strong></p>
          <p style={{ color: '#2196F3', margin: 0 }}>Error Rate: {data.errorRate}%</p>
          <p style={{ color: '#333', margin: 0 }}>Total Deals: {data.totalDeals}</p>
        </div>
      );
    }
    return null;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "white", border: "1px solid #ccc", padding: "8px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", marginBottom: "20px" }}>
          <p><strong>{label}</strong></p>
          {payload.map((entry, i) => <p key={i} style={{ color: entry.fill, margin: 0 }}>{entry.name}: {entry.value}</p>)}
        </div>
      );
    }
    return null;
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center mt-20 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xl font-semibold text-gray-700">Loading data...</p>
    </div>
  );

  if (dataSource === "none") return (
    <div className="flex flex-col items-center justify-center mt-20 space-y-4">
      <p className="text-2xl font-bold text-red-600">❌ No Data Available</p>
      <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">
        Retry
      </button>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto mt-10 mb-16 bg-white/80 rounded-2xl shadow-2xl p-8 md:p-12 backdrop-blur-lg">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/" className="inline-block px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">← Back to Home</Link>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">Refresh Data</button>
      </div>

      {dataSource === "live" && <p className="text-green-600 font-medium mb-4">✅ Live data</p>}
      {dataSource === "cached" && <p className="text-red-600 font-medium mb-4">⚠️ Live data unavailable. Showing last cached data (as of {cachedTime ? new Date(cachedTime).toLocaleString() : "unknown"}).</p>}

      <h2 className="text-3xl font-extrabold text-blue-900 mb-6 text-center tracking-tight">Deal Analysis</h2>

      {/* Year/Month/Associate selection */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
          <label className="font-medium text-gray-700">Year:
            <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedMonth('all'); }} className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm">
              <option value="all">All Time</option>
              {uniqueYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="font-medium text-gray-700">Month:
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm" disabled={selectedYear === 'all'}>
              <option value="all">All</option>
              {monthsInYear.map(m => <option key={m} value={m}>{allMonths[m]}</option>)}
            </select>
          </label>
        </div>
        <label className="font-medium text-gray-700 text-lg flex items-center gap-2">
          <span>Select Associate:</span>
          <select value={selected} onChange={e => setSelected(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm">
            {associates.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {/* Charts */}
      <div className="mb-12 bg-blue-50 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Associate Weekly Error Rate (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={associateErrorRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" />
            <YAxis domain={[0, 100]} />
            <Tooltip content={<ErrorRateTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
            <Legend />
            <Bar dataKey="errorRate" name="Error Rate (%)" fill="#2196F3" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {selected === "Everyone" && (
        <div className="mb-12 bg-purple-50 rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-purple-800 mb-4">Team Weekly Error Rate (%)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamErrorRateData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis domain={[0, 100]} />
              <Tooltip content={<ErrorRateTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
              <Legend />
              <Bar dataKey="errorRate" name="Error Rate (%)" fill="#9C27B0" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {selected !== "Everyone" && (
        <div className="bg-green-50 rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-green-800 mb-4">Weekly Error Types</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={errorTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
              <Legend />
              {errorTypeKeys.map(k => <Bar key={k} dataKey={k} stackId="a" fill={errorTypeColors[k]} />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Average Time Taken Chart */}
      {weeklyAvgTimeTakenData.length > 0 && (
        <div className="mt-8 mb-12 bg-yellow-50 rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-yellow-800 mb-4">Weekly Average Time Taken (minutes)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyAvgTimeTakenData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="avgMinutes" name="Avg Minutes" stroke="#FF9800" strokeWidth={2} />
            </LineChart>
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
  const m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
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
  copy.setDate(diff); copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatUS(d) {
  return d.toLocaleDateString("en-US");
}
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Papa from "papaparse";
import {
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid, ResponsiveContainer,
  LineChart, Line,
  ReferenceLine
} from "recharts";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTBykKoZHLLCvMVVbb1aFsRB_RdNBHmsB9qU-fuPo4KITf_ElwEXGla8OyKpd_9pyk9Me05NB0ZQC24/pub?gid=1740837312&single=true&output=csv";

export default function CLOAnalysis() {
  const [rows, setRows] = useState({ cleaned: [], errorTypeRows: [] });
  const [associates, setAssociates] = useState(["Everyone"]);
  const [selected, setSelected] = useState("Everyone");
  const [allWeeks, setAllWeeks] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState("live"); // live, cached, none
  const [cacheTime, setCacheTime] = useState(null);

  // Parse time taken from CLO column (column M), supports h:mm:ss or minutes as number
  function parseCLOTime(val) {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      // Try direct number first
      const num = Number(val);
      if (!isNaN(num)) return num;
      // Try h:mm:ss or mm:ss
      const parts = val.split(":").map(Number);
      if (parts.length === 3) {
        const [h, m, s] = parts;
        if ([h, m, s].every(n => !isNaN(n))) return h * 60 + m + s / 60;
      } else if (parts.length === 2) {
        const [m, s] = parts;
        if ([m, s].every(n => !isNaN(n))) return m + s / 60;
      }
    }
    return null;
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch(CSV_URL);
      if (!res.ok) throw new Error("Network response not ok");
      const csvText = await res.text();
      const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: "greedy" });

      const cleaned = [];
      const errorTypeRows = [];

      // Determine error type column (case-insensitive)
      let errorTypeKey = null;
      if (parsed.data && parsed.data.length > 0) {
        const keys = Object.keys(parsed.data[0]);
        errorTypeKey = keys.find(k => k.trim().toLowerCase() === "error type");
      }

      (parsed.data || []).forEach(r => {
        const assoc = (r["Associate"] || "").trim();
        const date = parseDateUS(r["Date"]);
        if (!assoc || !date) return;

        const weekStart = getWeekStart(date);
        const weekLabel = formatUS(weekStart);

        const errorTF = (r["Associate Error T/F"] || "").toString().trim().toLowerCase();
        const error = errorTF === "true" || errorTF === "yes" || errorTF === "1";

        const teamErrorTF = (r["Team Error T/F"] || "").toString().trim().toLowerCase();

        cleaned.push({
          associate: assoc,
          date,
          weekDate: weekStart,
          week: weekLabel,
          error,
          teamErrorTF,
          cloTime: r["Total CLO Completion Time (Mins)"],
          dealName: r["CLO"] || ""
        });

        // Handle error types
        let rawTypes = "";
        if (errorTypeKey) rawTypes = (r[errorTypeKey] ?? "").trim();
        let errorTypes;
        if (!rawTypes || rawTypes.toLowerCase() === 'none' || rawTypes === '') {
          errorTypes = ["None"];
        } else {
          errorTypes = rawTypes.split(",").map(t => t.trim() || "None");
        }
        errorTypes.forEach(type => {
          errorTypeRows.push({
            associate: assoc,
            date,
            weekDate: weekStart,
            week: weekLabel,
            error,
            errorType: type || "None"
          });
        });
      });

      const weeks = Array.from(new Set(cleaned.map(r => +r.weekDate))).map(ms => new Date(ms)).sort((a, b) => a - b);
      const unique = Array.from(new Set(cleaned.map(r => r.associate))).sort((a, b) => a.localeCompare(b));

      setRows({ cleaned, errorTypeRows });
      setAssociates(["Everyone", ...unique]);
      setAllWeeks(weeks);

      const timestamp = new Date().toISOString();
      localStorage.setItem("cloData", JSON.stringify({ rows: { cleaned, errorTypeRows }, timestamp }));
      setCacheTime(timestamp);
      setDataSource("live");
    } catch (err) {
      console.error("Fetch failed, using cached data if available:", err);
      const cached = localStorage.getItem("cloData");
      if (cached) {
        const { rows, timestamp } = JSON.parse(cached);
        setRows(rows || { cleaned: [], errorTypeRows: [] });
        setCacheTime(timestamp);
        setDataSource("cached");
      } else {
        setRows({ cleaned: [], errorTypeRows: [] });
        setDataSource("none");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Build filtered data
  const filtered = selected === "Everyone" ? rows.cleaned : rows.cleaned.filter(r => r.associate === selected);

  // --- Weekly Average CLO Time Taken ---
  let chartRows = filtered;
  if (selectedYear !== 'all') chartRows = chartRows.filter(r => r.date && r.date.getFullYear() === Number(selectedYear));
  if (selectedMonth !== 'all') chartRows = chartRows.filter(r => r.date && r.date.getMonth() === Number(selectedMonth));

  // Weekly average
  const weeklyCLOTimeMap = new Map();
  chartRows.forEach(r => {
    const min = parseCLOTime(r.cloTime);
    if (min !== null && r.cloTime && r.cloTime !== "" && r.weekDate) {
      const key = +r.weekDate;
      if (!weeklyCLOTimeMap.has(key)) weeklyCLOTimeMap.set(key, { week: formatUS(r.weekDate), total: 0, count: 0 });
      const obj = weeklyCLOTimeMap.get(key);
      obj.total += min;
      obj.count += 1;
    }
  });
  const weeklyAvgCLOTimeData = Array.from(weeklyCLOTimeMap.entries())
    .map(([key, obj]) => ({ week: obj.week, avgMinutes: +(obj.total / obj.count).toFixed(2) }))
    .sort((a, b) => new Date(a.week) - new Date(b.week));

  // Individual CLO updates (for line chart)
  const cloUpdates = chartRows
    .filter(r => r.cloTime && r.cloTime !== "" && parseCLOTime(r.cloTime) !== null && r.date)
    .map((r, i) => ({
      index: i,
      date: r.date,
      weekDate: r.weekDate,
      week: r.week,
      dateLabel: formatUS(r.date),
      minutes: parseCLOTime(r.cloTime),
      associate: r.associate,
      dealName: r.dealName || ""
    }))
    .sort((a, b) => a.date - b.date);

  // Find the first index for each week for x-axis ticks
  const weekStartIndices = [];
  let lastWeek = null;
  cloUpdates.forEach((d, i) => {
    if (!lastWeek || d.week !== lastWeek) {
      weekStartIndices.push({ index: d.index, week: d.week });
      lastWeek = d.week;
    }
  });
  const weekTickFormatter = idx => {
    const found = weekStartIndices.find(w => w.index === idx);
    return found ? found.week : '';
  };

  // Tooltip for individual updates
  const CLOUpdateTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload;
      return (
        <div style={{ background: "white", border: "1px solid #ccc", padding: "8px", borderRadius: "8px", boxShadow: "0 2px 6px rgba(0,0,0,0.15)", marginBottom: "20px", minWidth: 200 }}>
          <p style={{ margin: 0 }}><span style={{ fontWeight: 600 }}>Date:</span> {d.dateLabel}</p>
          <p style={{ margin: 0 }}><span style={{ fontWeight: 600 }}>Deal name:</span> {d.dealName}</p>
          <p style={{ margin: 0 }}><span style={{ fontWeight: 600 }}>Time taken:</span> {d.minutes} min</p>
        </div>
      );
    }
    return null;
  };

  // Weekly associate error rate
  const associateRateByWeek = new Map();
  filtered.forEach(r => {
    const key = +r.weekDate;
    if (!associateRateByWeek.has(key)) associateRateByWeek.set(key, { week: r.week, weekDate: r.weekDate, errors: 0, total: 0 });
    const obj = associateRateByWeek.get(key);
    obj.total += 1;
    if (r.error) obj.errors += 1;
  });

  // Weekly team error rate
  const teamRateByWeek = new Map();
  filtered.forEach(r => {
    const key = +r.weekDate;
    if (!teamRateByWeek.has(key)) teamRateByWeek.set(key, { week: r.week, weekDate: r.weekDate, errors: 0, total: 0 });
    const obj = teamRateByWeek.get(key);
    obj.total += 1;
    const teamError = r.teamErrorTF === "true" || r.teamErrorTF === "yes" || r.teamErrorTF === "1";
    if (teamError) obj.errors += 1;
  });

  // Build year/month options
  const allMonths = ['January', 'February', 'March', 'April', 'May', 'June','July', 'August', 'September', 'October', 'November', 'December'];
  const weekYearMonth = allWeeks.map(w => ({ year: w.getFullYear(), month: w.getMonth(), week: w }));
  const uniqueYears = Array.from(new Set(weekYearMonth.map(w => w.year))).sort((a,b)=>b-a);
  const monthsInYear = selectedYear !== 'all' ? Array.from(new Set(weekYearMonth.filter(w=>w.year===Number(selectedYear)).map(w=>w.month))).sort((a,b)=>a-b) : [];

  let weekWindow = allWeeks;
  if (selectedYear !== 'all') {
    weekWindow = weekWindow.filter(w => w.getFullYear() === Number(selectedYear));
    if (selectedMonth !== 'all') weekWindow = weekWindow.filter(w => w.getMonth() === Number(selectedMonth));
  }

  const associateErrorRateData = weekWindow.map(w => {
    const entry = associateRateByWeek.get(+w);
    return { week: formatUS(w), errorRate: entry && entry.total>0 ? Number(((entry.errors/entry.total)*100).toFixed(2)) : 0, totalDeals: entry ? entry.total : 0 };
  });

  const teamErrorRateData = weekWindow.map(w => {
    const entry = teamRateByWeek.get(+w);
    return { week: formatUS(w), errorRate: entry && entry.total>0 ? Number(((entry.errors/entry.total)*100).toFixed(2)) : 0, totalDeals: entry ? entry.total : 0 };
  });

  // Weekly error types
  const errorTypeFiltered = selected === "Everyone" ? rows.errorTypeRows : rows.errorTypeRows.filter(r => r.associate === selected);
  const typesByWeek = new Map();
  errorTypeFiltered.forEach(r => {
    if (!r.error) return;
    const key = +r.weekDate;
    if (!typesByWeek.has(key)) typesByWeek.set(key, { week: formatUS(r.weekDate), weekDate: r.weekDate });
    const obj = typesByWeek.get(key);
    obj[r.errorType] = (obj[r.errorType] || 0) + 1;
  });
  const errorTypeData = weekWindow.map(w => typesByWeek.get(+w) || { week: formatUS(w), weekDate: w });
  const errorTypeKeys = Array.from(new Set(errorTypeData.flatMap(o => Object.keys(o).filter(k => k!=="week" && k!=="weekDate"))));
  const errorTypeColors = {}; errorTypeKeys.forEach(t=>errorTypeColors[t]="#2196F3");

  const ErrorRateTooltip = ({active,payload,label}) => {
    if(active && payload && payload.length){
      const data = payload[0].payload;
      return <div style={{background:"white",border:"1px solid #ccc",padding:"8px",borderRadius:"8px",boxShadow:"0 2px 6px rgba(0,0,0,0.15)",marginBottom:"20px"}}>
        <p><strong>{label}</strong></p>
        <p style={{color:'#2196F3',margin:0}}>Error Rate: {data.errorRate}%</p>
        <p style={{color:'#333',margin:0}}>Total CLOs: {data.totalDeals}</p>
      </div>;
    }
    return null;
  };

  // Removed unused CustomTooltip to resolve eslint warning

  if(loading) return (
    <div className="flex flex-col items-center justify-center mt-20 space-y-4">
      <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-xl font-semibold text-gray-700">Loading CLO data...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto mt-10 mb-16 bg-white/80 rounded-2xl shadow-2xl p-8 md:p-12 backdrop-blur-lg">
      <div className="mb-6 flex justify-between items-center">
        <Link to="/" className="inline-block px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition">← Back to Home</Link>
        <button onClick={fetchData} className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 transition">Refresh Data</button>
      </div>

      {dataSource==="live" && <p className="text-green-600 font-medium mb-4">✅ Live data</p>}
      {dataSource==="cached" && cacheTime && <p className="text-orange-600 font-medium mb-4">⚠️ Live data unavailable. Showing cached data from {new Date(cacheTime).toLocaleString()}</p>}
      {dataSource==="none" && <p className="text-red-600 font-medium mb-4">❌ No data available</p>}

      <h2 className="text-3xl font-extrabold text-blue-900 mb-6 text-center tracking-tight">CLO Analysis</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="mb-8 flex flex-col md:flex-row items-center gap-4">
          <label className="font-medium text-gray-700">Year:
            <select value={selectedYear} onChange={e=>{setSelectedYear(e.target.value); setSelectedMonth('all');}} className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm">
              <option value="all">All Time</option>
              {uniqueYears.map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </label>
          <label className="font-medium text-gray-700">Month:
            <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="ml-2 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm" disabled={selectedYear==='all'}>
              <option value="all">All</option>
              {monthsInYear.map(m=><option key={m} value={m}>{allMonths[m]}</option>)}
            </select>
          </label>
          <span className="text-gray-500 mt-1 text-sm">Showing weeks {weekWindow.length>0 ? formatUS(weekWindow[0]) : ''} to {weekWindow.length>0 ? formatUS(weekWindow[weekWindow.length-1]) : ''}</span>
        </div>
        <label className="font-medium text-gray-700 text-lg flex items-center gap-2">
          <span>Select Associate:</span>
          <select value={selected} onChange={e=>setSelected(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-gray-800 shadow-sm">
            {associates.map(a=><option key={a} value={a}>{a}</option>)}
          </select>
        </label>
      </div>

      {/* Associate Weekly Error Rate */}
      <div className="mb-12 bg-blue-50 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-blue-800 mb-4">Associate Weekly Error Rate (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={associateErrorRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" angle={-40} textAnchor="end" minTickGap={10} height={60} />
            <YAxis domain={[0,100]} />
            <Tooltip content={<ErrorRateTooltip />} wrapperStyle={{ zIndex:1000, top:-10 }} />
            <Legend />
            <Bar dataKey="errorRate" name="Error Rate (%)" fill="#2196F3"/>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Team Weekly Error Rate */}
      {selected==="Everyone" && <div className="mb-12 bg-purple-50 rounded-xl shadow p-6">
        <h3 className="text-xl font-bold text-purple-800 mb-4">Team Weekly Error Rate (%)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={teamErrorRateData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="week" angle={-40} textAnchor="end" minTickGap={10} height={60} />
            <YAxis domain={[0,100]} />
            <Tooltip content={<ErrorRateTooltip />} wrapperStyle={{ zIndex:1000, top:-10 }} />
            <Legend />
            <Bar dataKey="errorRate" name="Error Rate (%)" fill="#9C27B0"/>
          </BarChart>
        </ResponsiveContainer>
      </div>}

      {/* Weekly Average CLO Completion Time Chart */}
      {weeklyAvgCLOTimeData.length > 0 && (
        <div className="mt-8 mb-12 bg-yellow-50 rounded-xl shadow p-6">
          <h3 className="text-xl font-bold text-yellow-800 mb-4">Weekly Average CLO Completion Time (minutes)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={weeklyAvgCLOTimeData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <ReferenceLine y={15} stroke="#888" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ value: '15 min', position: 'right', fill: '#888', fontSize: 12 }} />
              <Line type="monotone" dataKey="avgMinutes" name="Avg Minutes" stroke="#FF9800" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Individual CLO Updates Line Chart */}
      {(() => {
        if (cloUpdates.length === 0) return null;
        return (
          <div className="mt-8 mb-12 bg-orange-50 rounded-xl shadow p-6">
            <h3 className="text-xl font-bold text-orange-800 mb-4">Individual CLO Updates: Completion Time (minutes)</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={cloUpdates} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="index"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  ticks={weekStartIndices.map(w => w.index)}
                  tickFormatter={weekTickFormatter}
                  interval={0}
                  height={60}
                  angle={-45}
                  textAnchor="end"
                />
                <YAxis dataKey="minutes" allowDecimals={false} />
                <Tooltip 
                  content={<CLOUpdateTooltip />} 
                  isAnimationActive={false} 
                  filterNull={false} 
                  trigger="hover"
                  labelFormatter={idx => cloUpdates[idx] ? cloUpdates[idx].dateLabel : ''}
                />
                <Legend />
                <ReferenceLine y={15} stroke="#888" strokeDasharray="4 4" ifOverflow="extendDomain" label={{ value: '15 min', position: 'right', fill: '#888', fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="minutes"
                  name="Completion Time (min)"
                  stroke="#FF5722"
                  strokeWidth={2}
                  dot={({ cx, cy, ...rest }) => (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={3}
                      stroke="#FF5722"
                      strokeWidth={2}
                      fill="#fff"
                      style={{ pointerEvents: 'all' }}
                    />
                  )}
                  activeDot={{ r: 5, stroke: '#FF5722', strokeWidth: 3, fill: '#FFCCBC' }}
                />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-gray-600 text-sm mt-2">Each point represents a CLO update. {selected !== "Everyone" ? `Only updates for ${selected} are shown.` : "All associates shown."}</p>
          </div>
        );
      })()}
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
  mm=parseInt(mm,10); dd=parseInt(dd,10); yy=parseInt(yy,10);
  if(yy<100) yy+=2000;
  const d2 = new Date(yy, mm-1, dd);
  return isNaN(d2)?null:d2;
}

function getWeekStart(d) {
  const copy=new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day=copy.getDay();
  const diff=copy.getDate()-day+(day===0?-6:1);
  copy.setDate(diff); copy.setHours(0,0,0,0);
  return copy;
}

function formatUS(d) { return d.toLocaleDateString("en-US"); }

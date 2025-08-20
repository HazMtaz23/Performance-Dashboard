import React, { useEffect, useState } from "react";
import Papa from "papaparse";
import {
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid, ResponsiveContainer
} from "recharts";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQdVsFJIGHGZkadZ90NQEB-9AMplEDUd9HqizLq12EYdzOmVovHpQpXTS74UxnJmqRry03Nf6g5MZXP/pub?output=csv";

export default function DealAnalysis() {
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

  const errorRateData = allWeeks.map(w => {
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

  const errorTypeData = allWeeks.map(w => {
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
    <div>
      <h2>Deal Analysis</h2>

      <label>
        Select Associate:{" "}
        <select value={selected} onChange={e => setSelected(e.target.value)}>
          {associates.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </label>

      {/* Weekly Error Rate */}
      <h3>Weekly Error Rate (%)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={errorRateData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis domain={[0, 100]} />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 1000, top: -10 }} />
          <Legend />
          <Bar dataKey="errorRate" name="Error Rate (%)" fill="#2196F3" />
        </BarChart>
      </ResponsiveContainer>

      {/* Weekly Error Types (stacked) */}
      {selected !== "Everyone" && (
        <>
          <h3>Weekly Error Types</h3>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={errorTypeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" /> {/* keep week dates visible */}
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
        </>
      )}
    </div>
  );
}

/* ---------------- Helpers ---------------- */
function parseDateUS(s) {
  if (!s) return null;
  const d1 = new Date(s);
  if (!isNaN(d1)) return d1;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
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

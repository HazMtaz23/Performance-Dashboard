import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import './index.css';
import Home from "./Home";
import DealAnalysis from "./DealAnalysis";
import CLOAnalysis from "./CLOAnalysis";
import NewsAccuracy from "./NewsAccuracy";

function App() {
  return (
    <Router>
      <div style={{ padding: "20px" }}>
        <h1>📊 Performance Dashboard</h1>
        <nav style={{ marginBottom: "20px" }}>
          <Link to="/" style={{ marginRight: "15px" }}>Home</Link>
          <Link to="/deal-analysis" style={{ marginRight: "15px" }}>Deal Analysis</Link>
          <Link to="/clo" style={{ marginRight: "15px" }}>CLO Analysis</Link>
          <Link to="/news">News Accuracy</Link>
        </nav>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/deal-analysis" element={<DealAnalysis />} />
          <Route path="/clo" element={<CLOAnalysis />} />
          <Route path="/news" element={<NewsAccuracy />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

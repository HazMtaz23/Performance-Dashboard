import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './index.css';
import Home from "./Home";
import DealAnalysis from "./DealAnalysis";
import CLOAnalysis from "./CLOAnalysis";
import NewsAccuracy from "./NewsAccuracy";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/deal-analysis" element={<DealAnalysis />} />
  <Route path="/clo-analysis" element={<CLOAnalysis />} />
        <Route path="/news" element={<NewsAccuracy />} />
      </Routes>
    </Router>
  );
}

export default App;

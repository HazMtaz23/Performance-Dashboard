import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Home from "./Home";
import DealAnalysis from "./DealAnalysis";
import CLOAnalysis from "./CLOAnalysis";
import NewsAccuracy from "./NewsAccuracy";
import Login from "./Login";
import PrivateRoute from "./PrivateRoute";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />
        <Route
          path="/deal-analysis"
          element={
            <PrivateRoute>
              <DealAnalysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/clo-analysis"
          element={
            <PrivateRoute>
              <CLOAnalysis />
            </PrivateRoute>
          }
        />
        <Route
          path="/news-accuracy"
          element={
            <PrivateRoute>
              <NewsAccuracy />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;

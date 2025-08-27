import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Home';
import Login from './Login';
import DealAnalysis from './DealAnalysis';
import CLOAnalysis from './CLOAnalysis';
import NewsAccuracy from './NewsAccuracy';
import PrivateRoute from './PrivateRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public login page */}
        <Route path="/login" element={<Login />} />

        {/* Protected routes */}
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

        {/* Optional: Redirect unknown routes to login */}
        <Route path="*" element={<Login />} />
      </Routes>
    </Router>
  );
}

export default App;

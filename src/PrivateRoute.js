import React from 'react';
import { Navigate } from 'react-router-dom';

export default function PrivateRoute({ children }) {
  const isAuthenticated = sessionStorage.getItem("authenticated") === "true";

  if (!isAuthenticated) {
    // Redirect to login page if not authenticated
    return <Navigate to="/login" replace />;
  }

  // Render the children (protected page) if authenticated
  return children;
}

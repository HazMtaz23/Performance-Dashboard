import React from 'react';
import { Link } from 'react-router-dom';
import logo from './9fin.jpg';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-50 flex flex-col items-center">
      {/* Header */}
      <header className="w-full bg-white shadow-lg py-6 flex flex-col items-center">
        <img src={logo} alt="Logo" className="w-24 h-24 mb-3 rounded-full shadow-md" />
        <h1 className="text-5xl font-extrabold text-gray-800">Performance Dashboard</h1>
        <p className="text-gray-500 mt-2 text-center max-w-lg">
          Welcome! Choose a section below to view detailed performance analytics.
        </p>
      </header>

      {/* Navigation cards */}
      <main className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 px-6 md:px-12">
        <Link
          to="/deal-analysis"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition duration-300 flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold mb-2">Deal Analysis</h2>
          <p className="text-white text-center">Track individual and team error rates in deal processing.</p>
        </Link>

        <Link
          to="/clo-analysis"
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition duration-300 flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold mb-2">CLO Analysis</h2>
          <p className="text-white text-center">View trends and performance metrics for CLO deals.</p>
        </Link>

        <Link
          to="/news-accuracy"
          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition duration-300 flex flex-col items-center"
        >
          <h2 className="text-2xl font-bold mb-2">News Accuracy</h2>
          <p className="text-white text-center">Monitor accuracy of news and reporting metrics.</p>
        </Link>
      </main>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import logo from './9fin.jpg';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-blue-900 via-blue-400 to-purple-300 px-4 relative overflow-hidden">
      {/* Dramatic background shapes */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-400 opacity-30 rounded-full blur-3xl -z-10 animate-pulse" style={{top: '-6rem', left: '-6rem'}}></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-300 opacity-20 rounded-full blur-3xl -z-10 animate-pulse" style={{bottom: '-6rem', right: '-6rem'}}></div>

      {/* Hero Section */}
      <header className="flex flex-col items-center mb-16 mt-16">
        <div className="bg-white/30 backdrop-blur-lg rounded-full shadow-2xl p-8 mb-6 border-4 border-white/40">
          <img 
            src={logo} 
            alt="Logo" 
            className="max-w-[120px] max-h-[120px] rounded-lg shadow-lg object-contain" 
          />
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-white drop-shadow-lg mb-4 text-center tracking-tight">Performance Dashboard</h1>
        <p className="text-2xl text-white/80 text-center max-w-2xl mb-8 font-medium">Welcome! Dive into beautiful analytics and insights for deals, CLOs, and news accuracy. Select a section below to get started.</p>
      </header>

      {/* Navigation Cards */}
      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-10 mb-20">
        <Link
          to="/deal-analysis"
          className="group bg-white/60 backdrop-blur-lg rounded-2xl shadow-2xl p-10 flex flex-col items-center border-2 border-transparent hover:border-blue-600 hover:scale-105 transition-all duration-300 cursor-pointer hover:bg-white/80"
        >
          <span className="text-6xl mb-4 group-hover:animate-bounce">💼</span>
          <span className="font-bold text-2xl text-blue-900 mb-1 group-hover:text-blue-600 transition-colors">Deal Analysis</span>
          <span className="text-gray-700 text-base text-center">Track individual and team error rates in deal processing.</span>
        </Link>
        <Link
          to="/clo-analysis"
          className="group bg-white/60 backdrop-blur-lg rounded-2xl shadow-2xl p-10 flex flex-col items-center border-2 border-transparent hover:border-green-600 hover:scale-105 transition-all duration-300 cursor-pointer hover:bg-white/80"
        >
          <span className="text-6xl mb-4 group-hover:animate-bounce">📈</span>
          <span className="font-bold text-2xl text-green-900 mb-1 group-hover:text-green-600 transition-colors">CLO Analysis</span>
          <span className="text-gray-700 text-base text-center">View trends and performance metrics for CLO deals.</span>
        </Link>
        <Link
          to="/news-accuracy"
          className="group bg-white/60 backdrop-blur-lg rounded-2xl shadow-2xl p-10 flex flex-col items-center border-2 border-transparent hover:border-yellow-500 hover:scale-105 transition-all duration-300 cursor-pointer hover:bg-white/80"
        >
          <span className="text-6xl mb-4 group-hover:animate-bounce">📰</span>
          <span className="font-bold text-2xl text-yellow-700 mb-1 group-hover:text-yellow-600 transition-colors">News Accuracy</span>
          <span className="text-gray-700 text-base text-center">Monitor accuracy of news and reporting metrics.</span>
        </Link>
      </main>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [passwordInput, setPasswordInput] = useState("");
  const navigate = useNavigate();
  const correctPassword = "9fin2025";

  useEffect(() => {
    if (sessionStorage.getItem("authenticated") === "true") {
      navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === correctPassword) {
      sessionStorage.setItem("authenticated", "true");
      navigate("/", { replace: true });
    } else {
      alert("Incorrect password, please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-blue-900 via-blue-400 to-purple-300">
      <form
        onSubmit={handleSubmit}
        className="bg-white/80 p-8 rounded-2xl shadow-xl flex flex-col gap-4 w-80"
      >
        <h2 className="text-2xl font-bold text-center text-blue-900">
          Enter Password
        </h2>
        <input
          type="password"
          placeholder="Password"
          value={passwordInput}
          onChange={(e) => setPasswordInput(e.target.value)}
          className="p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Unlock
        </button>
      </form>
    </div>
  );
}

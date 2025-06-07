// src/components/ui/button.jsx
import React from "react";

export function Button({ children, className = "", onClick, type = "button" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-lg text-white font-semibold 
        bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 
        transition-all duration-300 ease-in-out 
        hover:shadow-[0_0_20px_rgba(255,0,255,0.6)] 
        hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-pink-400
        ${className}`}
    >
      <span className="relative z-10">{children}</span>
    </button>
  );
}

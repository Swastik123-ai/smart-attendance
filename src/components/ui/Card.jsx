// src/components/ui/card.jsx
import React from "react";

export function Card({ children, className = "" }) {
  return (
    <div
      className={`bg-white/10 backdrop-blur-md rounded-xl border border-white/10 
        hover:border-pink-400 hover:shadow-[0_0_25px_rgba(255,0,255,0.4)] 
        hover:scale-[1.02]
        transition-all duration-300 ease-in-out
        ${className}`}
    >
      {children}
    </div>
  );
}

export function CardContent({ children, className = "" }) {
  return <div className={`p-4 ${className}`}>{children}</div>;
}

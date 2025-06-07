// src/components/ui/table.jsx
import React from "react";

export function Table({ children, className = "" }) {
  return (
    <table className={`min-w-full border-collapse border border-gray-200 ${className}`}>
      {children}
    </table>
  );
}

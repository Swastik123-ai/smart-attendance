// src/components/ui/select.jsx
import React, { useState, useRef, useEffect } from "react";

export function Select({
  value,
  onValueChange,
  children,
  className = "",
}) {
  return (
    <div className={`relative inline-block text-left w-full ${className}`}>
      {children}
    </div>
  );
}

export function SelectTrigger({ children, className = "", onClick }) {
  return (
    <button
      type="button"
      className={`w-full border border-gray-300 rounded px-3 py-2 text-left flex justify-between items-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${className}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export function SelectValue({ placeholder, children, className = "" }) {
  return (
    <span className={`block truncate ${className}`}>
      {children ? children : <span className="text-gray-400">{placeholder}</span>}
    </span>
  );
}

export function SelectContent({ children, className = "", open }) {
  if (!open) return null;
  return (
    <div
      className={`absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-auto ${className}`}
    >
      {children}
    </div>
  );
}

export function SelectItem({ value, onSelect, children }) {
  return (
    <div
      className="px-3 py-2 hover:bg-blue-500 hover:text-white cursor-pointer"
      onClick={() => onSelect(value)}
      role="option"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onSelect(value);
        }
      }}
    >
      {children}
    </div>
  );
}

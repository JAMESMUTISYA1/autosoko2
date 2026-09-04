"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { countries } from "@/data/countries";

export default function CountryCodeSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedCountry = countries.find((c) => c.iso === value) || countries[0];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-gray-300 rounded-sm px-3 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
      >
        <span>+{selectedCountry.dial}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <ul className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-sm shadow-lg max-h-60 overflow-auto">
          {countries.map((c) => (
            <li key={c.iso}>
              <button
                type="button"
                onClick={() => {
                  onChange(c.iso);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                  c.iso === value ? "bg-blue-50 text-blue-600 font-medium" : "text-gray-800"
                }`}
              >
                {c.name} (+{c.dial})
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
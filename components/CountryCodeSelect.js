"use client";

import { useState, useEffect } from "react";
import { countries } from "@/data/countries"; // We'll create this

export default function CountryCodeSelect({ value, onChange }) {
  const [detected, setDetected] = useState(value);

  useEffect(() => {
    // Auto-detect from browser locale first
    const locale = navigator.language; // e.g., "en-KE"
    const countryCode = locale.split("-")[1]?.toUpperCase();
    if (countryCode && countries.some((c) => c.iso === countryCode)) {
      onChange(countryCode);
      return;
    }

    // Fallback: try IP geolocation
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.country_code && countries.some((c) => c.iso === data.country_code)) {
          onChange(data.country_code);
        } else {
          onChange("KE"); // default Kenya
        }
      })
      .catch(() => onChange("KE"));
  }, []);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-sm px-2 py-2.5 text-sm bg-white text-gray-900 focus:outline-none focus:border-blue-500"
    >
      {countries.map((c) => (
        <option key={c.iso} value={c.iso}>
          {c.flag} {c.name} (+{c.dial})
        </option>
      ))}
    </select>
  );
}
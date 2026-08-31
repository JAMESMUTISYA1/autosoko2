"use client";

import { useEffect, useState } from "react";
import { Trash2, Plus } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

export default function CompatibilityTab({ productId, compatibility = [], onUpdate }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [trims, setTrims] = useState([]);

  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [generationId, setGenerationId] = useState("");
  const [trimId, setTrimId] = useState("");
  const [adding, setAdding] = useState(false);
  const toast = useToast();

  useEffect(() => {
    fetch("/api/v1/seller/vehicle-data/makes")
      .then((r) => r.json())
      .then((json) => { if (json.success) setMakes(json.data); });
  }, []);

  function handleMakeChange(e) {
    const id = e.target.value;
    setMakeId(id);
    setModelId(""); setGenerationId(""); setTrimId("");
    setModels([]); setGenerations([]); setTrims([]);
    if (id) {
      fetch(`/api/v1/seller/vehicle-data/models?makeId=${id}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setModels(json.data); });
    }
  }

  function handleModelChange(e) {
    const id = e.target.value;
    setModelId(id);
    setGenerationId(""); setTrimId("");
    setGenerations([]); setTrims([]);
    if (id) {
      fetch(`/api/v1/seller/vehicle-data/generations?modelId=${id}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setGenerations(json.data); });
    }
  }

  function handleGenerationChange(e) {
    const id = e.target.value;
    setGenerationId(id);
    setTrimId("");
    setTrims([]);
    if (id) {
      fetch(`/api/v1/seller/vehicle-data/trims?generationId=${id}`)
        .then((r) => r.json())
        .then((json) => { if (json.success) setTrims(json.data); });
    }
  }

  async function handleAdd() {
    // Allow adding at trim level OR generation level (if no trim selected)
    if (!trimId && !generationId) {
      toast.error("Select at least a generation (trim optional)");
      return;
    }

    setAdding(true);
    try {
      const payload = trimId ? { vehicleTrimId: trimId } : { generationId };
      const res = await fetch(`/api/v1/seller/products/${productId}/compatibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Vehicle added");
        // reset cascade
        setMakeId(""); setModelId(""); setGenerationId(""); setTrimId("");
        setModels([]); setGenerations([]); setTrims([]);
        onUpdate();
      } else {
        toast.error(json.error?.message || "Failed to link vehicle");
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(vehicleTrimId) {
    const res = await fetch(`/api/v1/seller/products/${productId}/compatibility/${vehicleTrimId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Vehicle removed");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to remove");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Compatible Vehicles</h2>
      <p className="text-sm text-gray-500 mb-4">
        Not seeing a make, model, or trim? Add it under{" "}
        <a href="/seller/vehicle-data" className="text-blue-600 hover:underline">Vehicle Data</a> first, then come back here.
      </p>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select value={makeId} onChange={handleMakeChange} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="">Make</option>
            {makes.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={modelId} onChange={handleModelChange} disabled={!makeId} className="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="">Model</option>
            {models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={generationId} onChange={handleGenerationChange} disabled={!modelId} className="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="">Generation</option>
            {generations.map((g) => <option key={g.id} value={g.id}>{g.name} ({g.yearStart}–{g.yearEnd || "present"})</option>)}
          </select>
          <select value={trimId} onChange={(e) => setTrimId(e.target.value)} disabled={!generationId} className="border border-gray-300 rounded-md px-3 py-2 text-sm disabled:bg-gray-100">
            <option value="">Trim (optional)</option>
            {trims.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <button
          onClick={handleAdd}
          disabled={adding}
          className="mt-3 inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          <Plus size={16} /> {adding ? "Adding..." : "Add Vehicle"}
        </button>
      </div>

      {/* Existing compatibility list (unchanged) */}
      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {compatibility.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No vehicles linked yet.</p>}
        {compatibility.map((c) => (
          <div key={c.vehicleTrimId} className="flex items-center justify-between px-4 py-3 text-sm">
            <span>
              {c.vehicleTrim.generation.model.make.name} {c.vehicleTrim.generation.model.name}{" "}
              <span className="text-gray-500">
                {c.vehicleTrim.generation.name} ({c.vehicleTrim.generation.yearStart}–{c.vehicleTrim.generation.yearEnd || "present"}) · {c.vehicleTrim.name}
              </span>
            </span>
            <button onClick={() => handleRemove(c.vehicleTrimId)} className="text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
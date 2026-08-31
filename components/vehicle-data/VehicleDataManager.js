"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, ChevronRight, X } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const FUEL_TYPES = ["petrol", "diesel", "hybrid", "electric"];
const TRANSMISSIONS = ["manual", "automatic", "cvt"];
const DRIVE_TYPES = ["fwd", "rwd", "awd", "four_wd"];
const BODY_TYPES = ["sedan", "hatchback", "suv", "pickup", "van", "truck", "motorcycle"];

const LABELS = { makes: "Make", models: "Model", generations: "Generation", trims: "Trim" };

export default function VehicleDataManager({ apiBase, canEdit = false, canDelete = false }) {
  const [makes, setMakes] = useState([]);
  const [models, setModels] = useState([]);
  const [generations, setGenerations] = useState([]);
  const [trims, setTrims] = useState([]);

  const [selectedMake, setSelectedMake] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [selectedGeneration, setSelectedGeneration] = useState(null);

  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const toast = useToast();

  const level = selectedGeneration ? "trims" : selectedModel ? "generations" : selectedMake ? "models" : "makes";

  useEffect(() => {
    fetchMakes();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchMakes() {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/makes`);
      const json = await res.json();
      if (json.success) setMakes(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchModels(makeId) {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/models?makeId=${makeId}`);
      const json = await res.json();
      if (json.success) setModels(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchGenerations(modelId) {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/generations?modelId=${modelId}`);
      const json = await res.json();
      if (json.success) setGenerations(json.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchTrims(generationId) {
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/trims?generationId=${generationId}`);
      const json = await res.json();
      if (json.success) setTrims(json.data);
    } finally {
      setLoading(false);
    }
  }

  function openMake(make) {
    setSelectedMake(make);
    setSelectedModel(null);
    setSelectedGeneration(null);
    fetchModels(make.id);
  }
  function openModel(model) {
    setSelectedModel(model);
    setSelectedGeneration(null);
    fetchGenerations(model.id);
  }
  function openGeneration(generation) {
    setSelectedGeneration(generation);
    fetchTrims(generation.id);
  }
  function goToMakes() {
    setSelectedMake(null);
    setSelectedModel(null);
    setSelectedGeneration(null);
    fetchMakes();
  }
  function goToModels() {
    setSelectedModel(null);
    setSelectedGeneration(null);
    fetchModels(selectedMake.id);
  }
  function goToGenerations() {
    setSelectedGeneration(null);
    fetchGenerations(selectedModel.id);
  }

  function refreshCurrentLevel() {
    if (level === "makes") fetchMakes();
    else if (level === "models") fetchModels(selectedMake.id);
    else if (level === "generations") fetchGenerations(selectedModel.id);
    else fetchTrims(selectedGeneration.id);
  }

  async function handleDelete(id) {
    if (!confirm("Delete this? This can't be undone.")) return;
    const res = await fetch(`${apiBase}/${level}/${id}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Deleted");
      refreshCurrentLevel();
    } else {
      toast.error(json.error?.message || "Failed to delete — it may still have items under it");
    }
  }

  function openAdd() {
    setEditingItem(null);
    setShowForm(true);
  }
  function openEdit(item) {
    setEditingItem(item);
    setShowForm(true);
  }

  const currentList = level === "makes" ? makes : level === "models" ? models : level === "generations" ? generations : trims;

  return (
    <div>
      <div className="flex items-center gap-1 text-sm mb-4 flex-wrap">
        <button onClick={goToMakes} className={level === "makes" ? "font-semibold text-gray-900" : "text-blue-600 hover:underline"}>
          All Makes
        </button>
        {selectedMake && (
          <>
            <ChevronRight size={14} className="text-gray-400" />
            <button onClick={goToModels} className={level === "models" ? "font-semibold text-gray-900" : "text-blue-600 hover:underline"}>
              {selectedMake.name}
            </button>
          </>
        )}
        {selectedModel && (
          <>
            <ChevronRight size={14} className="text-gray-400" />
            <button onClick={goToGenerations} className={level === "generations" ? "font-semibold text-gray-900" : "text-blue-600 hover:underline"}>
              {selectedModel.name}
            </button>
          </>
        )}
        {selectedGeneration && (
          <>
            <ChevronRight size={14} className="text-gray-400" />
            <span className="font-semibold text-gray-900">{selectedGeneration.name}</span>
          </>
        )}
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold capitalize">{level}</h2>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md"
        >
          <Plus size={16} /> Add {LABELS[level]}
        </button>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-blue-600" size={32} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {currentList.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">Nothing here yet.</p>}
          {currentList.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => {
                  if (level === "makes") openMake(item);
                  else if (level === "models") openModel(item);
                  else if (level === "generations") openGeneration(item);
                }}
                disabled={level === "trims"}
                className={`text-left flex-1 ${level !== "trims" ? "hover:text-blue-600" : ""}`}
              >
                <span className="font-medium text-sm">{item.name}</span>
                {level === "makes" && <span className="text-xs text-gray-500 ml-2">{item._count?.models ?? 0} models</span>}
                {level === "models" && <span className="text-xs text-gray-500 ml-2">{item._count?.generations ?? 0} generations</span>}
                {level === "generations" && (
                  <span className="text-xs text-gray-500 ml-2">
                    {item.yearStart}–{item.yearEnd || "present"} · {item._count?.trims ?? 0} trims
                  </span>
                )}
                {level === "trims" && (
                  <span className="text-xs text-gray-500 ml-2">
                    {[item.engineDisplacementCc && `${item.engineDisplacementCc}cc`, item.fuelType, item.transmission, item.driveType, item.bodyType]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {level !== "trims" && <ChevronRight size={16} className="text-gray-300" />}
                {canEdit && (
                  <button onClick={() => openEdit(item)} className="text-yellow-600">
                    <Pencil size={15} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => handleDelete(item.id)} className="text-red-600">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <VehicleDataFormModal
          apiBase={apiBase}
          level={level}
          editingItem={editingItem}
          parent={{ make: selectedMake, model: selectedModel, generation: selectedGeneration }}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refreshCurrentLevel();
          }}
        />
      )}
    </div>
  );
}

function VehicleDataFormModal({ apiBase, level, editingItem, parent, onClose, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState(editingItem?.name || "");
  const [logoUrl, setLogoUrl] = useState(editingItem?.logoUrl || "");
  const [yearStart, setYearStart] = useState(editingItem?.yearStart?.toString() || "");
  const [yearEnd, setYearEnd] = useState(editingItem?.yearEnd?.toString() || "");
  const [engineCode, setEngineCode] = useState(editingItem?.engineCode || "");
  const [engineDisplacementCc, setEngineDisplacementCc] = useState(editingItem?.engineDisplacementCc?.toString() || "");
  const [fuelType, setFuelType] = useState(editingItem?.fuelType || "");
  const [transmission, setTransmission] = useState(editingItem?.transmission || "");
  const [driveType, setDriveType] = useState(editingItem?.driveType || "");
  const [bodyType, setBodyType] = useState(editingItem?.bodyType || "");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    let body;
    if (level === "makes") {
      body = { name, logoUrl: logoUrl || undefined };
    } else if (level === "models") {
      body = { name, makeId: parent.make.id };
    } else if (level === "generations") {
      if (!yearStart) {
        toast.error("Start year is required");
        return;
      }
      body = { name, modelId: parent.model.id, yearStart, yearEnd: yearEnd || undefined };
    } else {
      body = {
        name,
        generationId: parent.generation.id,
        engineCode: engineCode || undefined,
        engineDisplacementCc: engineDisplacementCc || undefined,
        fuelType: fuelType || undefined,
        transmission: transmission || undefined,
        driveType: driveType || undefined,
        bodyType: bodyType || undefined,
      };
    }

    setSaving(true);
    try {
      const url = editingItem ? `${apiBase}/${level}/${editingItem.id}` : `${apiBase}/${level}`;
      const res = await fetch(url, {
        method: editingItem ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(editingItem ? "Updated" : "Added");
        onSaved();
      } else {
        toast.error(json.error?.message || "Failed to save");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{editingItem ? "Edit" : "Add"} {LABELS[level]}</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {level === "models" && <p className="text-xs text-gray-500">Make: {parent.make.name}</p>}
          {level === "generations" && <p className="text-xs text-gray-500">Model: {parent.model.name}</p>}
          {level === "trims" && <p className="text-xs text-gray-500">Generation: {parent.generation.name}</p>}

          <input
            placeholder="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
          />

          {level === "makes" && (
            <input
              placeholder="Logo URL (optional)"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2.5 text-sm"
            />
          )}

          {level === "generations" && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="Start year *"
                value={yearStart}
                onChange={(e) => setYearStart(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              />
              <input
                type="number"
                placeholder="End year (blank = current)"
                value={yearEnd}
                onChange={(e) => setYearEnd(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
              />
            </div>
          )}

          {level === "trims" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Engine code"
                  value={engineCode}
                  onChange={(e) => setEngineCode(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
                <input
                  type="number"
                  placeholder="Displacement (cc)"
                  value={engineDisplacementCc}
                  onChange={(e) => setEngineDisplacementCc(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="">Fuel type</option>
                  {FUEL_TYPES.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
                <select value={transmission} onChange={(e) => setTransmission(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="">Transmission</option>
                  {TRANSMISSIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <select value={driveType} onChange={(e) => setDriveType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="">Drive type</option>
                  {DRIVE_TYPES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
                <select value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2.5 text-sm">
                  <option value="">Body type</option>
                  {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm py-3 rounded-md disabled:opacity-60"
          >
            {saving ? "Saving..." : editingItem ? "Save Changes" : "Add"}
          </button>
        </form>
      </div>
    </div>
  );
}
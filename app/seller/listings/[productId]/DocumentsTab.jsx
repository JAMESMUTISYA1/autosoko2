"use client";

import { useRef, useState } from "react";
import { Loader2, Upload, Trash2, FileText } from "lucide-react";
import { useToast } from "@/contexts/ToastContext";

const TYPE_LABELS = { installation_guide: "Installation Guide", spec_sheet: "Spec Sheet" };

export default function DocumentsTab({ productId, documents = [], onUpdate }) {
  const [uploading, setUploading] = useState(false);
  const [type, setType] = useState("installation_guide");
  const [title, setTitle] = useState("");
  const fileInputRef = useRef(null);
  const toast = useToast();

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("type", type);
      if (title) fd.append("title", title);
      const res = await fetch(`/api/v1/seller/products/${productId}/documents`, { method: "POST", body: fd });
      const json = await res.json();
      if (json.success) {
        toast.success("Document uploaded");
        setTitle("");
        onUpdate();
      } else {
        toast.error(json.error?.message || "Upload failed");
      }
    } catch {
      toast.error("Network error during upload");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(documentId) {
    if (!confirm("Remove this document?")) return;
    const res = await fetch(`/api/v1/seller/products/${productId}/documents/${documentId}`, { method: "DELETE" });
    const json = await res.json();
    if (json.success) {
      toast.success("Document removed");
      onUpdate();
    } else {
      toast.error(json.error?.message || "Failed to remove document");
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Documents</h2>
      <p className="text-sm text-gray-500 mb-4">Installation guides or spec sheets buyers can download. PDF or similar, up to 10MB.</p>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <select value={type} onChange={(e) => setType(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm">
            <option value="installation_guide">Installation Guide</option>
            <option value="spec_sheet">Spec Sheet</option>
          </select>
          <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm sm:col-span-2" />
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="inline-flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-semibold text-sm px-4 py-2 rounded-md disabled:opacity-60"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading..." : "Upload File"}
        </button>
        <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {documents.length === 0 && <p className="px-4 py-6 text-sm text-gray-500">No documents yet.</p>}
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between px-4 py-3 text-sm">
            <a href={doc.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
              <FileText size={16} />
              {doc.title || TYPE_LABELS[doc.type] || doc.type}
            </a>
            <button onClick={() => handleDelete(doc.id)} className="text-red-600">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
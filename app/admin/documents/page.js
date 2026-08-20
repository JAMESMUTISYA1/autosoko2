"use client";

import { useState } from "react";
import { FileText, Upload, Download, X, Loader2 } from "lucide-react";
import { adminDocuments, DOCUMENT_CATEGORIES } from "@/data/adminFinanceData";
import { useToast } from "@/contexts/ToastContext";

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState(adminDocuments);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [category, setCategory] = useState(DOCUMENT_CATEGORIES[0]);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (file) setFileName(file.name);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!fileName) return;

    setSubmitting(true);
    // Replace with POST /api/v1/admin/documents — file goes to S3/Cloudinary
    // (Document 1's storage layer) with restricted access, metadata row
    // written to a new admin_documents table (not yet in Document 2).
    await new Promise((r) => setTimeout(r, 700));
    setSubmitting(false);

    setDocuments((prev) => [
      {
        id: `doc-${Date.now()}`,
        name: fileName,
        category,
        uploadedBy: "Samuel Kariuki",
        uploadedAt: new Date().toISOString().slice(0, 10),
        size: "—",
      },
      ...prev,
    ]);
    toast.success(`"${fileName}" uploaded and shared with all admins`);
    setUploadOpen(false);
    setFileName("");
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-2xl">Documents</h1>
        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-sm hover:bg-accent/90 transition-colors"
        >
          <Upload size={16} />
          Upload Document
        </button>
      </div>
      <p className="text-sm text-muted mb-8">
        Shared internal documents — visible to every admin account, not agents or sellers.
      </p>

      {uploadOpen && (
        <div className="bg-card border border-accent rounded-md p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-base">Upload Document</h2>
            <button onClick={() => setUploadOpen(false)} aria-label="Close">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="flex items-center gap-2 border border-dashed border-line rounded-sm px-4 py-3 text-sm cursor-pointer hover:border-fg transition-colors w-fit">
                <Upload size={15} />
                {fileName || "Choose file"}
                <input type="file" onChange={handleFileSelect} className="hidden" />
              </label>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1.5">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full sm:w-64 border border-line rounded-sm px-3 py-2.5 text-sm bg-bg focus:outline-none focus:border-accent"
              >
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              disabled={!fileName || submitting}
              className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-5 py-2.5 rounded-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Uploading..." : "Upload"}
            </button>
          </form>
        </div>
      )}

      <div className="bg-card border border-line rounded-md divide-y divide-line">
        {documents.map((doc) => (
          <div key={doc.id} className="flex items-center gap-3 px-5 py-3.5">
            <FileText size={18} className="text-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{doc.name}</p>
              <p className="text-xs text-muted">
                {doc.category} · Uploaded by {doc.uploadedBy} · {doc.uploadedAt} · {doc.size}
              </p>
            </div>
            <button
              aria-label={`Download ${doc.name}`}
              className="text-muted hover:text-fg shrink-0"
            >
              <Download size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

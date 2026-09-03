// PATH: components/FittingGuide.js

import { Youtube, Wrench, ListChecks, FileText, Download } from "lucide-react";

const DOC_TYPE_LABELS = { installation_guide: "Installation Guide", spec_sheet: "Spec Sheet" };

export default function FittingGuide({ product }) {
  const hasTutorial = Boolean(product.youtubeUrl || product.fittingInstructions);
  const hasTools = Boolean(product.toolsNeeded?.length);
  const hasDocuments = Boolean(product.documents?.length);

  if (!hasTutorial && !hasTools && !hasDocuments) return null;

  return (
    <div className="mt-8 space-y-6">
      {hasTutorial && (
        <div>
          <h2 className="font-display text-lg mb-3 flex items-center gap-2">
            <ListChecks size={17} />
            Fitting Guide
          </h2>

          {product.youtubeUrl && (
            <a
              href={product.youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 border border-line rounded-md px-4 py-3 hover:border-fg transition-colors mb-3"
            >
              <span className="w-9 h-9 rounded-full bg-fg text-bg flex items-center justify-center shrink-0">
                <Youtube size={17} />
              </span>
              <span className="text-sm">
                <span className="font-medium">Watch installation video</span>
                <span className="block text-xs text-muted">Opens on YouTube</span>
              </span>
            </a>
          )}

          {product.fittingInstructions && (
            <div className="bg-card border border-line rounded-md p-4">
              <p className="text-xs uppercase tracking-wider text-muted mb-2">
                Step-by-step
              </p>
              <p className="text-sm whitespace-pre-line leading-relaxed">
                {product.fittingInstructions}
              </p>
            </div>
          )}
        </div>
      )}

      {/* NEW — ProductDocument (installation_guide | spec_sheet) wasn't
          surfaced anywhere on the original page at all. */}
      {hasDocuments && (
        <div>
          <h2 className="font-display text-lg mb-3 flex items-center gap-2">
            <FileText size={17} />
            Documents
          </h2>
          <div className="space-y-2">
            {product.documents.map((doc) => (
              <a
                key={doc.id}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 border border-line rounded-md px-4 py-3 hover:border-fg transition-colors"
              >
                <span className="flex items-center gap-2 text-sm">
                  <FileText size={15} className="text-muted shrink-0" />
                  {doc.title || DOC_TYPE_LABELS[doc.type] || doc.type}
                </span>
                <Download size={15} className="text-muted shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {hasTools && (
        <div>
          <h2 className="font-display text-lg mb-3 flex items-center gap-2">
            <Wrench size={17} />
            Tools You'll Need
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.toolsNeeded.map((tool) => (
              <li
                key={tool}
                className="flex items-center gap-2 text-sm bg-card border border-line rounded-sm px-3 py-2.5"
              >
                <Wrench size={13} className="text-muted shrink-0" />
                {tool}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
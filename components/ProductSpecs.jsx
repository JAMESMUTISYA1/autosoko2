// PATH: components/ProductSpecs.js

export default function ProductSpecs({ product }) {
  const specs = [
    { label: "Brand", value: product.brand },
    { label: "Manufacturer", value: product.manufacturer },
    { label: "OEM Number", value: product.oemNumber },
    { label: "Part Number", value: product.partNumber },
    { label: "SKU", value: product.sku },
    { label: "Condition", value: product.condition && product.condition[0].toUpperCase() + product.condition.slice(1) },
    { label: "Warranty", value: product.warrantyMonths ? `${product.warrantyMonths} months` : null },
    { label: "Weight", value: product.weightGrams ? `${product.weightGrams} g` : null },
    {
      label: "Dimensions",
      value:
        product.lengthMm && product.widthMm && product.heightMm
          ? `${product.lengthMm} × ${product.widthMm} × ${product.heightMm} mm`
          : null,
    },
    { label: "Minimum Order", value: product.moq > 1 ? `${product.moq} units` : null },
  ].filter((s) => s.value);

  if (specs.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg mb-3">Specifications</h2>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
        {specs.map((s) => (
          <div key={s.label} className="flex justify-between border-b border-line py-2">
            <dt className="text-muted">{s.label}</dt>
            <dd className="text-fg font-mono">{s.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
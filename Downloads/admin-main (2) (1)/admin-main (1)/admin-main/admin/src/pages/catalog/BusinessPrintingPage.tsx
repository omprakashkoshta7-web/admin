import { useEffect, useState } from "react";
import { Info, Printer, Search } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getBusinessPrintingProducts } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

const BUSINESS_PRINT_TYPES = [
  { id: "business_card", label: "Business Cards" },
  { id: "flyers", label: "Flyers & Leaflets" },
  { id: "brochures", label: "Brochures" },
  { id: "posters", label: "Posters" },
  { id: "letterheads", label: "Letterheads" },
  { id: "custom_stationery", label: "Custom Stationery" },
];

type BizProduct = {
  id: string;
  name: string;
  businessPrintType: string;
  basePrice: number;
  active: boolean;
  imageUrl: string;
  isFeatured: boolean;
  designMode: string;
};

export default function BusinessPrintingPage() {
  const [products, setProducts] = useState<BizProduct[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const { data: productsData, loading } = useAsync(
    () => getBusinessPrintingProducts({ limit: 100 }),
    null,
    []
  );

  useEffect(() => {
    try {
      let arr: any[] = [];
      if (productsData && typeof productsData === "object") {
        if ("products" in productsData && Array.isArray((productsData as any).products)) {
          arr = (productsData as any).products;
        } else if (Array.isArray(productsData)) {
          arr = productsData as any[];
        }
      }

      setProducts(
        arr.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          businessPrintType: p.business_print_type || p.businessPrintType || "",
          basePrice: p.base_price || p.basePrice || 0,
          active: p.isActive !== false,
          imageUrl: p.thumbnail || p.images?.[0] || "",
          isFeatured: Boolean(p.is_featured || p.isFeatured),
          designMode: p.design_mode || p.designMode || "both",
        }))
      );
    } catch (error) {
      console.error("Failed to map business printing products:", error);
      setProducts([]);
    }
  }, [productsData]);

  const filtered = products.filter(
    (product) =>
      (typeFilter === "all" || product.businessPrintType === typeFilter) &&
      product.name.toLowerCase().includes(search.toLowerCase())
  );

  const typeLabel = (id: string) =>
    BUSINESS_PRINT_TYPES.find((type) => type.id === id)?.label || id || "Unknown";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingState message="Loading business printing catalog" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <div className="flex items-start gap-3">
          <Info size={18} className="mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold">Backend-aligned mode</p>
            <p className="mt-1 text-blue-800">
              Current backend business-printing APIs expose listing and detail data only. Create, edit, delete,
              and status-toggle endpoints are not available for this section, so this page is read-only.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none"
          />
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {[{ id: "all", label: "All" }, ...BUSINESS_PRINT_TYPES].map((type) => (
            <button
              key={type.id}
              onClick={() => setTypeFilter(type.id)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              style={{
                backgroundColor: typeFilter === type.id ? "#334155" : "#fff",
                color: typeFilter === type.id ? "#fff" : "#64748b",
                border: `1px solid ${typeFilter === type.id ? "#334155" : "#e2e8f0"}`,
              }}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: products.length, color: "#334155" },
          { label: "Active", value: products.filter((product) => product.active).length, color: "#10b981" },
          { label: "Featured", value: products.filter((product) => product.isFeatured).length, color: "#f59e0b" },
        ].map((item) => (
          <div key={item.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <p className="text-2xl font-black" style={{ color: item.color }}>{item.value}</p>
            <p className="text-xs font-semibold text-gray-500 mt-0.5">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {["Product", "Type", "Base Price", "Design Mode", "Featured", "Status"].map((heading) => (
                  <th key={heading} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-3">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((product, index) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition"
                    style={{ borderBottom: index < filtered.length - 1 ? "1px solid #f1f5f9" : "none" }}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center bg-slate-100">
                          {product.imageUrl ? (
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Printer size={14} className="text-slate-700" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{product.name}</p>
                          <p className="text-xs text-gray-400">{product.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700">
                        {typeLabel(product.businessPrintType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900">₹{product.basePrice}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 capitalize">{product.designMode}</td>
                    <td className="px-4 py-3">
                      {product.isFeatured ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-amber-50 text-amber-600">Featured</span>
                      ) : (
                        <span className="text-xs text-gray-400">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        product.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                      }`}>
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500">
                    {products.length === 0 ? "No business printing products returned by backend." : "No products match your filters."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

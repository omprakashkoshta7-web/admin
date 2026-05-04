import { DollarSign, Package, Percent, TrendingUp } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { ADMIN_COLORS } from "../../utils/colors";
import LoadingState from "../../components/ui/LoadingState";
import AdminMetricCard from "../../components/ui/AdminMetricCard";
import { getProducts } from "../../api/admin";

export default function PricingPage() {
  const { data: pricingData, loading } = useAsync(
    () => getProducts({ limit: 100 }),
    { products: [] },
    []
  );

  const products = Array.isArray((pricingData as any)?.products) ? (pricingData as any).products : [];

  const rows = products.map((product: any) => ({
    id: product._id || product.id,
    name: product.name,
    category: product.category?.name || "General",
    unit: product.unit || "per piece",
    basePrice: product.basePrice || product.mrp || 0,
    salePrice: product.discountedPrice || product.sale_price || product.basePrice || product.mrp || 0,
    platformFee:
      product.basePrice && product.discountedPrice
        ? Math.max(0, Number((((product.basePrice - product.discountedPrice) / product.basePrice) * 100).toFixed(1)))
        : 0,
  }));

  const avgPlatformFee = rows.length > 0
    ? (rows.reduce((sum: number, row: any) => sum + row.platformFee, 0) / rows.length).toFixed(1)
    : "0.0";

  const avgBasePrice = rows.length > 0
    ? (rows.reduce((sum: number, row: any) => sum + row.basePrice, 0) / rows.length).toFixed(1)
    : "0.0";

  if (loading) {
    return (
      <div className="admin-content-wrapper">
        <LoadingState message="Loading pricing data" />
      </div>
    );
  }

  return (
    <div className="admin-content-wrapper">
      <div className="admin-stats-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", marginBottom: "1.5rem" }}>
        <AdminMetricCard index={0} label="Products Priced" value={rows.length.toString()} accent="#334155" icon={Package} />
        <AdminMetricCard label="Avg Platform Gap" value={`${avgPlatformFee}%`} accent={ADMIN_COLORS.success} accentBg={ADMIN_COLORS.successBg} icon={Percent} />
        <AdminMetricCard label="Avg Base Price" value={`₹${avgBasePrice}`} accent={ADMIN_COLORS.warning} accentBg={ADMIN_COLORS.warningBg} icon={TrendingUp} />
      </div>

      {rows.length === 0 ? (
        <div className="admin-empty-state">
          <DollarSign size={48} className="admin-empty-icon" />
          <h3>No pricing data found</h3>
          <p>No products with pricing information were returned by backend.</p>
        </div>
      ) : (
        <div className="admin-table-container">
          <div
            style={{
              padding: "0.75rem 1rem",
              borderBottom: "1px solid rgba(197,206,255,0.4)",
              backgroundColor: "rgba(248,249,255,0.78)",
            }}
          >
            <p style={{ fontSize: "0.75rem", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.1em", color: "#9ca3af" }}>
              Product Pricing
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="admin-table min-w-[700px] lg:min-w-0">
              <thead>
                <tr>
                  {["Product", "Category", "Base Price", "Effective Price", "Gap", "Unit"].map((heading) => (
                    <th key={heading}>{heading}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any) => (
                  <tr key={row.id} className="admin-table-row">
                    <td data-label="Product">
                      <div>
                        <p style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1f2937" }}>{row.name}</p>
                        <p style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{row.id}</p>
                      </div>
                    </td>
                    <td data-label="Category">
                      <span style={{ fontSize: "0.75rem", fontWeight: "600", padding: "0.125rem 0.5rem", borderRadius: "9999px", backgroundColor: "#f3f4f6", color: "#4b5563" }}>
                        {row.category}
                      </span>
                    </td>
                    <td data-label="Base Price">
                      <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#1f2937" }}>₹{row.basePrice}</span>
                    </td>
                    <td data-label="Effective Price">
                      <span style={{ fontSize: "0.875rem", fontWeight: "700", color: "#0f766e" }}>₹{row.salePrice}</span>
                    </td>
                    <td data-label="Gap">
                      <span style={{ fontSize: "0.75rem", fontWeight: "700", padding: "0.125rem 0.5rem", borderRadius: "9999px", backgroundColor: "#f0fdf4", color: "#10b981" }}>
                        {row.platformFee}%
                      </span>
                    </td>
                    <td data-label="Unit">
                      <span style={{ fontSize: "0.75rem", color: "#6b7280" }}>{row.unit}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, X, CheckCircle, Layers, ToggleLeft, ToggleRight, ChevronRight, Tag, Package, Download, RefreshCw } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory, getProducts } from "../../api/admin";
import type { AdminCategoriesResponse } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";

type CategoryForm = {
  name: string;
  slug: string;
  description: string;
  icon: string;
  image: string;
  flowType: string;
};

const emptyForm: CategoryForm = { name: "", slug: "", description: "", icon: "📄", image: "", flowType: "printing" };

export default function CategoriesPage() {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [productCounts, setProductCounts] = useState<Record<string, number>>({});
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Fetch categories from backend
  const { data: categoriesData, loading: categoriesLoading, refetch: refetchCategories } = useAsync<AdminCategoriesResponse>(
    () => getProductCategories(),
    null,
    []
  );

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchCategories(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchCategories]);

  // Fetch products to count by category
  const { data: productsData } = useAsync(
    () => getProducts(),
    null,
    []
  );

  // Extract categories from backend data (API returns array directly)
  const cats = Array.isArray(categoriesData) ? categoriesData.map((c: any) => ({
    ...c,
    // Normalize isActive -> active for consistent frontend usage
    active: c.isActive !== false && c.active !== false,
  })) : [];

  // Calculate product counts by category
  useEffect(() => {
    try {
      let productsArray = [];
      
      // API returns { products: [...], meta: {...} }
      if (productsData && typeof productsData === 'object') {
        if ('products' in productsData && Array.isArray((productsData as any).products)) {
          productsArray = (productsData as any).products;
        } else if (Array.isArray(productsData)) {
          productsArray = productsData as any[];
        }
      }
      
      // Count products by category
      const counts: Record<string, number> = {};
      productsArray.forEach((p: any) => {
        const categoryId = p.category?._id || p.category?.id || p.category;
        if (categoryId) {
          counts[categoryId] = (counts[categoryId] || 0) + 1;
        }
      });
      
      console.log('Product counts by category:', counts);
      setProductCounts(counts);
    } catch (error) {
      console.error('Error calculating product counts:', error);
    }
  }, [productsData]);

  const openAdd = () => { 
    setForm(emptyForm); 
    setEditId(null); 
    setShowForm(true); 
    setSaved(false); 
    setImagePreview(null);
  };
  
  const openEdit = (c: any) => {
    setForm({ name: c.name, slug: c.slug, description: c.description, icon: c.icon, image: c.image || "", flowType: c.flowType });
    setEditId(c._id || c.id); 
    setShowForm(true); 
    setSaved(false);
    setImagePreview(c.image || null);
  };

  const save = async () => {
    if (!form.name) {
      alert('Please enter a category name');
      return;
    }
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-");

    // Send image if available — http URL preferred, base64 as fallback
    const safeForm = { ...form, slug };

    try {
      setLoading(true);
      console.log('Saving category:', safeForm);

      if (editId) {
        const updated = await updateProductCategory(editId, safeForm);
        console.log('Category updated:', updated);
      } else {
        const created = await createProductCategory(safeForm);
        console.log('Category created:', created);
      }
      
      console.log('Category saved successfully');
      setSaved(true);
      setTimeout(() => { 
        setShowForm(false); 
        setSaved(false); 
        refetchCategories(); // Refresh categories list
      }, 1500);
    } catch (err: any) {
      console.error('Failed to save category:', err);
      alert(`Error: ${err?.message || 'Failed to save category'}`);
    } finally {
      setLoading(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this category? This will also delete all its subcategories.')) return;
    try {
      await deleteProductCategory(id);
      refetchCategories(); // Refresh categories list
    } catch (error) {
      console.error('Failed to delete category:', error);
      alert(`Error: ${(error as any)?.message || 'Failed to delete category'}`);
    }
  };

  const exportCategories = () => {
    const csvContent = [
      ['ID', 'Name', 'Slug', 'Flow Type', 'Active'].join(','),
      ...cats.map((c: any) => [
        c._id || c.id || '',
        `"${(c.name || '').replace(/"/g, '""')}"`,
        c.slug || '',
        c.flowType || '',
        c.active ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `categories-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  const toggle = async (id: string) => {
    try {
      const category = cats.find((c: any) => c._id === id || c.id === id);
      if (category) {
        console.log('Toggling category:', { id, currentActive: category.active });
        const newActiveState = !category.active;
        
        // Backend uses isActive field, not active
        await updateProductCategory(id, { isActive: newActiveState });
        console.log('Category toggled successfully');
        refetchCategories(); // Refresh categories list
      } else {
        console.warn('Category not found for toggle:', id);
      }
    } catch (error) {
      console.error('Failed to toggle category:', error);
      alert(`Error: ${(error as any)?.message || 'Failed to toggle category'}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"></div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCategories}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
          >
            <Download size={14} />
            Export
          </button>
          <button
            onClick={() => refetchCategories()}
            disabled={categoriesLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw size={14} className={categoriesLoading ? "animate-spin" : ""} />
            {categoriesLoading ? "Refreshing..." : "Refresh"}
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-1.5 px-4 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ backgroundColor: ADMIN_COLORS.primary }}>
            <Plus size={14} /> Add Category
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Categories", value: cats.length, color: ADMIN_COLORS.primary, bg: ADMIN_COLORS.gray100, icon: Tag },
          { label: "Active Categories", value: cats.filter((c: any) => c.active).length, color: ADMIN_COLORS.success, bg: ADMIN_COLORS.successBg, icon: CheckCircle },
          { label: "Total Products", value: Object.values(productCounts).reduce((sum, count) => sum + count, 0), color: ADMIN_COLORS.info, bg: ADMIN_COLORS.infoBg, icon: Package },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: s.bg }}>
                <s.icon size={14} style={{ color: s.color }} />
              </div>
              <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className="text-2xl font-black text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Category Cards */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingState message="Loading categories" />
        </div>
      ) : cats.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {cats.map((c: any) => (
            <div key={c.id} className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-md transition flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                    style={{ backgroundColor: c.active ? ADMIN_COLORS.gray100 : ADMIN_COLORS.gray200 }}>
                    {c.image ? (
                      <img src={c.image} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      c.icon
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-base font-bold text-gray-900 truncate">{c.name}</p>
                      {c.active ? (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ backgroundColor: ADMIN_COLORS.successBg, color: ADMIN_COLORS.success }}>
                          Active
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                          style={{ backgroundColor: ADMIN_COLORS.gray200, color: ADMIN_COLORS.gray500 }}>
                          Inactive
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">{c.description}</p>
                    <div className="flex items-center gap-4">
                      {(productCounts[c._id] || productCounts[c.id] || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Package size={12} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600">{productCounts[c._id] || productCounts[c.id]} products</span>
                        </div>
                      )}
                      {(c.subcategories?.length || 0) > 0 && (
                        <div className="flex items-center gap-1.5">
                          <Layers size={12} className="text-gray-400" />
                          <span className="text-xs font-semibold text-gray-600">{c.subcategories.length} subcategories</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <button onClick={() => toggle(c._id || c.id)} className="transition hover:scale-110">
                      {c.active
                        ? <ToggleRight size={24} style={{ color: ADMIN_COLORS.success }} />
                        : <ToggleLeft size={24} className="text-gray-300" />}
                    </button>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} 
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => remove(c._id || c.id)} 
                        className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subcategories expandable */}
              {c.subcategories.length > 0 && (
                <>
                  <button
                    onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                    className="w-full flex items-center justify-between px-5 py-3 text-xs font-semibold text-gray-500 hover:text-gray-700 transition border-t border-gray-100 bg-gray-50 hover:bg-gray-100">
                    <span className="flex items-center gap-2">
                      <Layers size={13} /> 
                      <span>Subcategories ({c.subcategories.length})</span>
                    </span>
                    <ChevronRight size={14} className={`transition-transform ${expanded === c.id ? "rotate-90" : ""}`} />
                  </button>
                  {expanded === c.id && (
                    <div className="px-5 pb-4 pt-3 bg-gray-50 border-t border-gray-100 max-h-[160px] overflow-y-auto">
                      <div className="flex flex-wrap gap-2">
                        {c.subcategories.map((s: any) => (
                          <span key={s.id} className="text-xs px-3 py-1.5 rounded-lg font-semibold border"
                            style={{ 
                              backgroundColor: ADMIN_COLORS.surface, 
                              color: ADMIN_COLORS.primary,
                              borderColor: ADMIN_COLORS.gray200
                            }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No categories found</p>
          <button onClick={openAdd}
            className="px-4 py-2 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
            style={{ backgroundColor: ADMIN_COLORS.primary }}>
            Add First Category
          </button>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: ADMIN_COLORS.accentLight + "20" }}>
                  <Tag size={14} style={{ color: ADMIN_COLORS.accent }} />
                </div>
                <h2 className="font-bold text-gray-900">{editId ? "Edit Category" : "Add Category"}</h2>
              </div>
              <button onClick={() => setShowForm(false)} 
                className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            {saved ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border"
                style={{ backgroundColor: ADMIN_COLORS.successBg, borderColor: ADMIN_COLORS.successBorder }}>
                <CheckCircle size={16} style={{ color: ADMIN_COLORS.success }} />
                <p className="text-sm font-bold" style={{ color: ADMIN_COLORS.success }}>Category saved successfully!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Category Name", key: "name", placeholder: "e.g. Document Printing", type: "text" },
                  { label: "Description", key: "description", placeholder: "Short description of the category", type: "text" },
                  { label: "Icon (emoji)", key: "icon", placeholder: "e.g. 📄", type: "text" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">{f.label}</label>
                    <input 
                      type={f.type}
                      placeholder={f.placeholder}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" />
                  </div>
                ))}
                
                {/* Image URL field */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/image.jpg"
                    value={form.image}
                    onChange={e => {
                      setForm(p => ({ ...p, image: e.target.value }));
                      setImagePreview(e.target.value || null);
                    }}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition"
                  />
                  {imagePreview && (
                    <div className="mt-2 relative rounded-xl overflow-hidden border border-gray-100" style={{ height: '100px' }}>
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                      />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setForm(p => ({ ...p, image: '' })); }}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <X size={11} />
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Flow Type</label>
                  <select 
                    value={form.flowType}
                    onChange={e => setForm(p => ({ ...p, flowType: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition">
                    <option value="printing">Printing</option>
                    <option value="gifting">Gifting</option>
                    <option value="shopping">Shopping</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-3">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
                    Cancel
                  </button>
                  <button onClick={save} disabled={!form.name || uploadingImage}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition hover:opacity-90"
                    style={{ backgroundColor: ADMIN_COLORS.primary }}>
                    {editId ? "Update Category" : "Create Category"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

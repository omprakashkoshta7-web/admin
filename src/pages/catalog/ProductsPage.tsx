import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Search, Edit2, Trash2, X, CheckCircle, Package, Download, RefreshCw, Upload } from "lucide-react";
import { useAsync } from "../../hooks/useAsync";
import { getProductCategories, getProducts, createProduct, updateProduct, deleteProduct } from "../../api/admin";
import { uploadImage } from "../../utils/uploadImage";

const CS = { border: "1px solid rgba(197,206,255,0.52)", boxShadow: "0 12px 30px rgba(15,23,42,0.08)" };

type Product = {
  id: string;
  name: string;
  category: string;
  basePrice: number;
  unit: string;
  active: boolean;
  vendors: number;
  imageUrl?: string;
};

const emptyForm = { name: "", categoryId: "", categoryName: "", basePrice: "", unit: "per page", description: "", flowType: "printing", imageUrl: "" };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saved, setSaved] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories and products from backend
  const { data: categoriesData, refetch: refetchCategories } = useAsync(() => getProductCategories(), null, []);
  const { data: productsData, loading: productsLoading, refetch: refetchProducts } = useAsync(() => getProducts({ limit: 100 }), null, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => { refetchCategories(); refetchProducts(); }, 30000);
    return () => clearInterval(interval);
  }, [refetchCategories, refetchProducts]);
  
  // Extract categories from backend data (API returns array directly)
  const categoriesArray = Array.isArray(categoriesData) ? categoriesData : [];
  
  // Memoize categories so the array reference is stable — prevents infinite re-render loop
  const categories = useMemo(() => categoriesArray.map((c: any) => ({
    id: c.id ?? c._id ?? (c._id ? String(c._id) : undefined) ?? c.slug,
    name: c.name,
    flowType: c.flowType,
    count: c.count,
  })), [categoriesData]); // only recompute when raw data changes
  
  // Extract products from backend data
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
      
      console.log('Processing products:', { productsData, productsArray, count: productsArray.length });
      
      if (productsArray.length > 0) {
        const productsFromBackend = productsArray.map((p: any) => {
          // Find category name from categories array
          // p.category can be an object with _id or just an ID string
          const categoryId = p.category?._id || p.category?.id || p.category;
          const categoryObj = categories.find((c: any) => 
            String(c.id) === String(categoryId)
          );
          
          return {
            id: p.id || p._id,
            name: p.name,
            category: categoryObj?.name || p.category?.name || "Unknown",
            basePrice: p.basePrice || p.mrp || 0,
            unit: p.unit || "per page",
            active: p.isActive !== false,
            vendors: 0,
            imageUrl: p.images?.[0] || p.thumbnail || "",
          };
        });
        console.log('Mapped products:', productsFromBackend);
        setProducts(productsFromBackend);
      } else {
        console.log('No products found in response');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error processing products:', error);
      setProducts([]);
    }
  }, [productsData, categories]);

  const filtered = products.filter(p =>
    (catFilter === "all" || p.category === catFilter) &&
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm(emptyForm); setEditId(null); setShowForm(true); setSaved(false); setImagePreview(null); };
  const openEdit = (p: Product) => {
    const selectedCat = categories.find((c: any) => c.name === p.category);
    setForm({ 
      name: p.name, 
      categoryId: selectedCat?.id || "",
      categoryName: p.category,
      basePrice: String(p.basePrice),
      unit: p.unit,
      description: "",
      flowType: selectedCat?.flowType || "printing",
      imageUrl: p.imageUrl || "",
    });
    setEditId(p.id); setShowForm(true); setSaved(false);
    setImagePreview(p.imageUrl || null);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Please select a valid image file'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('Image size must be less than 5MB'); return; }
    try {
      setUploadingImage(true);
      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
      // Upload to Firebase Storage
      const imageUrl = await uploadImage(file, 'products');
      setForm(prev => ({ ...prev, imageUrl }));
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const save = async () => {
    if (!form.name || !form.categoryId || !form.basePrice) {
      console.warn('Missing required fields:', { name: form.name, categoryId: form.categoryId, basePrice: form.basePrice });
      alert('Please fill in all required fields');
      return;
    }
    try {
      const payload: any = {
        name: form.name,
        category: form.categoryId,
        basePrice: parseFloat(form.basePrice),
        unit: form.unit,
        description: form.description,
        flowType: form.flowType,
        // Only send image URL if it's a real http URL (not base64) to avoid 413
        ...(form.imageUrl && form.imageUrl.startsWith('http') ? { images: [form.imageUrl], thumbnail: form.imageUrl } : {}),
      };

      // Ensure flowType matches the selected category's flowType (server requires this)
      const selectedCat = categories.find((c: any) => c.id === form.categoryId);
      if (selectedCat && selectedCat.flowType) {
        let ft = selectedCat.flowType;
        // backend product validator accepts only 'printing', 'gifting', 'shopping'
        // map internal 'business_printing' category to 'printing' for product payload
        if (ft === 'business_printing') ft = 'printing';
        payload.flowType = ft;
      }

      // Remove empty description to satisfy backend Joi validation
      if (typeof payload.description === 'string' && payload.description.trim().length === 0) {
        delete payload.description;
      }

      // If basePrice couldn't be parsed, abort early
      if (Number.isNaN(payload.basePrice)) {
        console.error('Invalid basePrice, aborting save:', form.basePrice);
        alert('Invalid base price');
        return;
      }

      console.log('Creating/updating product payload:', payload);
      console.log('categoryId details:', {
        raw: form.categoryId,
        type: typeof form.categoryId,
        length: form.categoryId ? String(form.categoryId).length : 0,
      });

      if (editId) {
        const updated: any = await updateProduct(editId, payload);
        console.log('Product updated:', updated);
        setProducts(prev => prev.map(p => p.id === editId ? ({
          id: updated.id ?? updated._id ?? editId,
          name: updated.name ?? payload.name,
          category: categories.find((c: any) => c.id === payload.category)?.name || form.categoryName,
          basePrice: updated.basePrice ?? payload.basePrice,
          unit: updated.unit ?? payload.unit,
          active: updated.active !== false,
          vendors: updated.vendors ?? 0,
        }) : p));
      } else {
        const created: any = await createProduct(payload);
        console.log('Product created:', created);
        const newProd = {
          id: created.id ?? created._id ?? `P-${Math.random()}`,
          name: created.name ?? payload.name,
          category: categories.find((c: any) => c.id === payload.category)?.name || form.categoryName,
          basePrice: created.basePrice ?? payload.basePrice,
          unit: created.unit ?? payload.unit ?? 'per page',
          active: created.active !== false,
          vendors: created.vendors ?? 0,
        };
        setProducts(prev => [newProd, ...prev]);
      }

      setSaved(true);
      // close modal and refresh categories/products in background
      setTimeout(() => {
        setShowForm(false);
        setSaved(false);
        // Refetch to ensure we have latest data from server
        refetchCategories();
        refetchProducts();
      }, 1500);
    } catch (error) {
      console.error('Failed to save product:', error);
      console.error('Server validation errors:', (error as any)?.errors ?? null);
      alert(`Error: ${(error as any)?.message || 'Failed to save product'}`);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      refetchProducts();
    } catch (error) {
      console.error('Failed to delete product:', error);
      alert(`Error: ${(error as any)?.message || 'Failed to delete product'}`);
    }
  };

  const exportProducts = () => {
    const csvContent = [
      ['ID', 'Name', 'Category', 'Base Price', 'Unit', 'Active'].join(','),
      ...products.map((p: Product) => [
        p.id,
        `"${(p.name || '').replace(/"/g, '""')}"`,
        `"${(p.category || '').replace(/"/g, '""')}"`,
        p.basePrice,
        `"${(p.unit || '').replace(/"/g, '""')}"`,
        p.active ? 'Yes' : 'No',
      ].join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-8 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button key="all" onClick={() => setCatFilter("all")}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition"
            style={{
              backgroundColor: catFilter === "all" ? "#334155" : "#fff",
              color: catFilter === "all" ? "#fff" : "#64748b",
              border: `1px solid ${catFilter === "all" ? "#334155" : "#e2e8f0"}`,
            }}>All</button>
          {categories.map((c: any) => (
            <button key={c.id} onClick={() => setCatFilter(c.name)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition"
              style={{
                backgroundColor: catFilter === c.name ? "#334155" : "#fff",
                color: catFilter === c.name ? "#fff" : "#64748b",
                border: `1px solid ${catFilter === c.name ? "#334155" : "#e2e8f0"}`,
              }}>
              <span>{c.name}</span>
              <span style={{ marginLeft: 8, background: catFilter === c.name ? 'rgba(255,255,255,0.12)' : '#f1f5f9', color: catFilter === c.name ? '#fff' : '#475569', padding: '2px 6px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{c.count}</span>
            </button>
          ))}
        </div>
        <button onClick={openAdd}
          className="ml-auto flex items-center gap-1.5 px-4 py-2 text-white text-sm font-bold rounded-xl"
          style={{ backgroundColor: "#334155" }}>
          <Plus size={14} /> Add Product
        </button>
        <button
          onClick={exportProducts}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <Download size={14} />
          Export
        </button>
        <button
          onClick={() => refetchProducts()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 hover:border-gray-900 transition text-sm font-semibold"
        >
          <RefreshCw size={14} className={productsLoading ? "animate-spin" : ""} />
          {productsLoading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        {[
          { label: "Total Products", value: products.length, color: "#334155", note: "All categories" },
          { label: "Active", value: products.filter(p => p.active).length, color: "#10b981", note: "Live on platform" },
          { label: "Inactive", value: products.filter(p => !p.active).length, color: "#94a3b8", note: "Hidden from users" },
        ].map((s, idx) => (
          <div key={s.label} className="rounded-xl p-5 flex-1"
            style={idx === 0
              ? { background: "linear-gradient(135deg, #1e293b, #0f172a)", boxShadow: "0 12px 28px rgba(15,23,42,0.3)", position: "relative", overflow: "hidden" }
              : { ...CS, backgroundColor: "#fff" }}>
            {idx === 0 && <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)", backgroundSize: "14px 14px" }} />}
            <div className="relative flex items-start justify-between mb-2">
              <p className={`text-2xl font-black ${idx === 0 ? "text-white" : ""}`}
                style={idx !== 0 ? { color: s.color } : {}}>{s.value}</p>
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                
                style={{ backgroundColor: idx === 0 ? "rgba(255,255,255,0.15)" : `${s.color}18` }}>
                <Package size={12} style={{ color: idx === 0 ? "#fff" : s.color }} />
              </div>
            </div>
            <p className={`relative text-xs font-semibold ${idx === 0 ? "text-white/70" : "text-gray-700"}`}>{s.label}</p>
            <p className={`relative text-xs ${idx === 0 ? "text-white/40" : "text-gray-400"}`}>{s.note}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={CS}>
        <div className="overflow-x-auto">
        <table className="w-full admin-responsive-table min-w-[800px] lg:min-w-0">
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(197,206,255,0.4)", backgroundColor: "rgba(248,249,255,0.78)" }}>
              {["Product", "Category", "Base Price", "Vendors", "Status", ""].map(h => (
                <th key={h} className="text-left text-xs font-bold text-gray-400 uppercase tracking-wide px-4 py-2">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length > 0 ? (
              filtered.map((p, i) => (
                <tr key={p.id} className="hover-row"
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(197,206,255,0.2)" : "none" }}>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden"
                        style={{ backgroundColor: "#f1f5f9" }}>
                        {p.imageUrl
                          ? <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                          : <Package size={13} style={{ color: "#334155" }} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{p.name}</p>
                        <p className="text-xs text-gray-400">{p.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p.category}</span>
                  </td>
                  <td className="px-4 py-2.5 text-sm font-bold text-gray-900">₹{p.basePrice} <span className="text-xs font-normal text-gray-400">{p.unit}</span></td>
                  <td className="px-4 py-2.5 text-xs text-gray-500">{p.vendors} vendors</td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                      p.active ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    }`}>
                      {p.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => remove(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12">
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <p className="text-sm font-semibold text-gray-500">
                      {products.length === 0 ? "No products available. Add your first product to get started." : "No products match your search criteria."}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showForm && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900">{editId ? "Edit Product" : "Add Product"}</h2>
              <button onClick={() => setShowForm(false)}><X size={18} className="text-gray-400" /></button>
            </div>
            {saved ? (
              <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-100">
                <CheckCircle size={16} className="text-green-600" />
                <p className="text-sm font-bold text-green-800">Product saved successfully.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { label: "Product Name", key: "name", type: "text", placeholder: "e.g. Color Print" },
                  { label: "Base Price (₹)", key: "basePrice", type: "number", placeholder: "e.g. 5" },
                  { label: "Unit", key: "unit", type: "text", placeholder: "e.g. per page" },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder}
                      value={form[f.key as keyof typeof form]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Product Image</label>
                  {imagePreview && (
                    <div className="mb-2 relative rounded-xl overflow-hidden border border-gray-100" style={{ height: '120px' }}>
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => { setImagePreview(null); setForm(p => ({ ...p, imageUrl: '' })); }}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-gray-200 text-sm font-semibold text-gray-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600 transition disabled:opacity-50"
                  >
                    <Upload size={14} />
                    {uploadingImage ? 'Uploading...' : (imagePreview ? 'Change Image' : 'Upload Image')}
                  </button>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wide">Category</label>
                  <select value={form.categoryId} onChange={e => {
                    const selectedCat = categories.find((c: any) => c.id === e.target.value);
                    setForm(p => ({ ...p, categoryId: e.target.value, categoryName: selectedCat?.name || "", flowType: selectedCat?.flowType || p.flowType || 'printing' }));
                  }}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none">
                    <option value="">Select category</option>
                    {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600">Cancel</button>
                  <button onClick={save} disabled={!form.name || !form.categoryId || !form.basePrice}
                    className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40"
                    style={{ backgroundColor: "#334155" }}>Save Product</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

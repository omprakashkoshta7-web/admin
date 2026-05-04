import { useState, useEffect, useRef } from "react";
import { Plus, Edit2, Trash2, X, CheckCircle, Layers, ToggleLeft, ToggleRight, ChevronRight, Tag, Package, Upload, Image as ImageIcon, Download, RefreshCw } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";
import { useAsync } from "../../hooks/useAsync";
import { getProductCategories, createProductCategory, updateProductCategory, deleteProductCategory, getProducts } from "../../api/admin";
import type { AdminCategoriesResponse } from "../../api/admin";
import LoadingState from "../../components/ui/LoadingState";
import { uploadImage } from "../../utils/uploadImage";

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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    setShowCanvas(false);
  };
  
  const openEdit = (c: any) => {
    setForm({ name: c.name, slug: c.slug, description: c.description, icon: c.icon, image: c.image || "", flowType: c.flowType });
    setEditId(c._id || c.id); 
    setShowForm(true); 
    setSaved(false);
    setImagePreview(c.image || null);
    setShowCanvas(false);
  };

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);

      // Show local preview immediately
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload to Firebase Storage
      const imageUrl = await uploadImage(file, 'categories');
      setForm(prev => ({ ...prev, image: imageUrl }));
      setImagePreview(imageUrl);
    } catch (error) {
      console.error('Image upload failed:', error);
      alert('Failed to upload image. Please try again.');
      setImagePreview(null);
    } finally {
      setUploadingImage(false);
    }
  };

  // Open canvas editor
  const openCanvasEditor = () => {
    setShowCanvas(true);
  };

  // Save canvas as base64 — no backend needed
  const saveCanvasImage = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    setForm(prev => ({ ...prev, image: dataUrl }));
    setImagePreview(dataUrl);
    setShowCanvas(false);
  };

  // Canvas drawing functionality
  useEffect(() => {
    if (!showCanvas || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize canvas with white background
    canvas.width = 500;
    canvas.height = 400;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Restore existing image if any
    if (imagePreview) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      img.src = imagePreview;
    }

    let isDrawing = false;
    let lastX = 0;
    let lastY = 0;

    const startDrawing = (e: MouseEvent) => {
      isDrawing = true;
      [lastX, lastY] = [e.offsetX, e.offsetY];
    };

    const draw = (e: MouseEvent) => {
      if (!isDrawing) return;

      const isEraser = (canvas as any)._eraser === true;
      const color = (canvas as any)._brushColor || '#000000';
      const size = (canvas as any)._brushSize || 4;

      ctx.strokeStyle = isEraser ? '#ffffff' : color;
      ctx.lineWidth = isEraser ? size * 3 : size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(e.offsetX, e.offsetY);
      ctx.stroke();
      
      [lastX, lastY] = [e.offsetX, e.offsetY];
    };

    const stopDrawing = () => {
      isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseout', stopDrawing);
    };
  }, [showCanvas]);

  const save = async () => {
    if (!form.name) {
      alert('Please enter a category name');
      return;
    }
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-");
    
    try {
      setLoading(true);
      console.log('Saving category:', { ...form, slug });
      
      if (editId) {
        const updated = await updateProductCategory(editId, { ...form, slug });
        console.log('Category updated:', updated);
      } else {
        const created = await createProductCategory({ ...form, slug });
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
                
                {/* Image Upload Section */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Category Image</label>
                  
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="mb-3 relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-48 object-cover rounded-xl border border-gray-200"
                      />
                      <button
                        onClick={() => {
                          setImagePreview(null);
                          setForm(prev => ({ ...prev, image: '' }));
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  
                  {/* Upload Buttons */}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      <Upload size={14} />
                      {uploadingImage ? 'Uploading...' : 'Upload Image'}
                    </button>
                    <button
                      type="button"
                      onClick={openCanvasEditor}
                      disabled={uploadingImage}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
                    >
                      <ImageIcon size={14} />
                      Draw Image
                    </button>
                  </div>
                  
                  {/* Or manual URL input */}
                  <div className="mt-2">
                    <input 
                      type="text"
                      placeholder="Or paste image URL"
                      value={form.image}
                      onChange={e => {
                        setForm(p => ({ ...p, image: e.target.value }));
                        if (e.target.value) {
                          setImagePreview(e.target.value);
                        }
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-gray-900 transition" 
                    />
                  </div>
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

      {/* Canvas Editor Modal */}
      {showCanvas && (
        <div className="admin-modal-overlay">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                  style={{ backgroundColor: ADMIN_COLORS.accentLight + "20" }}>
                  <ImageIcon size={14} style={{ color: ADMIN_COLORS.accent }} />
                </div>
                <h2 className="font-bold text-gray-900">Draw Category Image</h2>
              </div>
              <button onClick={() => setShowCanvas(false)} 
                className="p-1.5 rounded-lg hover:bg-gray-100 transition">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Canvas */}
              <div className="flex justify-center bg-gray-50 rounded-xl p-2">
                <canvas
                  ref={canvasRef}
                  className="border-2 border-gray-300 rounded-xl cursor-crosshair"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>

              {/* Canvas Toolbar */}
              <div className="flex items-center gap-3 flex-wrap bg-gray-50 rounded-xl p-3">
                {/* Brush color */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600">Color</label>
                  <input
                    type="color"
                    defaultValue="#000000"
                    className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                    onChange={(e) => {
                      if (canvasRef.current) (canvasRef.current as any)._brushColor = e.target.value;
                    }}
                  />
                </div>

                {/* Brush size */}
                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-gray-600">Size</label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    defaultValue="4"
                    className="w-24"
                    onChange={(e) => {
                      if (canvasRef.current) (canvasRef.current as any)._brushSize = Number(e.target.value);
                    }}
                  />
                </div>

                {/* Eraser toggle */}
                <button
                  type="button"
                  onClick={(e) => {
                    if (!canvasRef.current) return;
                    const canvas = canvasRef.current as any;
                    canvas._eraser = !canvas._eraser;
                    const btn = e.currentTarget;
                    btn.textContent = canvas._eraser ? '✏️ Draw' : '🧹 Eraser';
                    btn.classList.toggle('bg-yellow-100', canvas._eraser);
                    btn.classList.toggle('border-yellow-300', canvas._eraser);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  🧹 Eraser
                </button>

                {/* Clear */}
                <button
                  type="button"
                  onClick={() => {
                    if (!canvasRef.current) return;
                    const ctx = canvasRef.current.getContext('2d');
                    if (ctx) {
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  🗑️ Clear
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center">
                Click and drag to draw. No backend upload needed — image saves directly.
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCanvas(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveCanvasImage}
                  className="flex-1 py-2.5 text-white text-sm font-bold rounded-xl transition hover:opacity-90"
                  style={{ backgroundColor: ADMIN_COLORS.primary }}
                >
                  Use This Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

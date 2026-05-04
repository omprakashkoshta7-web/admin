import React, { useState, useEffect } from 'react';
import { Upload, Image as ImageIcon, Trash2, Edit2, Search, Filter, X } from 'lucide-react';

interface ImageItem {
  _id: string;
  url: string;
  name: string;
  category: string;
  size: number;
  uploadedAt: string;
  uploadedBy: string;
  alt?: string;
  tags?: string[];
}

const ImagesPage: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingImage, setEditingImage] = useState<ImageItem | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string>('');
  const [uploadData, setUploadData] = useState({
    name: '',
    category: 'banner',
    alt: '',
    tags: '',
  });

  const categories = [
    { value: 'all', label: 'All Images' },
    { value: 'banner', label: 'Banners' },
    { value: 'product', label: 'Products' },
    { value: 'frame', label: 'Frames' },
    { value: 'template', label: 'Templates' },
    { value: 'icon', label: 'Icons' },
    { value: 'other', label: 'Other' },
  ];

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      setLoading(true);
      // Mock data - replace with actual API call
      const mockImages: ImageItem[] = [
        {
          _id: '1',
          url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=400',
          name: 'Hero Banner 1',
          category: 'banner',
          size: 245000,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Admin',
          alt: 'Hero banner showing printing services',
          tags: ['hero', 'banner', 'main'],
        },
        {
          _id: '2',
          url: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400',
          name: 'Product Image 1',
          category: 'product',
          size: 180000,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Admin',
          alt: 'Business cards product',
          tags: ['product', 'business-cards'],
        },
        {
          _id: '3',
          url: 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=400',
          name: 'Frame Design 1',
          category: 'frame',
          size: 320000,
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'Admin',
          alt: 'Decorative frame design',
          tags: ['frame', 'design', 'decorative'],
        },
      ];
      setImages(mockImages);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setUploadData({ ...uploadData, name: file.name.split('.')[0] });
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setUploadPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async () => {
    if (!uploadFile) return;

    try {
      // Mock upload - replace with actual API call
      const newImage: ImageItem = {
        _id: Date.now().toString(),
        url: uploadPreview,
        name: uploadData.name,
        category: uploadData.category,
        size: uploadFile.size,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'Admin',
        alt: uploadData.alt,
        tags: uploadData.tags.split(',').map(t => t.trim()).filter(Boolean),
      };

      setImages([newImage, ...images]);
      setShowUploadModal(false);
      resetUploadForm();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload image');
    }
  };

  const handleEdit = (image: ImageItem) => {
    setEditingImage(image);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingImage) return;

    try {
      // Mock update - replace with actual API call
      setImages(images.map(img => 
        img._id === editingImage._id ? editingImage : img
      ));
      setShowEditModal(false);
      setEditingImage(null);
    } catch (error) {
      console.error('Update failed:', error);
      alert('Failed to update image');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this image?')) return;

    try {
      // Mock delete - replace with actual API call
      setImages(images.filter(img => img._id !== id));
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete image');
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadPreview('');
    setUploadData({
      name: '',
      category: 'banner',
      alt: '',
      tags: '',
    });
  };

  const filteredImages = images.filter(img => {
    const matchesSearch = img.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         img.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || img.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-6">


      {/* Filters and Actions */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search images by name or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Stats Badge */}
            <span className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium">
              <ImageIcon className="w-4 h-4" />
              {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
            </span>

            {/* Upload Button */}
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:bg-indigo-800 transition font-semibold text-sm shadow-sm"
            >
              <Upload className="w-4 h-4" />
              Upload Image
            </button>
          </div>
        </div>
      </div>

      {/* Images Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-indigo-600 border-t-transparent"></div>
            <p className="text-sm text-slate-500 font-medium">Loading images...</p>
          </div>
        </div>
      ) : filteredImages.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mb-4">
            <ImageIcon className="w-8 h-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1">No images found</h3>
          <p className="text-slate-500 text-sm mb-5">Upload your first image to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-semibold text-sm"
          >
            <Upload className="w-4 h-4" />
            Upload Image
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredImages.map(image => (
            <div key={image._id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
              {/* Image Preview */}
              <div className="aspect-video bg-slate-100 relative">
                <img
                  src={image.url}
                  alt={image.alt || image.name}
                  className="w-full h-full object-cover"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-end justify-between p-3">
                  <span className="text-white text-xs font-semibold truncate">{image.name}</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => handleEdit(image)}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-white transition shadow-sm"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                    <button
                      onClick={() => handleDelete(image._id)}
                      className="p-1.5 bg-white/90 backdrop-blur-sm rounded-lg hover:bg-red-50 transition shadow-sm"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </button>
                  </div>
                </div>
                {/* Category badge */}
                <div className="absolute top-2 left-2">
                  <span className="px-2 py-0.5 bg-black/50 backdrop-blur-sm text-white text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    {image.category}
                  </span>
                </div>
              </div>

              {/* Image Info */}
              <div className="p-3.5">
                <h3 className="font-semibold text-slate-900 text-sm truncate mb-2">{image.name}</h3>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs text-slate-400">{formatFileSize(image.size)}</span>
                  <span className="text-xs text-slate-400">{new Date(image.uploadedAt).toLocaleDateString()}</span>
                </div>
                {image.tags && image.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {image.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full font-medium">
                        {tag}
                      </span>
                    ))}
                    {image.tags.length > 3 && (
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
                        +{image.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-50 rounded-xl">
                    <Upload className="w-5 h-5 text-indigo-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Upload Image</h2>
                </div>
                <button
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* File Upload Area */}
              <div className="mb-5">
                {uploadPreview ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <img src={uploadPreview} alt="Preview" className="w-full h-56 object-cover" />
                    <button
                      onClick={() => { setUploadFile(null); setUploadPreview(''); }}
                      className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-lg shadow hover:bg-white transition"
                    >
                      <X className="w-4 h-4 text-slate-700" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-52 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-all group">
                    <div className="p-3 bg-slate-100 group-hover:bg-indigo-100 rounded-xl mb-3 transition">
                      <Upload className="w-7 h-7 text-slate-400 group-hover:text-indigo-500 transition" />
                    </div>
                    <p className="text-slate-600 font-medium text-sm mb-1">Click to upload or drag and drop</p>
                    <p className="text-xs text-slate-400">PNG, JPG, GIF up to 10MB</p>
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                  </label>
                )}
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Image Name *</label>
                  <input
                    type="text"
                    value={uploadData.name}
                    onChange={(e) => setUploadData({ ...uploadData, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                    placeholder="Enter image name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                  <select
                    value={uploadData.category}
                    onChange={(e) => setUploadData({ ...uploadData, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  >
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alt Text</label>
                  <input
                    type="text"
                    value={uploadData.alt}
                    onChange={(e) => setUploadData({ ...uploadData, alt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                    placeholder="Describe the image for accessibility"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tags <span className="font-normal text-slate-400">(comma separated)</span></label>
                  <input
                    type="text"
                    value={uploadData.tags}
                    onChange={(e) => setUploadData({ ...uploadData, tags: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                    placeholder="e.g., banner, hero, main"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowUploadModal(false); resetUploadForm(); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!uploadFile || !uploadData.name}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                >
                  Upload Image
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingImage && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-50 rounded-xl">
                    <Edit2 className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900">Edit Image</h2>
                </div>
                <button
                  onClick={() => { setShowEditModal(false); setEditingImage(null); }}
                  className="p-2 hover:bg-slate-100 rounded-xl transition text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Image Preview */}
              <div className="mb-5 rounded-xl overflow-hidden">
                <img
                  src={editingImage.url}
                  alt={editingImage.alt || editingImage.name}
                  className="w-full h-56 object-cover"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Image Name *</label>
                  <input
                    type="text"
                    value={editingImage.name}
                    onChange={(e) => setEditingImage({ ...editingImage, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category *</label>
                  <select
                    value={editingImage.category}
                    onChange={(e) => setEditingImage({ ...editingImage, category: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  >
                    {categories.filter(c => c.value !== 'all').map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Alt Text</label>
                  <input
                    type="text"
                    value={editingImage.alt || ''}
                    onChange={(e) => setEditingImage({ ...editingImage, alt: e.target.value })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tags <span className="font-normal text-slate-400">(comma separated)</span></label>
                  <input
                    type="text"
                    value={editingImage.tags?.join(', ') || ''}
                    onChange={(e) => setEditingImage({
                      ...editingImage,
                      tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                    })}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => { setShowEditModal(false); setEditingImage(null); }}
                  className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImagesPage;

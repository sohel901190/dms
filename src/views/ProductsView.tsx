import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowUpDown,
  Tag,
  DollarSign,
  TrendingUp,
  Image,
  Upload,
  Layers,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeProducts,
  subscribeCategories,
  saveProduct,
  deleteProduct,
  adjustProductStock,
  addCategory,
} from '../services/dbService';
import { uploadImage } from '../services/storageService';
import { Product, ProductCategory } from '../types';

export const ProductsView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);

  // Add/Edit Product Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Stock Adjustment Modal State
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'adjustment_in' | 'adjustment_out' | 'damage'>('adjustment_in');
  const [adjustReason, setAdjustReason] = useState<string>('Stock audit update');

  // Category Manager Modal State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeCategories(activeBusiness.id, setCategories);
    return () => {
      u1();
      u2();
    };
  }, [activeBusiness?.id]);

  // Open modal to add new product
  const handleOpenAddModal = () => {
    setEditingProduct({
      name: '',
      sku: 'SKU-' + Date.now().toString().slice(-6),
      barcode: '',
      categoryId: categories[0]?.id || '',
      categoryName: categories[0]?.name || 'General',
      unit: 'pcs',
      purchasePrice: 0,
      sellingPrice: 0,
      currentStock: 0,
      openingStock: 0,
      alertStock: 5,
      imageUrl: '',
      notes: '',
    });
    setImageFile(null);
    setImagePreview('');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Open modal to edit existing product
  const handleOpenEditModal = (prod: Product) => {
    setEditingProduct({ ...prod });
    setImageFile(null);
    setImagePreview(prod.imageUrl || '');
    setModalError(null);
    setIsEditModalOpen(true);
  };

  // Handle Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !editingProduct || !editingProduct.name) return;

    setModalLoading(true);
    setModalError(null);

    try {
      let finalImageUrl = editingProduct.imageUrl || '';

      if (imageFile) {
        const uploadRes = await uploadImage(imageFile, `businesses/${activeBusiness.id}/products`);
        if (uploadRes.success && uploadRes.url) {
          finalImageUrl = uploadRes.url;
        }
      }

      const categoryObj = categories.find((c) => c.id === editingProduct.categoryId);

      await saveProduct(
        activeBusiness.id,
        {
          ...editingProduct,
          categoryName: categoryObj?.name || editingProduct.categoryName || 'General',
          imageUrl: finalImageUrl,
        },
        !editingProduct.id
      );

      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (err: any) {
      setModalError(err?.message || 'Failed to save product');
    } finally {
      setModalLoading(false);
    }
  };

  // Delete product
  const handleDeleteProduct = async (id: string, name: string) => {
    if (!activeBusiness) return;
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      await deleteProduct(activeBusiness.id, id);
    }
  };

  // Handle Stock Adjustment
  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !adjustingProduct || !currentUser) return;

    try {
      const multiplier = adjustType === 'adjustment_in' ? 1 : -1;
      await adjustProductStock(
        activeBusiness.id,
        adjustingProduct.id,
        adjustQty * multiplier,
        adjustReason,
        currentUser.uid,
        adjustType
      );
      setIsAdjustModalOpen(false);
      setAdjustingProduct(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to adjust stock');
    }
  };

  // Handle New Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !newCatName.trim()) return;
    try {
      await addCategory(activeBusiness.id, newCatName.trim());
      setNewCatName('');
      setIsCatModalOpen(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to add category');
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory =
        selectedCategoryFilter === 'all' || p.categoryId === selectedCategoryFilter;
      const matchLowStock = !showLowStockOnly || p.currentStock <= (p.alertStock || 5);
      return matchSearch && matchCategory && matchLowStock;
    });
  }, [products, searchTerm, selectedCategoryFilter, showLowStockOnly]);

  // Overall Inventory Stats
  const totalStockCount = products.reduce((acc, p) => acc + (p.currentStock || 0), 0);
  const totalValuation = products.reduce(
    (acc, p) => acc + (p.currentStock || 0) * (p.purchasePrice || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header and Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Products & Stock Control</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Catalog inventory, SKU tracking, pricing, and stock movements
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>Categories</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </button>
        </div>
      </div>

      {/* Mini Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Unique Items</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{products.length} Products</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Units in Stock</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{totalStockCount} Units</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total Inventory Valuation (Cost)</p>
          <p className="text-xl font-bold text-sky-700 mt-1">{formatMoney(totalValuation)}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search product name, SKU, or barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
              showLowStockOnly
                ? 'bg-amber-100 border-amber-300 text-amber-800'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock Alerts</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4 text-right">Cost Price</th>
                <th className="py-3 px-4 text-right">Selling Price</th>
                <th className="py-3 px-4 text-right">Margin</th>
                <th className="py-3 px-4 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Valuation</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.map((p) => {
                const margin = p.sellingPrice - p.purchasePrice;
                const marginPercent = p.sellingPrice > 0 ? ((margin / p.sellingPrice) * 100).toFixed(0) : '0';
                const isLow = p.currentStock <= (p.alertStock || 5);

                return (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-10 h-10 object-cover rounded-lg border border-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xs">
                            {p.name[0]}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{p.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                            <span>SKU: {p.sku}</span>
                            {p.barcode && <span>• Barcode: {p.barcode}</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-medium">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md text-[11px]">
                        {p.categoryName || 'General'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-600">
                      {formatMoney(p.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-900">
                      {formatMoney(p.sellingPrice)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-emerald-600 font-semibold text-[11px]">
                        +{formatMoney(margin)} ({marginPercent}%)
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md ${
                          isLow
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-800'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                        {isLow && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">
                      {formatMoney(p.currentStock * p.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustingProduct(p);
                            setAdjustQty(1);
                            setIsAdjustModalOpen(true);
                          }}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition"
                          title="Stock Adjustment (+/-)"
                        >
                          <ArrowUpDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id, p.name)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition"
                          title="Delete Product"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    No products found. Click "Add New Product" to populate your inventory catalogue.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-slate-900">
                {editingProduct.id ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {modalError}
                </div>
              )}

              {/* Product Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Basmati Rice 5kg or Wireless Mouse"
                  value={editingProduct.name || ''}
                  onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">SKU Code</label>
                  <input
                    type="text"
                    value={editingProduct.sku || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Barcode / EAN</label>
                  <input
                    type="text"
                    value={editingProduct.barcode || ''}
                    onChange={(e) => setEditingProduct({ ...editingProduct, barcode: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
              </div>

              {/* Category & Unit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={editingProduct.categoryId || ''}
                    onChange={(e) => {
                      const c = categories.find((cat) => cat.id === e.target.value);
                      setEditingProduct({
                        ...editingProduct,
                        categoryId: e.target.value,
                        categoryName: c?.name || 'General',
                      });
                    }}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  >
                    <option value="">-- General Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="pcs, kg, box, liter, meter..."
                    value={editingProduct.unit || 'pcs'}
                    onChange={(e) => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Purchase Cost ({activeBusiness?.currencySymbol || '৳'})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editingProduct.purchasePrice ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        purchasePrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Selling Price ({activeBusiness?.currencySymbol || '৳'})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editingProduct.sellingPrice ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        sellingPrice: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Stocks */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    {editingProduct.id ? 'Current Stock' : 'Opening Stock'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.currentStock ?? 0}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        currentStock: parseInt(e.target.value) || 0,
                        openingStock: editingProduct.id
                          ? editingProduct.openingStock
                          : parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Low-Stock Alert Level</label>
                  <input
                    type="number"
                    min="0"
                    value={editingProduct.alertStock ?? 5}
                    onChange={(e) =>
                      setEditingProduct({
                        ...editingProduct,
                        alertStock: parseInt(e.target.value) || 5,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              {/* Product Image */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product Photo</label>
                <div className="flex items-center gap-3">
                  {imagePreview && (
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-12 h-12 object-cover rounded-lg border border-slate-200"
                    />
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        const file = e.target.files[0];
                        setImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK ADJUSTMENT MODAL */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                Stock Adjustment: {adjustingProduct.name}
              </h2>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="p-5 space-y-4">
              <div className="bg-sky-50 p-3 rounded-xl text-xs text-sky-800 flex justify-between">
                <span>Current Stock:</span>
                <span className="font-bold">
                  {adjustingProduct.currentStock} {adjustingProduct.unit}
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="adjustment_in">Stock-In (+) Add Stock</option>
                  <option value="adjustment_out">Stock-Out (-) Reduce Stock</option>
                  <option value="damage">Damaged Stock (-) Write-off</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Reason / Audit Note</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Apply Stock Change
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Manage Categories</h2>
              <button
                onClick={() => setIsCatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <form onSubmit={handleCreateCategory} className="flex gap-2">
                <input
                  type="text"
                  placeholder="New category name..."
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="flex-1 text-xs p-2 border border-slate-200 rounded-xl"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-sky-600 text-white rounded-xl text-xs font-semibold"
                >
                  Add
                </button>
              </form>

              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {categories.map((c) => (
                  <div
                    key={c.id}
                    className="p-2 bg-slate-50 rounded-lg text-xs font-medium text-slate-700 border border-slate-100 flex items-center justify-between"
                  >
                    <span>{c.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

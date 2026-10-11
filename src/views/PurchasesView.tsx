import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  Plus,
  Trash2,
  Search,
  Download,
  AlertCircle,
  FileText,
  Building,
  Printer,
  Calendar,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeProducts,
  subscribeSuppliers,
  subscribeAccounts,
  subscribePurchases,
  recordPurchase,
  saveSupplier,
} from '../services/dbService';
import { Product, Supplier, FinancialAccount, Purchase, PurchaseItem } from '../types';

export const PurchasesView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeSuppliers(activeBusiness.id, setSuppliers);
    const u3 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u4 = subscribePurchases(activeBusiness.id, setPurchases);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [activeBusiness?.id]);

  // New Purchase Bill Form State
  const [showBillForm, setShowBillForm] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [cartItems, setCartItems] = useState<PurchaseItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [itemCost, setItemCost] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'credit'>('cash');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [billDate, setBillDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search in bills history
  const [searchTerm, setSearchTerm] = useState('');

  // Auto select default account
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isDefault || a.type === 'cash') || accounts[0];
      setSelectedAccountId(def.id);
    }
  }, [accounts]);

  // When product is selected in bill item row, prefill purchasePrice
  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((prod) => prod.id === selectedProductId);
      if (p) setItemCost(p.purchasePrice || 0);
    }
  }, [selectedProductId, products]);

  // Add Item to Bill
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    if (itemQty <= 0) {
      setErrorMsg('Quantity must be greater than 0.');
      return;
    }

    const newItem: PurchaseItem = {
      productId: product.id,
      productName: product.name,
      sku: product.sku,
      unit: product.unit,
      quantity: itemQty,
      purchasePrice: itemCost,
      total: itemQty * itemCost,
    };

    setCartItems([...cartItems, newItem]);
    setSelectedProductId('');
    setItemQty(1);
    setItemCost(0);
    setErrorMsg(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.total, 0);
  }, [cartItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const calculatedDue = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setPaidAmount(grandTotal);
    } else {
      setPaidAmount(0);
    }
  }, [grandTotal, paymentMethod]);

  // Submit Purchase
  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser) return;

    if (cartItems.length === 0) {
      setErrorMsg('Add at least one item to the purchase bill.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let supId = selectedSupplierId;
      let supName = 'General Vendor';
      let supPhone = '';

      if (selectedSupplierId) {
        const found = suppliers.find((s) => s.id === selectedSupplierId);
        if (found) {
          supName = found.name;
          supPhone = found.phone || '';
        }
      } else if (newSupplierName.trim()) {
        supId = await saveSupplier(activeBusiness.id, {
          name: newSupplierName.trim(),
          phone: newSupplierPhone.trim(),
        });
        supName = newSupplierName.trim();
        supPhone = newSupplierPhone.trim();
      }

      const billNumber = 'BILL-' + Date.now().toString().slice(-6);
      const acc = accounts.find((a) => a.id === selectedAccountId);

      let status: Purchase['status'] = 'paid';
      if (paidAmount === 0) status = 'due';
      else if (paidAmount < grandTotal) status = 'partial';

      const purchasePayload: Omit<Purchase, 'id' | 'createdAt'> = {
        businessId: activeBusiness.id,
        billNumber,
        supplierId: supId || undefined,
        supplierName: supName,
        supplierPhone: supPhone || undefined,
        items: cartItems,
        subtotal,
        discount: discountAmount,
        totalAmount: grandTotal,
        paidAmount,
        dueAmount: calculatedDue,
        paymentMethod,
        accountId: paidAmount > 0 ? selectedAccountId : undefined,
        accountName: paidAmount > 0 ? acc?.name : undefined,
        status,
        notes: notes.trim() || undefined,
        date: billDate,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Staff',
      };

      await recordPurchase(activeBusiness.id, purchasePayload);

      // Reset
      setCartItems([]);
      setSelectedSupplierId('');
      setNewSupplierName('');
      setNewSupplierPhone('');
      setDiscountAmount(0);
      setNotes('');
      setShowBillForm(false);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record purchase bill.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPurchases = useMemo(() => {
    return purchases.filter(
      (p) =>
        p.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.supplierName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [purchases, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Purchases & Supply Chain</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Record supplier bills, restock products, and manage payables
          </p>
        </div>

        <button
          onClick={() => setShowBillForm(!showBillForm)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
        >
          {showBillForm ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          <span>{showBillForm ? 'View Purchase Bills' : 'New Purchase Bill'}</span>
        </button>
      </div>

      {/* NEW PURCHASE BILL CREATOR */}
      {showBillForm && (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-md p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">New Purchase Bill</h2>
            </div>
            <button
              onClick={() => setShowBillForm(false)}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 mb-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Items & Line Items */}
            <div className="lg:col-span-2 space-y-4">
              <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">Add Items to Receive</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-5">
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    >
                      <option value="">-- Select Product --</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} (Stock: {p.currentStock} {p.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Unit Cost ({activeBusiness?.currencySymbol || '৳'})</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={itemCost}
                      onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Qty</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-2 text-right">Unit Cost</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">{item.productName}</td>
                        <td className="py-2.5 px-2 text-right text-slate-600">{formatMoney(item.purchasePrice)}</td>
                        <td className="py-2.5 px-2 text-center font-bold">{item.quantity}</td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">{formatMoney(item.total)}</td>
                        <td className="py-2.5 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveFromCart(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    {cartItems.length === 0 && (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-slate-400 text-xs">
                          No items added to bill yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Supplier & Payment Details */}
            <form onSubmit={handleSubmitPurchase} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Supplier & Payment
              </h3>

              {/* Supplier selection */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Supplier / Vendor</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mb-2"
                >
                  <option value="">-- Choose or Enter Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - Payable Due: {formatMoney(s.currentBalance)}
                    </option>
                  ))}
                </select>

                {!selectedSupplierId && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="New Supplier Name"
                      value={newSupplierName}
                      onChange={(e) => setNewSupplierName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Supplier Phone (optional)"
                      value={newSupplierPhone}
                      onChange={(e) => setNewSupplierPhone(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Bill Date */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Bill Date</label>
                <input
                  type="date"
                  value={billDate}
                  onChange={(e) => setBillDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              {/* Discount */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Discount Received ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Payment Mode</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg capitalize"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="mfs">Mobile Financial Service (bKash/Nagad)</option>
                  <option value="credit">Credit / Full Due</option>
                </select>
              </div>

              {paymentMethod !== 'credit' && (
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Pay From Account</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.type}) - Balance: {formatMoney(a.currentBalance)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Paid Amount */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Paid Amount ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg font-bold"
                />
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>Total Bill:</span>
                  <span>{formatMoney(grandTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Supplier Due:</span>
                  <span>{formatMoney(calculatedDue)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {submitting ? 'Recording Bill...' : `Confirm Purchase (${formatMoney(grandTotal)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASES LIST */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search bill number or supplier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">#{p.billNumber}</td>
                  <td className="py-3 px-4 text-slate-500">{p.date}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{p.supplierName}</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">{p.items.length}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatMoney(p.totalAmount)}</td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-semibold">{formatMoney(p.paidAmount)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-600">
                    {p.dueAmount > 0 ? formatMoney(p.dueAmount) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        p.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : p.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filteredPurchases.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No purchase bills recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

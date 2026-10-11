import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingCart,
  Plus,
  Trash2,
  Printer,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserPlus,
  Calendar,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeProducts,
  subscribeCustomers,
  subscribeAccounts,
  subscribeSales,
  recordSale,
  saveCustomer,
} from '../services/dbService';
import { Product, Customer, FinancialAccount, Sale, SaleItem } from '../types';
import { PrintInvoiceModal } from '../components/PrintInvoiceModal';

export const SalesView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  // Subscribed data
  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeCustomers(activeBusiness.id, setCustomers);
    const u3 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u4 = subscribeSales(activeBusiness.id, setSales);
    return () => {
      u1();
      u2();
      u3();
      u4();
    };
  }, [activeBusiness?.id]);

  // POS / New Invoice Form State
  const [showPOS, setShowPOS] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQty, setItemQty] = useState(1);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'bank' | 'mfs' | 'credit'>('cash');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected Sale for printing
  const [activePrintSale, setActivePrintSale] = useState<Sale | null>(null);

  // Search & Filter in sales history
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Default account selection
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isDefault || a.type === 'cash') || accounts[0];
      setSelectedAccountId(def.id);
    }
  }, [accounts]);

  // Add Item to POS Cart
  const handleAddToCart = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;

    if (itemQty <= 0) {
      setErrorMsg('Quantity must be at least 1.');
      return;
    }

    if (product.currentStock < itemQty) {
      setErrorMsg(`Insufficient stock! Available in stock: ${product.currentStock} ${product.unit}.`);
      return;
    }

    // Check if already in cart
    const existingIndex = cartItems.findIndex((i) => i.productId === product.id);
    if (existingIndex > -1) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + itemQty;
      if (product.currentStock < newQty) {
        setErrorMsg(`Cannot add more than available stock (${product.currentStock} ${product.unit}).`);
        return;
      }
      updated[existingIndex].quantity = newQty;
      updated[existingIndex].total = newQty * updated[existingIndex].unitPrice;
      setCartItems(updated);
    } else {
      const newItem: SaleItem = {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        unit: product.unit,
        quantity: itemQty,
        unitPrice: product.sellingPrice,
        purchasePrice: product.purchasePrice,
        total: itemQty * product.sellingPrice,
      };
      setCartItems([...cartItems, newItem]);
    }

    setSelectedProductId('');
    setItemQty(1);
    setErrorMsg(null);
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(cartItems.filter((_, i) => i !== index));
  };

  const handleUpdateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) return;
    const item = cartItems[index];
    const product = products.find((p) => p.id === item.productId);
    if (product && product.currentStock < newQty) {
      setErrorMsg(`Only ${product.currentStock} ${product.unit} available.`);
      return;
    }
    const updated = [...cartItems];
    updated[index].quantity = newQty;
    updated[index].total = newQty * updated[index].unitPrice;
    setCartItems(updated);
    setErrorMsg(null);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.total, 0);
  }, [cartItems]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + taxAmount);
  }, [subtotal, discountAmount, taxAmount]);

  const calculatedDue = useMemo(() => {
    return Math.max(0, grandTotal - paidAmount);
  }, [grandTotal, paidAmount]);

  // Auto-set paid amount when grand total changes if not credit
  useEffect(() => {
    if (paymentMethod !== 'credit') {
      setPaidAmount(grandTotal);
    } else {
      setPaidAmount(0);
    }
  }, [grandTotal, paymentMethod]);

  // Submit Sale Invoice
  const handleSubmitSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser) return;

    if (cartItems.length === 0) {
      setErrorMsg('Please add at least one item to the invoice.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      let custId = selectedCustomerId;
      let custName = 'Walk-in Customer';
      let custPhone = '';

      if (selectedCustomerId) {
        const found = customers.find((c) => c.id === selectedCustomerId);
        if (found) {
          custName = found.name;
          custPhone = found.phone || '';
        }
      } else if (newCustomerName.trim()) {
        custId = await saveCustomer(activeBusiness.id, {
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
        });
        custName = newCustomerName.trim();
        custPhone = newCustomerPhone.trim();
      }

      const invNumber = 'INV-' + Date.now().toString().slice(-6);
      const acc = accounts.find((a) => a.id === selectedAccountId);

      let status: Sale['status'] = 'paid';
      if (paidAmount === 0) status = 'due';
      else if (paidAmount < grandTotal) status = 'partial';

      const salePayload: Omit<Sale, 'id' | 'createdAt'> = {
        businessId: activeBusiness.id,
        invoiceNumber: invNumber,
        customerId: custId || undefined,
        customerName: custName,
        customerPhone: custPhone || undefined,
        items: cartItems,
        subtotal,
        discount: discountAmount,
        tax: taxAmount,
        totalAmount: grandTotal,
        paidAmount,
        dueAmount: calculatedDue,
        paymentMethod,
        accountId: paidAmount > 0 ? selectedAccountId : undefined,
        accountName: paidAmount > 0 ? acc?.name : undefined,
        status,
        notes: notes.trim() || undefined,
        date: saleDate,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Staff',
      };

      const newId = await recordSale(activeBusiness.id, salePayload);

      // Reset Form
      setCartItems([]);
      setSelectedCustomerId('');
      setNewCustomerName('');
      setNewCustomerPhone('');
      setDiscountAmount(0);
      setTaxAmount(0);
      setNotes('');
      setShowPOS(false);

      // Offer immediate print preview
      setActivePrintSale({
        ...salePayload,
        id: newId,
        createdAt: new Date().toISOString(),
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to record sale.');
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered sales
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchStart = !filterStartDate || s.date >= filterStartDate;
      const matchEnd = !filterEndDate || s.date <= filterEndDate;
      return matchSearch && matchStatus && matchStart && matchEnd;
    });
  }, [sales, searchTerm, filterStatus, filterStartDate, filterEndDate]);

  // Export Sales to CSV
  const exportToCSV = () => {
    if (filteredSales.length === 0) return;
    const headers = ['Invoice Number', 'Date', 'Customer', 'Items Count', 'Subtotal', 'Discount', 'Tax', 'Total Amount', 'Paid Amount', 'Due Amount', 'Status', 'Payment Method'];
    const rows = filteredSales.map((s) => [
      s.invoiceNumber,
      s.date,
      `"${s.customerName.replace(/"/g, '""')}"`,
      s.items.length,
      s.subtotal,
      s.discount,
      s.tax,
      s.totalAmount,
      s.paidAmount,
      s.dueAmount,
      s.status,
      s.paymentMethod,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DMS_Sales_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Sales Management & POS</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Create sales invoices, collect payments, and print receipts
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToCSV}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowPOS(!showPOS)}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
          >
            {showPOS ? <FileText className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showPOS ? 'View Sales Records' : 'Create New Sale (POS)'}</span>
          </button>
        </div>
      </div>

      {/* POS CREATION VIEW */}
      {showPOS && (
        <div className="bg-white rounded-2xl border border-sky-100 shadow-md p-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-sky-600" />
              <h2 className="text-lg font-bold text-slate-900">New Sales Invoice</h2>
            </div>
            <button
              onClick={() => setShowPOS(false)}
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
            {/* Left 2 Cols: Item Picker & Cart */}
            <div className="lg:col-span-2 space-y-4">
              {/* Add item row */}
              <div className="p-4 bg-sky-50/50 rounded-xl border border-sky-100">
                <p className="text-xs font-semibold text-slate-700 mb-2">Select Product to Add</p>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-7">
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Product</label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="">-- Choose item from stock --</option>
                      {products.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={p.currentStock <= 0}
                        >
                          {p.name} (Stock: {p.currentStock} {p.unit}) - {formatMoney(p.sellingPrice)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[11px] font-medium text-slate-500 mb-1 block">Quantity</label>
                    <input
                      type="number"
                      min="1"
                      value={itemQty}
                      onChange={(e) => setItemQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full text-xs p-2.5 bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-sky-500"
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

              {/* Cart Table */}
              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Product</th>
                      <th className="py-2.5 px-2 text-right">Price</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">Subtotal</th>
                      <th className="py-2.5 px-2 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.productName}
                          <span className="text-[10px] text-slate-400 block font-mono">{item.sku}</span>
                        </td>
                        <td className="py-2.5 px-2 text-right text-slate-600">
                          {formatMoney(item.unitPrice)}
                        </td>
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleUpdateCartQty(idx, parseInt(e.target.value) || 1)}
                            className="w-16 text-center text-xs p-1 border border-slate-200 rounded-md"
                          />
                        </td>
                        <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                          {formatMoney(item.total)}
                        </td>
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
                        <td colSpan={5} className="text-center py-8 text-slate-400 text-xs">
                          No items added yet. Select products from the dropdown above.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right 1 Col: Customer & Payment Details */}
            <form onSubmit={handleSubmitSale} className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Customer & Payment
              </h3>

              {/* Customer selection */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Customer</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg mb-2"
                >
                  <option value="">-- Walk-in / New Customer --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''} - Due: {formatMoney(c.currentBalance)}
                    </option>
                  ))}
                </select>

                {!selectedCustomerId && (
                  <div className="space-y-1.5 pt-1">
                    <input
                      type="text"
                      placeholder="Customer Name (optional)"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Customer Phone (optional)"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Invoice Date</label>
                <input
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              {/* Discount & Tax */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Discount ({activeBusiness?.currencySymbol || '৳'})</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Tax/VAT ({activeBusiness?.currencySymbol || '৳'})</label>
                  <input
                    type="number"
                    min="0"
                    value={taxAmount}
                    onChange={(e) => setTaxAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Payment Method */}
              <div>
                <label className="text-[11px] font-medium text-slate-600 block mb-1">Payment Method</label>
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

              {/* Account */}
              {paymentMethod !== 'credit' && (
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Deposit To Account</label>
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

              {/* Totals Summary */}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span>{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 text-sm">
                  <span>Grand Total:</span>
                  <span>{formatMoney(grandTotal)}</span>
                </div>
                <div className="flex justify-between font-semibold text-rose-600">
                  <span>Due Balance:</span>
                  <span>{formatMoney(calculatedDue)}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting || cartItems.length === 0}
                className="w-full py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                {submitting ? 'Generating Invoice...' : `Confirm & Save Invoice (${formatMoney(grandTotal)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* SALES HISTORY & LIST */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {/* Filters bar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-xs p-2 bg-white border border-slate-200 rounded-xl focus:outline-hidden"
            >
              <option value="all">All Payment Statuses</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="due">Due</option>
              <option value="returned">Returned</option>
            </select>

            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="text-xs p-2 bg-white border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Invoices Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-mono font-bold text-sky-700">
                    #{sale.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{sale.date}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    <div>{sale.customerName}</div>
                    {sale.customerPhone && (
                      <div className="text-[10px] text-slate-400">{sale.customerPhone}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">
                    {sale.items.length}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatMoney(sale.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                    {formatMoney(sale.paidAmount)}
                  </td>
                  <td className="py-3 px-4 text-right font-semibold text-rose-600">
                    {sale.dueAmount > 0 ? formatMoney(sale.dueAmount) : '—'}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        sale.status === 'paid'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sale.status === 'partial'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setActivePrintSale(sale)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 transition"
                      title="Print Invoice"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredSales.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400">
                    No sales invoices found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Print Invoice Modal */}
      {activePrintSale && activeBusiness && (
        <PrintInvoiceModal
          sale={activePrintSale}
          business={activeBusiness}
          onClose={() => setActivePrintSale(null)}
        />
      )}
    </div>
  );
};

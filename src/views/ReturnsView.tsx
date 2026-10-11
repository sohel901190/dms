import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  FileText,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeProducts,
  subscribeAccounts,
  subscribeReturns,
  processReturn,
} from '../services/dbService';
import { Product, FinancialAccount, ReturnRecord } from '../types';

export const ReturnsView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [returns, setReturns] = useState<ReturnRecord[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [returnType, setReturnType] = useState<'sale_return' | 'purchase_return'>('sale_return');
  const [refNumber, setRefNumber] = useState('');
  const [partyName, setPartyName] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [returnQty, setReturnQty] = useState(1);
  const [returnUnitPrice, setReturnUnitPrice] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [returnReason, setReturnReason] = useState('Customer returned undamaged items');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u3 = subscribeReturns(activeBusiness.id, setReturns);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (selectedProductId) {
      const p = products.find((prod) => prod.id === selectedProductId);
      if (p) {
        setReturnUnitPrice(returnType === 'sale_return' ? p.sellingPrice : p.purchasePrice);
      }
    }
  }, [selectedProductId, returnType, products]);

  useEffect(() => {
    if (accounts.length > 0 && !selectedAccountId) {
      const def = accounts.find((a) => a.isDefault || a.type === 'cash') || accounts[0];
      setSelectedAccountId(def.id);
    }
  }, [accounts]);

  const handleSubmitReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser || !selectedProductId) return;

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    setSubmitting(true);
    try {
      const totalRefund = returnQty * returnUnitPrice;

      await processReturn(activeBusiness.id, {
        businessId: activeBusiness.id,
        type: returnType,
        referenceNumber: refNumber.trim() || ('RET-' + Date.now().toString().slice(-6)),
        partyName: partyName.trim() || (returnType === 'sale_return' ? 'Customer' : 'Supplier'),
        items: [
          {
            productId: prod.id,
            productName: prod.name,
            quantity: returnQty,
            unitPrice: returnUnitPrice,
            total: totalRefund,
          },
        ],
        totalRefund,
        accountId: selectedAccountId || undefined,
        date: new Date().toISOString().split('T')[0],
        reason: returnReason,
        createdBy: currentUser.uid,
      });

      setIsModalOpen(false);
      setRefNumber('');
      setPartyName('');
      setSelectedProductId('');
      setReturnQty(1);
    } catch (err: any) {
      alert(err?.message || 'Failed to process return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Returns & Refunds</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Handle customer sales returns, restock items, and process supplier return adjustments
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Process New Return</span>
        </button>
      </div>

      {/* Returns Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reference #</th>
                <th className="py-3 px-4">Customer / Supplier</th>
                <th className="py-3 px-4">Items Returned</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4 text-right">Refund Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {returns.map((ret) => (
                <tr key={ret.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-500">{ret.date}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        ret.type === 'sale_return'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {ret.type === 'sale_return' ? 'Sales Return' : 'Purchase Return'}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{ret.referenceNumber}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{ret.partyName}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {ret.items.map((i) => `${i.productName} (${i.quantity}x)`).join(', ')}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{ret.reason}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatMoney(ret.totalRefund)}
                  </td>
                </tr>
              ))}
              {returns.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No returns logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PROCESS RETURN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Process Return / Refund</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReturn} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Return Type</label>
                <select
                  value={returnType}
                  onChange={(e) => setReturnType(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="sale_return">Sales Return (Customer returning item)</option>
                  <option value="purchase_return">Purchase Return (Returning item to supplier)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Product to Return</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Select Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Stock: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Return Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={returnQty}
                    onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Unit Refund Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={returnUnitPrice}
                    onChange={(e) => setReturnUnitPrice(parseFloat(e.target.value) || 0)}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer / Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Rahim or Acme Corp"
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Refund Account (Optional)</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="">-- No Direct Cash Refund --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Return Reason</label>
                <input
                  type="text"
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Return'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

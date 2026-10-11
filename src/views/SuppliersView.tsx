import React, { useState, useEffect, useMemo } from 'react';
import {
  Building,
  Plus,
  Search,
  Phone,
  MessageCircle,
  X,
  CreditCard,
  DollarSign,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeSuppliers,
  subscribeAccounts,
  subscribePurchases,
  saveSupplier,
  recordSupplierPayment,
} from '../services/dbService';
import { Supplier, FinancialAccount, Purchase } from '../types';

export const SuppliersView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Supplier Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Partial<Supplier> | null>(null);

  // Pay Supplier Modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [targetSupplier, setTargetSupplier] = useState<Supplier | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payNote, setPayNote] = useState<string>('Supplier dues payment');

  // Supplier Statement Modal
  const [statementSupplier, setStatementSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeSuppliers(activeBusiness.id, setSuppliers);
    const u2 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u3 = subscribePurchases(activeBusiness.id, setPurchases);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (accounts.length > 0 && !payAccountId) {
      const def = accounts.find((a) => a.isDefault || a.type === 'cash') || accounts[0];
      setPayAccountId(def.id);
    }
  }, [accounts]);

  const handleOpenAdd = () => {
    setEditingSupplier({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      openingBalance: 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !editingSupplier || !editingSupplier.name) return;

    try {
      await saveSupplier(activeBusiness.id, editingSupplier);
      setIsModalOpen(false);
      setEditingSupplier(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save supplier');
    }
  };

  const handlePaySupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !targetSupplier || !currentUser || payAmount <= 0) return;

    try {
      await recordSupplierPayment(
        activeBusiness.id,
        targetSupplier.id,
        payAmount,
        payAccountId,
        payNote,
        currentUser.uid
      );
      setIsPayModalOpen(false);
      setTargetSupplier(null);
      setPayAmount(0);
    } catch (err: any) {
      alert(err?.message || 'Failed to process supplier payment');
    }
  };

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.phone.includes(searchTerm)
    );
  }, [suppliers, searchTerm]);

  const totalPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Suppliers & Vendors</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Track vendor profiles, payables, bills, and payment records
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Supplier</span>
        </button>
      </div>

      {/* Mini Stat */}
      <div className="bg-rose-50/70 border border-rose-100 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
            Total Outstanding Payables (To Suppliers)
          </p>
          <p className="text-2xl font-bold text-rose-900 mt-0.5">{formatMoney(totalPayables)}</p>
        </div>
        <div className="text-right text-xs text-rose-700">
          <span>{suppliers.length} vendors registered</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search supplier name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Phone</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Payable Balance</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{sup.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>{sup.phone || '—'}</span>
                      {sup.phone && (
                        <a
                          href={`https://wa.me/${sup.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{sup.address || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-bold ${
                        sup.currentBalance > 0 ? 'text-rose-600' : 'text-slate-600'
                      }`}
                    >
                      {formatMoney(sup.currentBalance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {sup.currentBalance > 0 && (
                        <button
                          onClick={() => {
                            setTargetSupplier(sup);
                            setPayAmount(sup.currentBalance);
                            setIsPayModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-lg text-xs font-semibold transition"
                        >
                          Pay Dues
                        </button>
                      )}
                      <button
                        onClick={() => setStatementSupplier(sup)}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
                      >
                        Ledger
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No suppliers registered yet. Click "Add New Supplier" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAY SUPPLIER MODAL */}
      {isPayModalOpen && targetSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                Pay Supplier Dues: {targetSupplier.name}
              </h2>
              <button onClick={() => setIsPayModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePaySupplier} className="p-5 space-y-4">
              <div className="bg-rose-50 p-3 rounded-xl text-xs text-rose-800 flex justify-between">
                <span>Total Payable Due:</span>
                <span className="font-bold">{formatMoney(targetSupplier.currentBalance)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Amount</label>
                <input
                  type="number"
                  min="1"
                  max={targetSupplier.currentBalance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Pay From Account</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type}) - Balance: {formatMoney(a.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Payment Note</label>
                <input
                  type="text"
                  value={payNote}
                  onChange={(e) => setPayNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER LEDGER STATEMENT MODAL */}
      {statementSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Supplier Statement: {statementSupplier.name}
                </h2>
                <p className="text-xs text-slate-500">Phone: {statementSupplier.phone || 'N/A'}</p>
              </div>
              <button
                onClick={() => setStatementSupplier(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Opening Balance:</span>
                  <span className="font-semibold ml-1">{formatMoney(statementSupplier.openingBalance)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Current Payable Due:</span>
                  <span className="font-bold text-rose-600 ml-1">{formatMoney(statementSupplier.currentBalance)}</span>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Purchase Bills & Receipts
              </h3>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Bill #</th>
                      <th className="py-2.5 px-3 text-right">Bill Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Due Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {purchases
                      .filter((p) => p.supplierId === statementSupplier.id)
                      .map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 px-3 text-slate-500">{p.date}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-700">#{p.billNumber}</td>
                          <td className="py-2.5 px-3 text-right">{formatMoney(p.totalAmount)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">{formatMoney(p.paidAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">{formatMoney(p.dueAmount)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD SUPPLIER MODAL */}
      {isModalOpen && editingSupplier && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingSupplier.id ? 'Edit Supplier' : 'Add New Supplier'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Supplier / Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Wholesale Ltd."
                  value={editingSupplier.name || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ''}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Due (Payable)</label>
                  <input
                    type="number"
                    min="0"
                    value={editingSupplier.openingBalance ?? 0}
                    onChange={(e) =>
                      setEditingSupplier({
                        ...editingSupplier,
                        openingBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
                <input
                  type="email"
                  value={editingSupplier.email || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, email: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editingSupplier.address || ''}
                  onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
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
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Save Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

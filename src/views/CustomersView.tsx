import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  Plus,
  Search,
  Phone,
  MessageCircle,
  FileText,
  DollarSign,
  X,
  CreditCard,
  Printer,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeCustomers,
  subscribeAccounts,
  subscribeSales,
  saveCustomer,
  recordCustomerPayment,
} from '../services/dbService';
import { Customer, FinancialAccount, Sale } from '../types';

export const CustomersView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add/Edit Customer Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Partial<Customer> | null>(null);

  // Collect Payment Modal
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [targetCustomer, setTargetCustomer] = useState<Customer | null>(null);
  const [receiptAmount, setReceiptAmount] = useState<number>(0);
  const [receiptAccountId, setReceiptAccountId] = useState<string>('');
  const [receiptNote, setReceiptNote] = useState<string>('Customer dues settled');

  // Customer Ledger Modal
  const [ledgerCustomer, setLedgerCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeCustomers(activeBusiness.id, setCustomers);
    const u2 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u3 = subscribeSales(activeBusiness.id, setSales);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (accounts.length > 0 && !receiptAccountId) {
      const def = accounts.find((a) => a.isDefault || a.type === 'cash') || accounts[0];
      setReceiptAccountId(def.id);
    }
  }, [accounts]);

  const handleOpenAdd = () => {
    setEditingCustomer({
      name: '',
      phone: '',
      whatsapp: '',
      email: '',
      address: '',
      openingBalance: 0,
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !editingCustomer || !editingCustomer.name) return;

    try {
      await saveCustomer(activeBusiness.id, editingCustomer);
      setIsModalOpen(false);
      setEditingCustomer(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to save customer');
    }
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !targetCustomer || !currentUser || receiptAmount <= 0) return;

    try {
      await recordCustomerPayment(
        activeBusiness.id,
        targetCustomer.id,
        receiptAmount,
        receiptAccountId,
        receiptNote,
        currentUser.uid
      );
      setIsCollectModalOpen(false);
      setTargetCustomer(null);
      setReceiptAmount(0);
    } catch (err: any) {
      alert(err?.message || 'Failed to record customer receipt');
    }
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm) ||
        (c.address && c.address.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [customers, searchTerm]);

  const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.currentBalance || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Customer Directory & Accounts</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Manage customer profiles, receivables, payment receipts, and ledgers
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Mini Stat */}
      <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
            Total Outstanding Receivables (Dues)
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-0.5">{formatMoney(totalReceivables)}</p>
        </div>
        <div className="text-right text-xs text-emerald-700">
          <span>{customers.length} registered customers</span>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search customer name or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone / WhatsApp</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Current Due</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{cust.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <div className="flex items-center gap-2">
                      <span>{cust.phone || '—'}</span>
                      {cust.phone && (
                        <a
                          href={`https://wa.me/${cust.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700"
                          title="WhatsApp Customer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{cust.address || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-bold ${
                        cust.currentBalance > 0 ? 'text-rose-600' : 'text-slate-600'
                      }`}
                    >
                      {formatMoney(cust.currentBalance)}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {cust.currentBalance > 0 && (
                        <button
                          onClick={() => {
                            setTargetCustomer(cust);
                            setReceiptAmount(cust.currentBalance);
                            setIsCollectModalOpen(true);
                          }}
                          className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition"
                        >
                          Collect Due
                        </button>
                      )}
                      <button
                        onClick={() => setLedgerCustomer(cust)}
                        className="px-2.5 py-1 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
                      >
                        Ledger
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-slate-400">
                    No customers found. Click "Add New Customer" above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* COLLECT PAYMENT MODAL */}
      {isCollectModalOpen && targetCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                Collect Payment Receipt: {targetCustomer.name}
              </h2>
              <button
                onClick={() => setIsCollectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCollectPayment} className="p-5 space-y-4">
              <div className="bg-amber-50 p-3 rounded-xl text-xs text-amber-800 flex justify-between">
                <span>Total Customer Due:</span>
                <span className="font-bold">{formatMoney(targetCustomer.currentBalance)}</span>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Amount</label>
                <input
                  type="number"
                  min="1"
                  max={targetCustomer.currentBalance}
                  required
                  value={receiptAmount}
                  onChange={(e) => setReceiptAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Deposit To Account</label>
                <select
                  value={receiptAccountId}
                  onChange={(e) => setReceiptAccountId(e.target.value)}
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
                <label className="text-xs font-semibold text-slate-700 block mb-1">Receipt Note</label>
                <input
                  type="text"
                  value={receiptNote}
                  onChange={(e) => setReceiptNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Confirm Receipt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CUSTOMER LEDGER STATEMENT MODAL */}
      {ledgerCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 max-h-[85vh] flex flex-col">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Customer Statement: {ledgerCustomer.name}
                </h2>
                <p className="text-xs text-slate-500">Phone: {ledgerCustomer.phone || 'N/A'}</p>
              </div>
              <button
                onClick={() => setLedgerCustomer(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-500">Opening Balance:</span>
                  <span className="font-semibold ml-1">{formatMoney(ledgerCustomer.openingBalance)}</span>
                </div>
                <div className="text-right">
                  <span className="text-slate-500">Current Outstanding:</span>
                  <span className="font-bold text-rose-600 ml-1">{formatMoney(ledgerCustomer.currentBalance)}</span>
                </div>
              </div>

              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Sales Invoices & Transactions
              </h3>

              <div className="border border-slate-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Invoice #</th>
                      <th className="py-2.5 px-3 text-right">Invoice Total</th>
                      <th className="py-2.5 px-3 text-right">Paid</th>
                      <th className="py-2.5 px-3 text-right">Due Added</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sales
                      .filter((s) => s.customerId === ledgerCustomer.id)
                      .map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 px-3 text-slate-500">{s.date}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-sky-700">#{s.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-right">{formatMoney(s.totalAmount)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-600">{formatMoney(s.paidAmount)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {formatMoney(s.dueAmount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT CUSTOMER MODAL */}
      {isModalOpen && editingCustomer && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">
                {editingCustomer.id ? 'Edit Customer' : 'Add New Customer'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahim Trading or Kamal Hossain"
                  value={editingCustomer.name || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, name: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({ ...editingCustomer, phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Due Balance</label>
                  <input
                    type="number"
                    min="0"
                    value={editingCustomer.openingBalance ?? 0}
                    onChange={(e) =>
                      setEditingCustomer({
                        ...editingCustomer,
                        openingBalance: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={editingCustomer.email || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, email: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Address</label>
                <textarea
                  rows={2}
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({ ...editingCustomer, address: e.target.value })}
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
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

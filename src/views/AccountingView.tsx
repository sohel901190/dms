import React, { useState, useEffect, useMemo } from 'react';
import {
  Landmark,
  Plus,
  ArrowRightLeft,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Wallet,
  DollarSign,
  X,
  FileText,
  Calendar,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import {
  subscribeAccounts,
  subscribeExpenses,
  subscribeIncome,
  createAccount,
  transferBetweenAccounts,
  addExpense,
  addIncome,
} from '../services/dbService';
import { FinancialAccount, Expense, Income, AccountType } from '../types';

export const AccountingView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();
  const { currentUser } = useAuth();

  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);

  // Sub-tabs: Accounts, Expenses, Income, Cashbook/Bankbook
  const [activeTab, setActiveTab] = useState<'accounts' | 'expenses' | 'income' | 'cashbook'>('accounts');

  // Modals
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [newAccType, setNewAccType] = useState<AccountType>('cash');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newAccOpening, setNewAccOpening] = useState(0);

  // Transfer Modal
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [fromAccId, setFromAccId] = useState('');
  const [toAccId, setToAccId] = useState('');
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [transferNote, setTransferNote] = useState('');

  // Add Expense Modal
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expCategory, setExpCategory] = useState('Rent & Utilities');
  const [expAmount, setExpAmount] = useState<number>(0);
  const [expAccountId, setExpAccountId] = useState('');
  const [expNote, setExpNote] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);

  // Add Income Modal
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incCategory, setIncCategory] = useState('Service Fee');
  const [incAmount, setIncAmount] = useState<number>(0);
  const [incAccountId, setIncAccountId] = useState('');
  const [incNote, setIncNote] = useState('');
  const [incDate, setIncDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeAccounts(activeBusiness.id, setAccounts);
    const u2 = subscribeExpenses(activeBusiness.id, setExpenses);
    const u3 = subscribeIncome(activeBusiness.id, setIncome);
    return () => {
      u1();
      u2();
      u3();
    };
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (accounts.length > 0) {
      if (!expAccountId) setExpAccountId(accounts[0].id);
      if (!incAccountId) setIncAccountId(accounts[0].id);
      if (!fromAccId) setFromAccId(accounts[0].id);
      if (!toAccId && accounts.length > 1) setToAccId(accounts[1].id);
    }
  }, [accounts]);

  // Handlers
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !newAccName.trim()) return;
    try {
      await createAccount(activeBusiness.id, {
        businessId: activeBusiness.id,
        name: newAccName.trim(),
        type: newAccType,
        accountNumber: newAccNumber.trim() || undefined,
        currentBalance: newAccOpening,
        openingBalance: newAccOpening,
      });
      setIsAddAccountOpen(false);
      setNewAccName('');
      setNewAccNumber('');
      setNewAccOpening(0);
    } catch (err: any) {
      alert(err?.message || 'Failed to create financial account');
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser || transferAmount <= 0) return;
    if (fromAccId === toAccId) {
      alert('Source and destination accounts must be different');
      return;
    }
    const fromAcc = accounts.find((a) => a.id === fromAccId);
    const toAcc = accounts.find((a) => a.id === toAccId);
    if (!fromAcc || !toAcc) return;

    if (fromAcc.currentBalance < transferAmount) {
      alert(`Insufficient balance in ${fromAcc.name}! Available: ${formatMoney(fromAcc.currentBalance)}`);
      return;
    }

    try {
      await transferBetweenAccounts(
        activeBusiness.id,
        fromAccId,
        fromAcc.name,
        toAccId,
        toAcc.name,
        transferAmount,
        currentUser.uid,
        transferNote
      );
      setIsTransferOpen(false);
      setTransferAmount(0);
      setTransferNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to complete fund transfer');
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser || expAmount <= 0) return;
    const acc = accounts.find((a) => a.id === expAccountId);
    try {
      await addExpense(activeBusiness.id, {
        businessId: activeBusiness.id,
        category: expCategory,
        amount: expAmount,
        accountId: expAccountId,
        accountName: acc?.name,
        date: expDate,
        note: expNote.trim() || undefined,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Staff',
      });
      setIsExpenseModalOpen(false);
      setExpAmount(0);
      setExpNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to record expense');
    }
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !currentUser || incAmount <= 0) return;
    const acc = accounts.find((a) => a.id === incAccountId);
    try {
      await addIncome(activeBusiness.id, {
        businessId: activeBusiness.id,
        category: incCategory,
        amount: incAmount,
        accountId: incAccountId,
        accountName: acc?.name,
        date: incDate,
        note: incNote.trim() || undefined,
        createdBy: currentUser.uid,
        createdByName: currentUser.displayName || 'Staff',
      });
      setIsIncomeModalOpen(false);
      setIncAmount(0);
      setIncNote('');
    } catch (err: any) {
      alert(err?.message || 'Failed to record other income');
    }
  };

  const totalLiquidity = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
  const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const totalOtherIncome = income
    .filter((i) => i.category !== 'Internal Transfer')
    .reduce((acc, i) => acc + (i.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounting & Financial Accounts</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Cash drawers, Bank accounts, MFS wallets, fund transfers, expenses, and income
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsTransferOpen(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <ArrowRightLeft className="w-4 h-4 text-sky-600" />
            <span>Transfer Funds</span>
          </button>
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <TrendingDown className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
          <button
            onClick={() => setIsIncomeModalOpen(true)}
            className="px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            <span>Add Income</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Cash & Bank Liquidity</p>
          <p className="text-2xl font-bold text-sky-700 mt-1">{formatMoney(totalLiquidity)}</p>
          <p className="text-xs text-slate-500 mt-1">{accounts.length} active financial accounts</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Operating Expenses</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{formatMoney(totalExpenses)}</p>
          <p className="text-xs text-slate-500 mt-1">{expenses.length} expense entries recorded</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Other Non-Sales Income</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{formatMoney(totalOtherIncome)}</p>
          <p className="text-xs text-slate-500 mt-1">{income.length} income entries recorded</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-xs font-bold">
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'accounts'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Financial Accounts ({accounts.length})
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'expenses'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Expenses ({expenses.length})
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`pb-3 transition border-b-2 ${
            activeTab === 'income'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Other Income ({income.length})
        </button>
      </div>

      {/* ACCOUNTS LIST */}
      {activeTab === 'accounts' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-sm font-bold text-slate-800">Bank & Cash Accounts</h2>
            <button
              onClick={() => setIsAddAccountOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition"
            >
              + Create Account
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {accounts.map((acc) => (
              <div
                key={acc.id}
                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-sky-200 transition"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {acc.type}
                  </span>
                  {acc.isDefault && (
                    <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                      Primary
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{acc.name}</h3>
                {acc.accountNumber && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Acc: {acc.accountNumber}</p>
                )}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Current Balance:</span>
                  <span className="text-base font-bold text-slate-900">{formatMoney(acc.currentBalance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXPENSES LIST */}
      {activeTab === 'expenses' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Paid From Account</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">{exp.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{exp.category}</td>
                    <td className="py-3 px-4 text-slate-600">{exp.accountName || 'Cash Account'}</td>
                    <td className="py-3 px-4 text-slate-500">{exp.note || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-rose-600">
                      -{formatMoney(exp.amount)}
                    </td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No expenses logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INCOME LIST */}
      {activeTab === 'income' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Deposit Account</th>
                  <th className="py-3 px-4">Note</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {income.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 text-slate-500">{inc.date}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{inc.category}</td>
                    <td className="py-3 px-4 text-slate-600">{inc.accountName || 'Cash Account'}</td>
                    <td className="py-3 px-4 text-slate-500">{inc.note || '—'}</td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-600">
                      +{formatMoney(inc.amount)}
                    </td>
                  </tr>
                ))}
                {income.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No other income logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TRANSFER MODAL */}
      {isTransferOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Transfer Funds Between Accounts</h2>
              <button onClick={() => setIsTransferOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTransfer} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">From Account (Source)</label>
                <select
                  value={fromAccId}
                  onChange={(e) => setFromAccId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">To Account (Destination)</label>
                <select
                  value={toAccId}
                  onChange={(e) => setToAccId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Transfer Amount ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Transfer Note</label>
                <input
                  type="text"
                  placeholder="e.g. Deposit cash to City Bank"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACCOUNT MODAL */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Create Financial Account</h2>
              <button onClick={() => setIsAddAccountOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dutch-Bangla Current Acc or bKash Merchant"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account Type</label>
                <select
                  value={newAccType}
                  onChange={(e) => setNewAccType(e.target.value as any)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="cash">Cash In Hand / Drawer</option>
                  <option value="bank">Bank Account</option>
                  <option value="mfs">Mobile Financial Service (bKash / Nagad / Rocket)</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Account / Wallet Number</label>
                <input
                  type="text"
                  value={newAccNumber}
                  onChange={(e) => setNewAccNumber(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Opening Balance ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="0"
                  value={newAccOpening}
                  onChange={(e) => setNewAccOpening(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Record Business Expense</h2>
              <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Category</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="Rent & Utilities">Rent & Utilities</option>
                  <option value="Staff Salaries">Staff Salaries</option>
                  <option value="Packaging & Bags">Packaging & Bags</option>
                  <option value="Transportation & Fuel">Transportation & Fuel</option>
                  <option value="Marketing & Advertising">Marketing & Advertising</option>
                  <option value="Maintenance & Repairs">Maintenance & Repairs</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Expense Amount ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={expAmount}
                  onChange={(e) => setExpAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Paid From Account</label>
                <select
                  value={expAccountId}
                  onChange={(e) => setExpAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Shop electricity bill for this month"
                  value={expNote}
                  onChange={(e) => setExpNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Record Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD INCOME MODAL */}
      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-900">Record Other Income</h2>
              <button onClick={() => setIsIncomeModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Income Category</label>
                <select
                  value={incCategory}
                  onChange={(e) => setIncCategory(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="Consulting / Service Fee">Consulting / Service Fee</option>
                  <option value="Delivery / Transport Charge">Delivery / Transport Charge</option>
                  <option value="Asset Sale">Asset Sale</option>
                  <option value="Interest Received">Interest Received</option>
                  <option value="Other Revenue">Other Revenue</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Income Amount ({activeBusiness?.currencySymbol || '৳'})</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={incAmount}
                  onChange={(e) => setIncAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Deposit To Account</label>
                <select
                  value={incAccountId}
                  onChange={(e) => setIncAccountId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({formatMoney(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                <input
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Description / Memo</label>
                <input
                  type="text"
                  placeholder="e.g. Delivery commission collected"
                  value={incNote}
                  onChange={(e) => setIncNote(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsIncomeModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition"
                >
                  Record Income
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

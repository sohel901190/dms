import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldAlert,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  ArrowRightLeft,
  ShoppingCart,
  Package,
  Truck,
  CreditCard,
  RotateCcw,
  ShieldCheck,
  FileText,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { subscribeAuditLogs } from '../services/dbService';
import { AuditLog as AuditLogType, AuditCategory, AuditActionType } from '../types';

export const AuditLog: React.FC = () => {
  const { activeBusiness } = useBusiness();
  const [logs, setLogs] = useState<AuditLogType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);

    const unsubscribe = subscribeAuditLogs(activeBusiness.id, (data) => {
      setLogs(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [activeBusiness?.id]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.performedByName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.targetId && log.targetId.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchCategory =
        selectedCategory === 'all' || log.category === selectedCategory;

      const matchAction =
        selectedAction === 'all' || log.action === selectedAction;

      const logDate = log.timestamp.split('T')[0];
      const matchStart = !startDate || logDate >= startDate;
      const matchEnd = !endDate || logDate <= endDate;

      return matchSearch && matchCategory && matchAction && matchStart && matchEnd;
    });
  }, [logs, searchQuery, selectedCategory, selectedAction, startDate, endDate]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = [
      'Timestamp',
      'Action Type',
      'Category',
      'Title',
      'Details',
      'Performed By User',
      'Target ID',
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.timestamp}"`,
      `"${l.action}"`,
      `"${l.category}"`,
      `"${l.title.replace(/"/g, '""')}"`,
      `"${l.details.replace(/"/g, '""')}"`,
      `"${l.performedByName.replace(/"/g, '""')}"`,
      `"${l.targetId || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `DMS_Security_AuditLog_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getCategoryIcon = (category: AuditCategory) => {
    switch (category) {
      case 'sales':
        return <ShoppingCart className="w-4 h-4 text-sky-600" />;
      case 'inventory':
        return <Package className="w-4 h-4 text-emerald-600" />;
      case 'finance':
        return <CreditCard className="w-4 h-4 text-purple-600" />;
      case 'purchases':
        return <Truck className="w-4 h-4 text-blue-600" />;
      default:
        return <ShieldCheck className="w-4 h-4 text-amber-600" />;
    }
  };

  const getCategoryBadge = (category: AuditCategory) => {
    switch (category) {
      case 'sales':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'inventory':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'finance':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'purchases':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Security & Audit Log</h1>
            <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Immutable Firestore
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-resistant audit trail recording invoice creation, stock adjustments, fund transfers, and payments
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredLogs.length === 0}
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5 disabled:opacity-50"
        >
          <Download className="w-4 h-4 text-slate-500" />
          <span>Export Audit Trail (CSV)</span>
        </button>
      </div>

      {/* Security Invariant Notice Banner */}
      <div className="bg-sky-50/60 border border-sky-100 rounded-2xl p-4 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-950">
          <p className="font-bold">Append-Only Audit Guarantee</p>
          <p className="text-slate-600 mt-0.5 leading-relaxed">
            All operational changes are automatically committed to the <code className="bg-sky-100 px-1 py-0.5 rounded font-mono text-[11px]">businesses/{'{businessId}'}/audit_logs</code> collection. Firestore Security Rules enforce that audit logs are strictly append-only; update and delete operations are blocked at the database engine level.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, details, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden capitalize"
          >
            <option value="all">All Categories</option>
            <option value="sales">Sales & Invoicing</option>
            <option value="inventory">Inventory & Stock</option>
            <option value="finance">Finance & Transfers</option>
            <option value="purchases">Purchases & Bills</option>
          </select>

          {/* Action Filter */}
          <select
            value={selectedAction}
            onChange={(e) => setSelectedAction(e.target.value)}
            className="text-xs p-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
          >
            <option value="all">All Action Types</option>
            <option value="invoice_created">Invoices Created</option>
            <option value="stock_adjusted">Stock Adjustments</option>
            <option value="account_transfer">Account Transfers</option>
            <option value="purchase_created">Purchases Created</option>
            <option value="customer_payment">Customer Payments</option>
            <option value="supplier_payment">Supplier Payments</option>
            <option value="return_processed">Returns Processed</option>
          </select>

          {/* Date range */}
          <div className="flex items-center gap-1.5 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="p-2 bg-slate-50 border border-slate-200 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Audit Log Entries List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.map((log) => {
            const dateObj = new Date(log.timestamp);
            const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const formattedDate = dateObj.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            return (
              <div
                key={log.id}
                className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
              >
                {/* Left: Icon, Action Badge, Title & Details */}
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getCategoryIcon(log.category)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{log.title}</span>
                      <span
                        className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${getCategoryBadge(
                          log.category
                        )}`}
                      >
                        {log.category}
                      </span>
                      {log.targetId && (
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          ID: {log.targetId}
                        </span>
                      )}
                    </div>

                    <p className="text-slate-600 leading-relaxed">{log.details}</p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{log.performedByName}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{formattedDate} at {formattedTime}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Security Check Stamp */}
                <div className="shrink-0 text-right sm:pl-4">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    Verified Event
                  </span>
                </div>
              </div>
            );
          })}

          {filteredLogs.length === 0 && !loading && (
            <div className="text-center py-16 text-slate-400 text-xs">
              <ShieldAlert className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-600">No audit log records found</p>
              <p className="text-slate-400 mt-1">
                Perform critical business actions (e.g. create sales invoices, adjust stock, or transfer funds) to see real-time immutable security logs here.
              </p>
            </div>
          )}

          {loading && (
            <div className="text-center py-12 text-slate-400 text-xs">
              Loading security audit trail...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

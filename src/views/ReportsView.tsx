import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PieChart,
  FileSpreadsheet,
  Building,
  Package,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import {
  subscribeProducts,
  subscribeSales,
  subscribePurchases,
  subscribeExpenses,
  subscribeIncome,
  subscribeCustomers,
  subscribeSuppliers,
  subscribeAccounts,
} from '../services/dbService';
import {
  Product,
  Sale,
  Purchase,
  Expense,
  Income,
  Customer,
  Supplier,
  FinancialAccount,
} from '../types';

export const ReportsView: React.FC = () => {
  const { activeBusiness, formatMoney } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);

  const [reportType, setReportType] = useState<
    'pl' | 'balance_sheet' | 'product_profit' | 'inventory_val' | 'dues'
  >('pl');

  // Date filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!activeBusiness) return;
    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeSales(activeBusiness.id, setSales);
    const u3 = subscribePurchases(activeBusiness.id, setPurchases);
    const u4 = subscribeExpenses(activeBusiness.id, setExpenses);
    const u5 = subscribeIncome(activeBusiness.id, setIncome);
    const u6 = subscribeCustomers(activeBusiness.id, setCustomers);
    const u7 = subscribeSuppliers(activeBusiness.id, setSuppliers);
    const u8 = subscribeAccounts(activeBusiness.id, setAccounts);
    return () => {
      u1();
      u2();
      u3();
      u4();
      u5();
      u6();
      u7();
      u8();
    };
  }, [activeBusiness?.id]);

  // Filtered sales in range
  const filteredSales = useMemo(() => {
    return sales.filter((s) => {
      const matchStart = !startDate || s.date >= startDate;
      const matchEnd = !endDate || s.date <= endDate;
      return matchStart && matchEnd;
    });
  }, [sales, startDate, endDate]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchStart = !startDate || e.date >= startDate;
      const matchEnd = !endDate || e.date <= endDate;
      return matchStart && matchEnd;
    });
  }, [expenses, startDate, endDate]);

  const filteredIncome = useMemo(() => {
    return income.filter((i) => {
      const matchStart = !startDate || i.date >= startDate;
      const matchEnd = !endDate || i.date <= endDate;
      return matchStart && matchEnd;
    });
  }, [income, startDate, endDate]);

  // Profit and Loss calculations
  const totalSalesRevenue = filteredSales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
  const totalCOGS = filteredSales.reduce((acc, s) => {
    return acc + s.items.reduce((sub, item) => sub + (item.purchasePrice || 0) * item.quantity, 0);
  }, 0);
  const grossProfit = totalSalesRevenue - totalCOGS;
  const totalOperatingExpenses = filteredExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);
  const otherRevenue = filteredIncome
    .filter((i) => i.category !== 'Internal Transfer')
    .reduce((acc, i) => acc + (i.amount || 0), 0);
  const netProfit = grossProfit - totalOperatingExpenses + otherRevenue;

  // Balance sheet assets
  const totalCashBank = accounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
  const totalReceivables = customers.reduce((acc, c) => acc + Math.max(0, c.currentBalance || 0), 0);
  const totalInventoryCost = products.reduce((acc, p) => acc + (p.currentStock || 0) * (p.purchasePrice || 0), 0);
  const totalAssets = totalCashBank + totalReceivables + totalInventoryCost;

  // Liabilities
  const totalPayables = suppliers.reduce((acc, s) => acc + Math.max(0, s.currentBalance || 0), 0);
  const netWorth = totalAssets - totalPayables;

  // Product Wise Profit
  const productProfitReport = useMemo(() => {
    const map: Record<string, { name: string; sku: string; unitsSold: number; revenue: number; cogs: number; profit: number }> = {};

    filteredSales.forEach((s) => {
      s.items.forEach((item) => {
        if (!map[item.productId]) {
          map[item.productId] = {
            name: item.productName,
            sku: item.sku,
            unitsSold: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
          };
        }
        const itemRevenue = item.total;
        const itemCost = (item.purchasePrice || 0) * item.quantity;
        map[item.productId].unitsSold += item.quantity;
        map[item.productId].revenue += itemRevenue;
        map[item.productId].cogs += itemCost;
        map[item.productId].profit += itemRevenue - itemCost;
      });
    });

    return Object.values(map).sort((a, b) => b.profit - a.profit);
  }, [filteredSales]);

  // Export report to CSV
  const handleExportCSV = () => {
    let rows: string[][] = [];
    let filename = `DMS_${reportType}_Report.csv`;

    if (reportType === 'pl') {
      rows = [
        ['DMS Solution - Profit & Loss Statement'],
        ['Business', activeBusiness?.name || ''],
        ['Generated', new Date().toISOString()],
        [''],
        ['Line Item', 'Amount'],
        ['Total Sales Revenue', totalSalesRevenue.toString()],
        ['Cost of Goods Sold (COGS)', `-${totalCOGS}`],
        ['Gross Profit', grossProfit.toString()],
        ['Total Operating Expenses', `-${totalOperatingExpenses}`],
        ['Other Operating Income', otherRevenue.toString()],
        ['Net Profit (Loss)', netProfit.toString()],
      ];
    } else if (reportType === 'balance_sheet') {
      rows = [
        ['DMS Solution - Balance Sheet Statement'],
        ['Business', activeBusiness?.name || ''],
        ['Generated', new Date().toISOString()],
        [''],
        ['CURRENT ASSETS', 'Amount'],
        ['Cash & Bank Liquidity', totalCashBank.toString()],
        ['Accounts Receivable (Customer Dues)', totalReceivables.toString()],
        ['Inventory Valuation', totalInventoryCost.toString()],
        ['TOTAL ASSETS', totalAssets.toString()],
        [''],
        ['LIABILITIES & EQUITY', 'Amount'],
        ['Accounts Payable (Supplier Dues)', totalPayables.toString()],
        ['NET BUSINESS EQUITY', netWorth.toString()],
      ];
    } else if (reportType === 'product_profit') {
      rows = [
        ['Product Name', 'SKU', 'Units Sold', 'Revenue', 'Cost', 'Gross Profit'],
        ...productProfitReport.map((p) => [
          `"${p.name.replace(/"/g, '""')}"`,
          p.sku,
          p.unitsSold.toString(),
          p.revenue.toString(),
          p.cogs.toString(),
          p.profit.toString(),
        ]),
      ];
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((r) => r.join(',')).join('\n');
    const encoded = encodeURI(csvContent);
    const a = document.createElement('a');
    a.href = encoded;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Financial & Management Reports</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time Profit & Loss, Balance Sheet, Item Margins, and Valuation statements
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export Report to CSV</span>
        </button>
      </div>

      {/* Report Switcher & Date Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={() => setReportType('pl')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'pl'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Profit & Loss
          </button>
          <button
            onClick={() => setReportType('balance_sheet')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'balance_sheet'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Balance Sheet
          </button>
          <button
            onClick={() => setReportType('product_profit')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'product_profit'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Product-Wise Profit
          </button>
          <button
            onClick={() => setReportType('dues')}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
              reportType === 'dues'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Receivables & Payables
          </button>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto text-xs">
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

      {/* REPORT CONTENT: PROFIT & LOSS */}
      {reportType === 'pl' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 max-w-3xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Profit & Loss Statement</h2>
            <p className="text-xs text-slate-500 mt-1">
              For period: {startDate || 'All Time'} to {endDate || 'Today'}
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {/* Sales Revenue */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                <span>Total Sales Revenue</span>
                <span>{formatMoney(totalSalesRevenue)}</span>
              </div>
              <div className="flex justify-between text-slate-500 pl-4">
                <span>Cost of Goods Sold (COGS)</span>
                <span>-{formatMoney(totalCOGS)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-emerald-700 text-sm">
                <span>Gross Profit</span>
                <span>{formatMoney(grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                <span>Operating Expenses</span>
                <span className="text-rose-600">-{formatMoney(totalOperatingExpenses)}</span>
              </div>
              {filteredExpenses.slice(0, 5).map((e) => (
                <div key={e.id} className="flex justify-between text-slate-500 pl-4">
                  <span>{e.category}</span>
                  <span>{formatMoney(e.amount)}</span>
                </div>
              ))}
            </div>

            {/* Other Income */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between items-center font-bold text-slate-800 text-sm">
                <span>Other Operating Income</span>
                <span className="text-emerald-600">+{formatMoney(otherRevenue)}</span>
              </div>
            </div>

            {/* Net Profit */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-50 to-sky-50 border border-emerald-200 flex justify-between items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Net Profit / (Loss)
                </p>
                <p className="text-[11px] text-slate-500">Gross Profit - Expenses + Other Income</p>
              </div>
              <span
                className={`text-2xl font-black ${
                  netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {formatMoney(netProfit)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: BALANCE SHEET */}
      {reportType === 'balance_sheet' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 max-w-3xl mx-auto space-y-6">
          <div className="text-center pb-4 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">Balance Sheet Statement</h2>
            <p className="text-xs text-slate-500 mt-1">As of {new Date().toLocaleDateString()}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Assets */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
                Assets
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                <div className="flex justify-between text-slate-700">
                  <span>Cash & Bank Balances:</span>
                  <span className="font-semibold">{formatMoney(totalCashBank)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Accounts Receivable (Dues):</span>
                  <span className="font-semibold">{formatMoney(totalReceivables)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Inventory Valuation (At Cost):</span>
                  <span className="font-semibold">{formatMoney(totalInventoryCost)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-sky-800 text-sm">
                  <span>Total Assets:</span>
                  <span>{formatMoney(totalAssets)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities & Equity */}
            <div className="space-y-3">
              <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider border-b border-slate-200 pb-2">
                Liabilities & Equity
              </h3>
              <div className="bg-slate-50 p-4 rounded-xl space-y-2 border border-slate-100">
                <div className="flex justify-between text-slate-700">
                  <span>Accounts Payable (Supplier Dues):</span>
                  <span className="font-semibold text-rose-600">{formatMoney(totalPayables)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-emerald-800 text-sm">
                  <span>Net Working Capital / Equity:</span>
                  <span>{formatMoney(netWorth)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: PRODUCT PROFIT */}
      {reportType === 'product_profit' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4 text-center">Units Sold</th>
                  <th className="py-3 px-4 text-right">Revenue</th>
                  <th className="py-3 px-4 text-right">Cost (COGS)</th>
                  <th className="py-3 px-4 text-right">Gross Profit</th>
                  <th className="py-3 px-4 text-right">Profit Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {productProfitReport.map((p, idx) => {
                  const marginPct = p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : '0';
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-slate-900">{p.name}</td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.sku}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-700">{p.unitsSold}</td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-900">{formatMoney(p.revenue)}</td>
                      <td className="py-3 px-4 text-right text-slate-500">{formatMoney(p.cogs)}</td>
                      <td className="py-3 px-4 text-right font-bold text-emerald-600">
                        +{formatMoney(p.profit)}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-slate-700">
                        {marginPct}%
                      </td>
                    </tr>
                  );
                })}
                {productProfitReport.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No sales recorded in the selected period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: DUES */}
      {reportType === 'dues' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Customer Receivables (Dues)</h3>
            <div className="space-y-2">
              {customers
                .filter((c) => c.currentBalance > 0)
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs"
                  >
                    <span className="font-medium text-slate-800">{c.name}</span>
                    <span className="font-bold text-rose-600">{formatMoney(c.currentBalance)}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-3">Supplier Payables (Dues)</h3>
            <div className="space-y-2">
              {suppliers
                .filter((s) => s.currentBalance > 0)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl text-xs"
                  >
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className="font-bold text-rose-600">{formatMoney(s.currentBalance)}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

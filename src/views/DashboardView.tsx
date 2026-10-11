import React, { useEffect, useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Users,
  CreditCard,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { useBusiness } from '../context/BusinessContext';
import {
  subscribeProducts,
  subscribeSales,
  subscribePurchases,
  subscribeCustomers,
  subscribeSuppliers,
  subscribeAccounts,
  subscribeExpenses,
  subscribeIncome,
} from '../services/dbService';
import {
  Product,
  Sale,
  Purchase,
  Customer,
  Supplier,
  FinancialAccount,
  Expense,
  Income,
} from '../types';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const DashboardView: React.FC<{ onNavigate: (tab: any) => void }> = ({ onNavigate }) => {
  const { activeBusiness, formatMoney } = useBusiness();

  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [accounts, setAccounts] = useState<FinancialAccount[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeBusiness) return;
    setLoading(true);

    const u1 = subscribeProducts(activeBusiness.id, setProducts);
    const u2 = subscribeSales(activeBusiness.id, setSales);
    const u3 = subscribePurchases(activeBusiness.id, setPurchases);
    const u4 = subscribeCustomers(activeBusiness.id, setCustomers);
    const u5 = subscribeSuppliers(activeBusiness.id, setSuppliers);
    const u6 = subscribeAccounts(activeBusiness.id, (accs) => {
      setAccounts(accs);
      setLoading(false);
    });
    const u7 = subscribeExpenses(activeBusiness.id, setExpenses);
    const u8 = subscribeIncome(activeBusiness.id, setIncome);

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

  // Aggregate calculations
  const metrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    const totalSales = sales.reduce((acc, s) => acc + (s.totalAmount || 0), 0);
    const todaySales = sales
      .filter((s) => s.date === todayStr)
      .reduce((acc, s) => acc + (s.totalAmount || 0), 0);

    const totalPurchases = purchases.reduce((acc, p) => acc + (p.totalAmount || 0), 0);

    // Cost of goods sold (COGS) based on sold items
    const totalCOGS = sales.reduce((acc, s) => {
      const itemsCost = s.items.reduce((sub, item) => sub + (item.purchasePrice || 0) * item.quantity, 0);
      return acc + itemsCost;
    }, 0);

    const grossProfit = totalSales - totalCOGS;

    const totalExpenses = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);
    const otherIncome = income
      .filter((i) => i.category !== 'Internal Transfer')
      .reduce((acc, i) => acc + (i.amount || 0), 0);

    const netProfit = grossProfit - totalExpenses + otherIncome;

    // Balances
    const cashBalance = accounts
      .filter((a) => a.type === 'cash')
      .reduce((acc, a) => acc + (a.currentBalance || 0), 0);

    const bankAndMfsBalance = accounts
      .filter((a) => a.type === 'bank' || a.type === 'mfs')
      .reduce((acc, a) => acc + (a.currentBalance || 0), 0);

    // Receivables (Customer dues)
    const receivables = customers.reduce((acc, c) => acc + Math.max(0, c.currentBalance || 0), 0);

    // Payables (Supplier dues)
    const payables = suppliers.reduce((acc, s) => acc + Math.max(0, s.currentBalance || 0), 0);

    // Inventory value (stock * purchase price)
    const inventoryValue = products.reduce(
      (acc, p) => acc + (p.currentStock || 0) * (p.purchasePrice || 0),
      0
    );

    // Low stock count
    const lowStockCount = products.filter((p) => p.currentStock <= (p.alertStock || 5)).length;

    return {
      totalSales,
      todaySales,
      totalPurchases,
      grossProfit,
      netProfit,
      totalExpenses,
      otherIncome,
      cashBalance,
      bankAndMfsBalance,
      receivables,
      payables,
      inventoryValue,
      totalProducts: products.length,
      lowStockCount,
    };
  }, [sales, purchases, expenses, income, accounts, customers, suppliers, products]);

  // Chart data: Monthly sales and profit trend
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentYear = new Date().getFullYear();

    const monthlySales = new Array(12).fill(0);
    const monthlyProfits = new Array(12).fill(0);

    sales.forEach((s) => {
      const d = new Date(s.date || s.createdAt);
      if (d.getFullYear() === currentYear) {
        const m = d.getMonth();
        monthlySales[m] += s.totalAmount || 0;

        const cogs = s.items.reduce((acc, item) => acc + (item.purchasePrice || 0) * item.quantity, 0);
        monthlyProfits[m] += (s.totalAmount || 0) - cogs;
      }
    });

    return {
      labels: months,
      datasets: [
        {
          label: 'Sales Revenue',
          data: monthlySales,
          borderColor: '#0284c7', // Sky 600
          backgroundColor: 'rgba(2, 132, 199, 0.1)',
          fill: true,
          tension: 0.3,
        },
        {
          label: 'Gross Profit',
          data: monthlyProfits,
          borderColor: '#10b981', // Emerald 500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          fill: true,
          tension: 0.3,
        },
      ],
    };
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="bg-gradient-to-r from-sky-50 via-white to-emerald-50 rounded-2xl p-6 border border-sky-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Business Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Live operational & accounting metrics for <strong>{activeBusiness?.name}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigate('sales')}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Sale / POS</span>
          </button>
          <button
            onClick={() => onNavigate('products')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs flex items-center gap-2"
          >
            <Package className="w-4 h-4" />
            <span>Manage Stock</span>
          </button>
        </div>
      </div>

      {/* Row 1: High Priority Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Sales</span>
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatMoney(metrics.totalSales)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Today's Sales: {formatMoney(metrics.todaySales)}</span>
          </div>
        </div>

        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-emerald-200 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Profit</span>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <p className={`text-2xl font-bold ${metrics.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
            {formatMoney(metrics.netProfit)}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <span>Gross: {formatMoney(metrics.grossProfit)}</span>
          </div>
        </div>

        {/* Cash & Bank Liquidity */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-sky-200 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cash & Bank Balance</span>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">
            {formatMoney(metrics.cashBalance + metrics.bankAndMfsBalance)}
          </p>
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>Cash: {formatMoney(metrics.cashBalance)}</span>
            <span>Bank/MFS: {formatMoney(metrics.bankAndMfsBalance)}</span>
          </div>
        </div>

        {/* Receivables & Payables */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:border-slate-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Receivables / Payables</span>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Due From Customers:</span>
              <span className="font-bold text-emerald-600">{formatMoney(metrics.receivables)}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500">Due To Suppliers:</span>
              <span className="font-bold text-rose-600">{formatMoney(metrics.payables)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Secondary operational metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Total Purchases</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatMoney(metrics.totalPurchases)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Total Expenses</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatMoney(metrics.totalExpenses)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Inventory Valuation</p>
          <p className="text-lg font-bold text-slate-900 mt-0.5">{formatMoney(metrics.inventoryValue)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
          <p className="text-[11px] font-medium text-slate-500">Low Stock Alerts</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-lg font-bold text-slate-900">{metrics.lowStockCount}</span>
            {metrics.lowStockCount > 0 && (
              <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                Action Needed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Charts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Revenue & Profit Trends</h2>
              <p className="text-xs text-slate-500">Monthly breakdown for current fiscal year</p>
            </div>
            <span className="text-xs font-semibold bg-sky-50 text-sky-700 px-2.5 py-1 rounded-lg">
              Live Chart.js
            </span>
          </div>

          <div className="h-72 w-full">
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: { boxWidth: 12, font: { size: 12 } },
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                  },
                  x: {
                    grid: { display: false },
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Low Stock Watchlist */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Stock Alert</span>
              </h2>
              <button
                onClick={() => onNavigate('products')}
                className="text-xs text-sky-600 hover:text-sky-700 font-semibold"
              >
                View All
              </button>
            </div>

            {products.filter((p) => p.currentStock <= (p.alertStock || 5)).length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                <Package className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                All product stock levels are healthy!
              </div>
            ) : (
              <div className="space-y-3">
                {products
                  .filter((p) => p.currentStock <= (p.alertStock || 5))
                  .slice(0, 5)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-semibold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">SKU: {p.sku}</p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                          {p.currentStock} {p.unit}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Threshold: {p.alertStock}</p>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <button
              onClick={() => onNavigate('purchases')}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              Order Stock from Suppliers
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: Recent Sales Invoices */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Sales Invoices</h2>
            <p className="text-xs text-slate-500">Latest customer orders and payment states</p>
          </div>
          <button
            onClick={() => onNavigate('sales')}
            className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1"
          >
            <span>All Sales</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-right">Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.slice(0, 5).map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono font-semibold text-sky-700">
                    #{sale.invoiceNumber}
                  </td>
                  <td className="py-3 px-4 text-slate-500">{sale.date}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">
                    {sale.customerName || 'Walk-in'}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatMoney(sale.totalAmount)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-600 font-medium">
                    {formatMoney(sale.paidAmount)}
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
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No sales recorded yet. Click "New Sale / POS" to create your first invoice!
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

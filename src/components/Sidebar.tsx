import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Truck,
  Users,
  Building,
  Landmark,
  BarChart3,
  RotateCcw,
  Settings,
  ShieldCheck,
  ShieldAlert,
  MessageCircle,
  HelpCircle,
  ChevronRight,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';

export type NavTab =
  | 'dashboard'
  | 'sales'
  | 'products'
  | 'purchases'
  | 'customers'
  | 'suppliers'
  | 'accounting'
  | 'reports'
  | 'returns'
  | 'audit'
  | 'settings'
  | 'firebase'
  | 'support';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
}) => {
  const { currentRole } = useBusiness();

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; allowedRoles?: string[] }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'sales', label: 'Sales & POS', icon: <ShoppingCart className="w-5 h-5" /> },
    {
      id: 'products',
      label: 'Products & Stock',
      icon: <Package className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'inventory_manager'],
    },
    {
      id: 'purchases',
      label: 'Purchases',
      icon: <Truck className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    },
    { id: 'customers', label: 'Customers', icon: <Users className="w-5 h-5" /> },
    {
      id: 'suppliers',
      label: 'Suppliers',
      icon: <Building className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    },
    {
      id: 'accounting',
      label: 'Accounting & Accounts',
      icon: <Landmark className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    },
    {
      id: 'reports',
      label: 'Financial Reports',
      icon: <BarChart3 className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    },
    { id: 'returns', label: 'Returns & Refunds', icon: <RotateCcw className="w-5 h-5" /> },
    {
      id: 'audit',
      label: 'Security & Audit Log',
      icon: <ShieldAlert className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin', 'manager', 'accountant'],
    },
    {
      id: 'settings',
      label: 'Business & Team',
      icon: <Settings className="w-5 h-5" />,
      allowedRoles: ['owner', 'admin'],
    },
    { id: 'firebase', label: 'Firebase & Deploy', icon: <ShieldCheck className="w-5 h-5" /> },
    { id: 'support', label: 'Help & WhatsApp', icon: <HelpCircle className="w-5 h-5" /> },
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(currentRole);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 md:hidden backdrop-blur-xs transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-3 py-2">
            Operations
          </div>

          {filteredNavItems.map((item) => {
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectTab(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-sky-50 text-sky-700 shadow-xs font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-sky-600' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-4 h-4 text-sky-500" />}
              </button>
            );
          })}
        </div>

        {/* WhatsApp Direct Support Card at Bottom */}
        <div className="p-4 border-t border-slate-100 bg-sky-50/50">
          <div className="p-3 bg-white rounded-xl border border-sky-100 shadow-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-slate-900">Direct Support</span>
            </div>
            <p className="text-xs text-slate-600 font-medium">Owner: DIL Mohammad Sohel</p>
            <p className="text-xs text-slate-500 mb-2">WhatsApp: 01789637029</p>
            <a
              href="https://wa.me/01789637029"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition shadow-xs"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Chat on WhatsApp</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};

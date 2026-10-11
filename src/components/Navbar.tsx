import React, { useState } from 'react';
import {
  Building2,
  LogOut,
  User,
  Shield,
  HelpCircle,
  Menu,
  X,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  MessageCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useBusiness } from '../context/BusinessContext';

interface NavbarProps {
  onOpenSupport: () => void;
  onOpenFirebaseSetup: () => void;
  isOnline: boolean;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSupport,
  onOpenFirebaseSetup,
  isOnline,
  onToggleSidebar,
}) => {
  const { currentUser, userProfile, logout } = useAuth();
  const { activeBusiness, userBusinesses, switchBusiness, currentRole } = useBusiness();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const roleLabelMap: Record<string, string> = {
    owner: 'Owner',
    admin: 'Administrator',
    manager: 'Manager',
    salesperson: 'Salesperson',
    accountant: 'Accountant',
    inventory_manager: 'Inventory Manager',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-sky-100 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Left: Mobile hamburger & Brand */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:text-sky-600 hover:bg-sky-50 focus:outline-hidden"
            aria-label="Toggle Navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <img
              src="https://imgur.com/XjO7IJK.jpg"
              alt="DMS Solution Logo"
              className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white p-0.5 shadow-xs"
              onError={(e) => {
                // Fallback icon if imgur image takes time to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  DMS <span className="text-sky-600">Solution</span>
                </span>
                <span className="hidden sm:inline-flex text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Business SaaS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden md:block">
                Powered by DIL Mohammad Sohel
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right: Business Switcher & Controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Active Business Selector */}
          {activeBusiness && (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-sm font-medium transition"
              >
                <Building2 className="w-4 h-4 text-sky-600" />
                <span className="max-w-[120px] sm:max-w-[180px] truncate">{activeBusiness.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {dropdownOpen && (
                <div
                  className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95"
                  onMouseLeave={() => setDropdownOpen(false)}
                >
                  <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Switch Business
                  </div>
                  {userBusinesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => {
                        switchBusiness(biz.id);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-sky-50 transition ${
                        biz.id === activeBusiness.id ? 'bg-sky-50/70 font-semibold text-sky-700' : 'text-slate-700'
                      }`}
                    >
                      <span className="truncate">{biz.name}</span>
                      {biz.id === activeBusiness.id && <span className="text-xs text-sky-600">Active</span>}
                    </button>
                  ))}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1.5">
                    <p className="text-[11px] text-slate-500">
                      Role: <span className="font-semibold text-slate-700">{roleLabelMap[currentRole] || currentRole}</span>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Backend Status indicator */}
          <button
            onClick={onOpenFirebaseSetup}
            title={isOnline ? 'Firebase Connected' : 'Firebase Offline / Needs Configuration'}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <span className="hidden sm:inline text-slate-700">{isOnline ? 'Firebase Connected' : 'Setup DB'}</span>
          </button>

          {/* Direct WhatsApp Support */}
          <a
            href="https://wa.me/01789637029"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-medium shadow-xs transition"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="hidden md:inline">WhatsApp: 01789637029</span>
            <span className="md:hidden">Support</span>
          </a>

          {/* User profile menu */}
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-full border border-slate-200 hover:ring-2 hover:ring-sky-200 transition"
            >
              <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
                {currentUser?.displayName?.[0] || currentUser?.email?.[0] || 'U'}
              </div>
            </button>

            {userMenuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95"
                onMouseLeave={() => setUserMenuOpen(false)}
              >
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {userProfile?.displayName || currentUser?.displayName || 'User'}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{currentUser?.email}</p>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 px-2 py-0.5 rounded-sm font-medium">
                    <Shield className="w-3 h-3" />
                    <span>{roleLabelMap[currentRole] || currentRole}</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenSupport();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400" />
                  <span>Help & Contact Owner</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenFirebaseSetup();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                >
                  <Shield className="w-4 h-4 text-slate-400" />
                  <span>Firebase & Security Rules</span>
                </button>

                <div className="border-t border-slate-100 my-1"></div>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 font-medium"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

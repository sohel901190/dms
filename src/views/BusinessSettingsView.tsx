import React, { useState } from 'react';
import {
  Settings,
  Users,
  Building,
  Shield,
  Save,
  UserPlus,
  Trash2,
  CheckCircle2,
  Upload,
  MessageCircle,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../services/storageService';
import { UserRole } from '../types';

export const BusinessSettingsView: React.FC = () => {
  const { activeBusiness, updateBusiness, members, addMember, removeMember, currentRole } = useBusiness();
  const { currentUser } = useAuth();

  // Profile form state
  const [name, setName] = useState(activeBusiness?.name || '');
  const [businessType, setBusinessType] = useState(activeBusiness?.businessType || 'Retail & Wholesale');
  const [phone, setPhone] = useState(activeBusiness?.phone || '01789637029');
  const [whatsapp, setWhatsapp] = useState(activeBusiness?.whatsapp || '01789637029');
  const [email, setEmail] = useState(activeBusiness?.email || '');
  const [address, setAddress] = useState(activeBusiness?.address || '');
  const [currency, setCurrency] = useState(activeBusiness?.currency || 'BDT');
  const [currencySymbol, setCurrencySymbol] = useState(activeBusiness?.currencySymbol || '৳');
  const [logoUrl, setLogoUrl] = useState(activeBusiness?.logoUrl || 'https://imgur.com/XjO7IJK.jpg');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Invite Member state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('salesperson');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      let finalLogo = logoUrl;
      if (logoFile) {
        const res = await uploadImage(logoFile, `businesses/${activeBusiness.id}/branding`);
        if (res.success && res.url) finalLogo = res.url;
      }

      await updateBusiness({
        name,
        businessType,
        phone,
        whatsapp,
        email,
        address,
        currency,
        currencySymbol,
        logoUrl: finalLogo,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || 'Failed to update business profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);

    try {
      await addMember(inviteEmail.trim(), inviteRole, inviteName.trim() || undefined);
      setInviteEmail('');
      setInviteName('');
      setInviteRole('salesperson');
    } catch (err: any) {
      alert(err?.message || 'Failed to add member');
    } finally {
      setInviting(false);
    }
  };

  const roleLabels: Record<UserRole, string> = {
    owner: 'Business Owner',
    admin: 'Administrator',
    manager: 'Operations Manager',
    salesperson: 'Salesperson',
    accountant: 'Accountant',
    inventory_manager: 'Inventory Manager',
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Settings & Team</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Manage business profile, branding, currency, and role-based staff permissions
        </p>
      </div>

      {/* Business Details Form */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Business Profile & Info</h2>
          </div>
          {saveSuccess && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Settings Saved Successfully
            </span>
          )}
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Business Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Business Type</label>
              <input
                type="text"
                placeholder="Retail, Wholesale, Manufacturing, Services..."
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp</label>
              <input
                type="text"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Currency Code & Symbol</label>
              <div className="flex gap-2">
                <select
                  value={currency}
                  onChange={(e) => {
                    const c = e.target.value;
                    setCurrency(c);
                    setCurrencySymbol(c === 'BDT' ? '৳' : c === 'USD' ? '$' : c === 'EUR' ? '€' : c);
                  }}
                  className="w-1/2 text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="BDT">BDT (Bangladeshi Taka)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="GBP">GBP (British Pound)</option>
                </select>
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  className="w-1/2 text-xs p-2.5 border border-slate-200 rounded-xl font-bold"
                  placeholder="Symbol (e.g. ৳)"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Address / Location</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Business Logo */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">Business Logo</label>
            <div className="flex items-center gap-4">
              <img
                src={logoUrl}
                alt="Logo"
                className="w-14 h-14 object-contain rounded-xl border border-slate-200 p-1 bg-white shadow-xs"
              />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setLogoFile(e.target.files[0]);
                    setLogoUrl(URL.createObjectURL(e.target.files[0]));
                  }
                }}
                className="text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving Changes...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Team & Role Management */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Authorized Team Members & Roles</h2>
          </div>
        </div>

        {/* Invite Form */}
        {(currentRole === 'owner' || currentRole === 'admin') && (
          <form onSubmit={handleAddMember} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <p className="text-xs font-bold text-slate-700">Add Staff Member</p>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="employee@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Name (Optional)</label>
                <input
                  type="text"
                  placeholder="Staff Name"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-medium text-slate-500 block mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg capitalize"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="salesperson">Salesperson</option>
                  <option value="accountant">Accountant</option>
                  <option value="inventory_manager">Inventory Manager</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={inviting}
                  className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition"
                >
                  {inviting ? 'Adding...' : 'Add Member'}
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="border border-slate-100 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Team Member</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Joined Date</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Business Owner row */}
              <tr className="bg-sky-50/30">
                <td className="py-3 px-3 font-semibold text-slate-900">
                  <div>{activeBusiness?.ownerName}</div>
                  <div className="text-[10px] text-slate-500">Business Creator</div>
                </td>
                <td className="py-3 px-3">
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px] uppercase">
                    Owner
                  </span>
                </td>
                <td className="py-3 px-3 text-slate-500">{activeBusiness?.createdAt.split('T')[0]}</td>
                <td className="py-3 px-3 text-center text-slate-400 text-[10px]">Primary</td>
              </tr>

              {members
                .filter((m) => m.userId !== activeBusiness?.ownerId)
                .map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-800">
                      <div>{m.displayName}</div>
                      <div className="text-[10px] text-slate-400">{m.email}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full text-[10px]">
                        {roleLabels[m.role]}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">{m.joinedAt.split('T')[0]}</td>
                    <td className="py-3 px-3 text-center">
                      {(currentRole === 'owner' || currentRole === 'admin') && (
                        <button
                          onClick={() => removeMember(m.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                          title="Remove Member"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Role Permissions Matrix Guide */}
        <div className="p-4 bg-slate-50 rounded-xl text-xs space-y-2 border border-slate-100 text-slate-600">
          <p className="font-bold text-slate-800 flex items-center gap-1.5">
            <Shield className="w-4 h-4 text-sky-600" />
            <span>Role Permissions Matrix</span>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-[11px]">
            <li><strong>Owner / Admin:</strong> Full permissions across all modules, financials, and team management.</li>
            <li><strong>Manager:</strong> Can manage products, POS sales, purchases, customers, and view reports.</li>
            <li><strong>Salesperson:</strong> Restricted to POS checkout and customer lookups only. Cannot view financial reports or back-office settings.</li>
            <li><strong>Accountant:</strong> Full access to accounts, cashbook, bankbook, expenses, income, receipts, and P&L.</li>
            <li><strong>Inventory Manager:</strong> Focused on product stock levels, purchase bills receiving, and inventory valuation.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

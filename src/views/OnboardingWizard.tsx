import React, { useState } from 'react';
import {
  Building2,
  ArrowRight,
  CheckCircle2,
  DollarSign,
  Phone,
  MessageCircle,
  MapPin,
  Briefcase,
  Upload,
} from 'lucide-react';
import { useBusiness } from '../context/BusinessContext';
import { useAuth } from '../context/AuthContext';
import { uploadImage } from '../services/storageService';

export const OnboardingWizard: React.FC = () => {
  const { createBusiness } = useBusiness();
  const { currentUser } = useAuth();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [ownerName, setOwnerName] = useState(currentUser?.displayName || '');
  const [businessType, setBusinessType] = useState('Retail & Wholesale');
  const [phone, setPhone] = useState('01789637029');
  const [whatsapp, setWhatsapp] = useState('01789637029');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [address, setAddress] = useState('Dhaka, Bangladesh');
  const [currency, setCurrency] = useState('BDT');
  const [openingCashBalance, setOpeningCashBalance] = useState<number>(10000);
  const [logoUrl, setLogoUrl] = useState('https://imgur.com/XjO7IJK.jpg');
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFinish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please provide your business name');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      let finalLogo = logoUrl;
      if (logoFile) {
        const uploadRes = await uploadImage(logoFile, 'onboarding_logos');
        if (uploadRes.success && uploadRes.url) {
          finalLogo = uploadRes.url;
        }
      }

      await createBusiness({
        name: name.trim(),
        ownerName: ownerName.trim() || 'Owner',
        businessType,
        phone,
        whatsapp,
        email,
        address,
        currency,
        openingCashBalance,
        logoUrl: finalLogo,
      });
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to initialize business');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-3xl shadow-xl border border-sky-100 overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-sky-800 p-6 text-white text-center">
          <img
            src="https://imgur.com/XjO7IJK.jpg"
            alt="DMS Solution"
            className="w-14 h-14 mx-auto rounded-xl border border-white/40 bg-white p-1 mb-2 object-contain shadow-xs"
          />
          <h1 className="text-xl font-bold">Welcome to DMS Solution</h1>
          <p className="text-xs text-sky-100 mt-0.5">Let's set up your business workspace in 2 quick steps</p>

          <div className="flex justify-center gap-2 mt-4">
            <span className={`w-8 h-1.5 rounded-full ${step === 1 ? 'bg-white' : 'bg-white/40'}`} />
            <span className={`w-8 h-1.5 rounded-full ${step === 2 ? 'bg-white' : 'bg-white/40'}`} />
          </div>
        </div>

        {errorMsg && (
          <div className="m-6 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* STEP 1: Core Details */}
        {step === 1 && (
          <div className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-sky-600" />
              <span>Step 1: Business Identity & Contact</span>
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Business Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Super Shop or Sohel Enterprise"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Owner Name</label>
                <input
                  type="text"
                  placeholder="DIL Mohammad Sohel"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Business Type</label>
                <select
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                >
                  <option value="Retail & Wholesale">Retail & Wholesale</option>
                  <option value="Super Shop / Grocery">Super Shop / Grocery</option>
                  <option value="Electronics & IT">Electronics & IT</option>
                  <option value="Apparel & Fashion">Apparel & Fashion</option>
                  <option value="Pharmacy / Healthcare">Pharmacy / Healthcare</option>
                  <option value="Manufacturing & Trading">Manufacturing & Trading</option>
                  <option value="Services">Services</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">WhatsApp Support Number</label>
                <input
                  type="text"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
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

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!name.trim()) {
                    setErrorMsg('Please enter your business name.');
                    return;
                  }
                  setErrorMsg(null);
                  setStep(2);
                }}
                className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
              >
                <span>Continue to Step 2</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Currency & Initial Balance */}
        {step === 2 && (
          <form onSubmit={handleFinish} className="p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Currency & Opening Balances</span>
            </h2>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Operational Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl"
              >
                <option value="BDT">BDT (Bangladeshi Taka - ৳)</option>
                <option value="USD">USD (US Dollar - $)</option>
                <option value="EUR">EUR (Euro - €)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Opening Cash Balance (Starting Drawer Cash)
              </label>
              <input
                type="number"
                min="0"
                value={openingCashBalance}
                onChange={(e) => setOpeningCashBalance(parseFloat(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-slate-200 rounded-xl font-bold text-slate-900"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                A primary Cash Drawer account will be automatically initialized with this amount.
              </p>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Business Logo</label>
              <div className="flex items-center gap-3">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="w-12 h-12 object-contain rounded-lg border border-slate-200 p-1 bg-white"
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
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-sky-50 file:text-sky-700"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 rounded-xl border border-slate-200"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Initializing Business...' : 'Launch DMS Solution'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

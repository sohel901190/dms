import React from 'react';
import { MessageCircle, Phone, Mail, ExternalLink, X, Shield, Award, CheckCircle2 } from 'lucide-react';

interface HelpSupportModalProps {
  onClose: () => void;
}

export const HelpSupportModal: React.FC<HelpSupportModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95">
        {/* Banner with brand logo & styling */}
        <div className="relative bg-gradient-to-r from-sky-600 to-sky-800 p-6 text-white text-center">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src="https://imgur.com/XjO7IJK.jpg"
            alt="DMS Solution"
            className="w-16 h-16 mx-auto rounded-xl shadow-md border-2 border-white/50 bg-white p-1 mb-3 object-contain"
          />
          <h2 className="text-2xl font-bold tracking-tight">DMS Solution</h2>
          <p className="text-sky-100 text-xs mt-1">
            Enterprise SaaS Business Management System
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="bg-sky-50 rounded-xl p-4 border border-sky-100">
            <div className="flex items-start gap-3">
              <Award className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-sky-900 uppercase tracking-wider">
                  System Ownership & Support
                </p>
                <p className="text-base font-bold text-slate-900 mt-0.5">
                  Owner: DIL Mohammad Sohel
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Full production multi-tenant business software for inventory, point of sale, supplier supply chain, and double-entry accounting.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Contact Channels
            </div>

            {/* Direct WhatsApp Callout */}
            <a
              href="https://wa.me/01789637029"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl transition group"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-emerald-800 font-medium">WhatsApp Support (Fast Response)</p>
                  <p className="text-base font-bold text-slate-900">01789637029</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-700 text-xs font-semibold group-hover:translate-x-0.5 transition">
                <span>Chat Now</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </div>
            </a>

            {/* Phone */}
            <a
              href="tel:01789637029"
              className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition"
            >
              <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                <Phone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[11px] text-slate-500">Phone</p>
                <p className="text-sm font-semibold text-slate-800">01789637029</p>
              </div>
            </a>
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span>DMS Solution Version 2.0</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              24/7 Production Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

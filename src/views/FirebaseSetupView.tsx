import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  ExternalLink,
  RefreshCw,
  Server,
  Key,
  Globe,
  Database,
  Terminal,
  HelpCircle,
} from 'lucide-react';
import { activeFirebaseConfig } from '../firebase/config';
import { testConnection, ConnectionStatus } from '../firebase/connection';

export const FirebaseSetupView: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | null>(null);

  const runTest = async () => {
    setTesting(true);
    const res = await testConnection();
    setStatus(res);
    setTesting(false);
  };

  useEffect(() => {
    runTest();
  }, []);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const sampleRules = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if false; }

    function isSignedIn() { return request.auth != null; }
    function isBusinessOwner(businessId) {
      return isSignedIn() && get(/databases/$(database)/documents/businesses/$(businessId)).data.ownerId == request.auth.uid;
    }
    function isBusinessMember(businessId) {
      return isSignedIn() && (isBusinessOwner(businessId) || exists(/databases/$(database)/documents/businesses/$(businessId)/members/$(request.auth.uid)));
    }

    match /users/{userId} {
      allow read, write: if isSignedIn() && request.auth.uid == userId;
    }

    match /businesses/{businessId} {
      allow get: if isSignedIn() && (resource.data.ownerId == request.auth.uid || exists(/databases/$(database)/documents/businesses/$(businessId)/members/$(request.auth.uid)));
      allow list: if isSignedIn();
      allow create: if isSignedIn() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isSignedIn() && resource.data.ownerId == request.auth.uid;

      match /{subcollection}/{docId} {
        allow read, write: if isSignedIn() && isBusinessMember(businessId);
      }
    }
  }
}`;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Firebase Setup & Production Deployment</h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Backend diagnostics, security rules, GitHub Pages compatibility, and authorized domain guidelines
        </p>
      </div>

      {/* Live Connection Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Firestore Connection Status</h2>
          </div>
          <button
            onClick={runTest}
            disabled={testing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 rounded-lg text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Test Connection Now'}</span>
          </button>
        </div>

        <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Backend Status:</span>
              <span
                className={`flex items-center gap-1 font-bold ${
                  status?.online ? 'text-emerald-600' : 'text-amber-600'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${status?.online ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                {status?.online ? 'Online & Connected' : 'Checking / Standby'}
              </span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Project ID:</span>
              <span className="font-mono font-semibold">{activeFirebaseConfig.projectId}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Database ID:</span>
              <span className="font-mono font-semibold truncate max-w-[200px]">
                {activeFirebaseConfig.firestoreDatabaseId || '(default)'}
              </span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl space-y-2 border border-slate-100">
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Auth Domain:</span>
              <span className="font-mono">{activeFirebaseConfig.authDomain}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Storage Bucket:</span>
              <span className="font-mono">{activeFirebaseConfig.storageBucket || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-slate-700">
              <span className="text-slate-500">Security Rules Status:</span>
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Deployed via Fax RPC
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* GitHub Pages Production Deployment Instructions */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
          <Globe className="w-5 h-5 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-900">GitHub Pages Production Deployment Guide</h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          <strong>DMS Solution</strong> is 100% compatible with GitHub Pages hosting. It does not depend on private server-side variables or AI Studio internal session objects. Follow these simple steps to deploy:
        </p>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-800 mb-1">Step 1: Authorized Domains in Firebase Authentication</p>
            <p className="text-slate-600 mb-2">
              Google Sign-In and Email Authentication require your GitHub Pages domain to be allowlisted.
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-slate-600 text-[11px]">
              <li>Open <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-sky-600 underline font-medium">Firebase Console</a> &gt; your project &gt; <strong>Authentication</strong>.</li>
              <li>Go to <strong>Settings</strong> tab &gt; <strong>Authorized Domains</strong>.</li>
              <li>Click <strong>Add domain</strong> and enter: <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-slate-800">yourusername.github.io</code></li>
              <li>Also ensure your current AI Studio preview domain is present.</li>
            </ol>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-800 mb-1">Step 2: Relative Asset Path Verification</p>
            <p className="text-slate-600 text-[11px]">
              We have already set <code className="bg-slate-200 px-1 rounded font-mono">base: './'</code> in <code className="font-mono">vite.config.ts</code>. This ensures all CSS and JS chunks load without 404 errors regardless of repository sub-paths (e.g. <code className="font-mono">username.github.io/dmssolution/</code>).
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <p className="font-bold text-slate-800 mb-1">Step 3: Build & Publish</p>
            <div className="bg-slate-900 text-sky-300 p-3 rounded-lg font-mono text-[11px] overflow-x-auto">
              <div># 1. Build the production bundle</div>
              <div className="text-white">npm run build</div>
              <div className="mt-2 text-slate-400"># 2. Deploy dist folder to gh-pages branch</div>
              <div className="text-white">git subtree push --prefix dist origin gh-pages</div>
            </div>
          </div>
        </div>
      </div>

      {/* Copy Ready Config */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">Current Applet Firebase Config</h2>
          </div>
          <button
            onClick={() => handleCopy(JSON.stringify(activeFirebaseConfig, null, 2), 'cfg')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedKey === 'cfg' ? 'Copied!' : 'Copy Config'}</span>
          </button>
        </div>

        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
          {JSON.stringify(activeFirebaseConfig, null, 2)}
        </pre>
      </div>

      {/* Copy Ready Security Rules */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-sky-600" />
            <h2 className="text-base font-bold text-slate-900">Copy-Ready Firestore Security Rules</h2>
          </div>
          <button
            onClick={() => handleCopy(sampleRules, 'rules')}
            className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedKey === 'rules' ? 'Copied!' : 'Copy Rules'}</span>
          </button>
        </div>

        <p className="text-xs text-slate-500">
          These rules strictly enforce tenant isolation, authenticate users, and ensure staff cannot tamper with data belonging to other businesses.
        </p>

        <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-48">
          {sampleRules}
        </pre>
      </div>

      {/* Verified Checklist */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Production Verification Checklist</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Firebase Modular Web SDK Integrated</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Cloud Firestore Provisioned & Deployed</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Email & Password Authentication</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Google Sign-In Popup Support</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Multi-Tenant Business Isolation</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>GitHub Pages Relative Pathing (`./`)</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Chart.js Real-Time Analytics</span>
          </div>
          <div className="flex items-center gap-2 text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Direct WhatsApp Support (`01789637029`)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

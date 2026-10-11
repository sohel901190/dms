import React from 'react';
import { Printer, X, Download, Share2, CheckCircle2 } from 'lucide-react';
import { Sale, Business } from '../types';

interface PrintInvoiceModalProps {
  sale: Sale;
  business: Business;
  onClose: () => void;
}

export const PrintInvoiceModal: React.FC<PrintInvoiceModalProps> = ({
  sale,
  business,
  onClose,
}) => {
  const handlePrint = () => {
    window.print();
  };

  const currency = business.currencySymbol || '৳';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Action Header (hidden in print) */}
        <div className="print:hidden p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 text-sm">Invoice Preview</span>
            <span className="text-xs bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full font-mono">
              #{sale.invoiceNumber}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition shadow-xs"
            >
              <Printer className="w-4 h-4" />
              <span>Print Invoice</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Container */}
        <div className="p-8 overflow-y-auto bg-white font-sans text-slate-800" id="printable-area">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-6 mb-6">
            <div className="flex items-center gap-4">
              {business.logoUrl ? (
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  className="w-16 h-16 object-contain rounded-lg border border-slate-100 p-1 bg-white"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-sky-600 text-white font-bold text-2xl flex items-center justify-center">
                  {business.name[0]}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-slate-900">{business.name}</h1>
                <p className="text-xs text-slate-500">{business.businessType}</p>
                {business.address && <p className="text-xs text-slate-500">{business.address}</p>}
                <p className="text-xs text-slate-500">
                  Phone: {business.phone} | WhatsApp: {business.whatsapp}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-xl font-black text-sky-700 tracking-wider uppercase">INVOICE</span>
              <p className="text-xs font-mono text-slate-600 mt-1">#{sale.invoiceNumber}</p>
              <p className="text-xs text-slate-500">Date: {sale.date}</p>
              <div className="mt-2 inline-block">
                <span
                  className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    sale.status === 'paid'
                      ? 'bg-emerald-100 text-emerald-800'
                      : sale.status === 'partial'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {sale.status}
                </span>
              </div>
            </div>
          </div>

          {/* Customer / Billed To */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Billed To
              </p>
              <p className="font-bold text-slate-800 text-sm">{sale.customerName || 'Walk-in Customer'}</p>
              {sale.customerPhone && <p className="text-slate-600 mt-0.5">Phone: {sale.customerPhone}</p>}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Payment Info
              </p>
              <p className="text-slate-700 font-medium capitalize">
                Method: {sale.paymentMethod}
              </p>
              {sale.accountName && <p className="text-slate-500">Account: {sale.accountName}</p>}
              {sale.createdByName && <p className="text-slate-500">Sold By: {sale.createdByName}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-200 text-slate-600">
                  <th className="py-2 px-1">#</th>
                  <th className="py-2 px-2">Item Description</th>
                  <th className="py-2 px-2 text-center">Unit</th>
                  <th className="py-2 px-2 text-right">Price</th>
                  <th className="py-2 px-2 text-center">Qty</th>
                  <th className="py-2 px-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-1 text-slate-400">{index + 1}</td>
                    <td className="py-2.5 px-2 font-medium text-slate-800">
                      <div>{item.productName}</div>
                      {item.sku && <div className="text-[10px] text-slate-400 font-mono">{item.sku}</div>}
                    </td>
                    <td className="py-2.5 px-2 text-center text-slate-600">{item.unit || 'pcs'}</td>
                    <td className="py-2.5 px-2 text-right text-slate-700">
                      {currency}{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-center font-semibold text-slate-800">
                      {item.quantity}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-slate-900">
                      {currency}{item.total.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          <div className="flex justify-end mb-8">
            <div className="w-64 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal:</span>
                <span className="font-semibold">{currency}{sale.subtotal.toFixed(2)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount:</span>
                  <span>-{currency}{sale.discount.toFixed(2)}</span>
                </div>
              )}
              {sale.tax > 0 && (
                <div className="flex justify-between text-slate-600">
                  <span>Tax / VAT:</span>
                  <span>+{currency}{sale.tax.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total:</span>
                <span>{currency}{sale.totalAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>Paid Amount:</span>
                <span>{currency}{sale.paidAmount.toFixed(2)}</span>
              </div>
              {sale.dueAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-bold border-t border-rose-100 pt-1">
                  <span>Balance Due:</span>
                  <span>{currency}{sale.dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Footer Note */}
          <div className="border-t border-slate-200 pt-4 text-center text-[11px] text-slate-500">
            <p className="font-medium text-slate-700">Thank you for your business!</p>
            <p className="mt-1">
              Generated by <strong>DMS Solution</strong> • Support WhatsApp: {business.whatsapp || '01789637029'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

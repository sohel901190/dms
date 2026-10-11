import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  runTransaction,
  writeBatch,
  increment,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import {
  Product,
  ProductCategory,
  Sale,
  Purchase,
  Customer,
  Supplier,
  FinancialAccount,
  Expense,
  Income,
  AccountTransfer,
  StockMovement,
  ReturnRecord,
  AuditLog,
  AuditActionType,
  AuditCategory,
} from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

// Helper to generate clean IDs
export const createId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

/* =========================================================================
   PRODUCTS & CATEGORIES
   ========================================================================= */

export async function getProducts(businessId: string): Promise<Product[]> {
  const path = `businesses/${businessId}/products`;
  try {
    const q = query(collection(db, path), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product));
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, path);
  }
}

export function subscribeProducts(
  businessId: string,
  onData: (products: Product[]) => void,
  onError?: (err: any) => void
) {
  const path = `businesses/${businessId}/products`;
  const q = query(collection(db, path), orderBy('name', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
    },
    (err) => {
      onError?.(err);
      handleFirestoreError(err, OperationType.GET, path);
    }
  );
}

export async function saveProduct(businessId: string, product: Partial<Product>, isNew: boolean): Promise<string> {
  const id = isNew ? createId('prod') : product.id!;
  const path = `businesses/${businessId}/products/${id}`;
  try {
    const ref = doc(db, 'businesses', businessId, 'products', id);
    const data: Product = {
      id,
      businessId,
      name: product.name || 'Unnamed Product',
      sku: product.sku || ('SKU-' + Date.now().toString().slice(-6)),
      barcode: product.barcode || '',
      categoryId: product.categoryId || '',
      categoryName: product.categoryName || 'General',
      unit: product.unit || 'pcs',
      purchasePrice: Number(product.purchasePrice || 0),
      sellingPrice: Number(product.sellingPrice || 0),
      currentStock: Number(product.currentStock || 0),
      openingStock: Number(product.openingStock ?? product.currentStock ?? 0),
      alertStock: Number(product.alertStock || 5),
      imageUrl: product.imageUrl || '',
      notes: product.notes || '',
      createdAt: product.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(ref, data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProduct(businessId: string, productId: string): Promise<void> {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    await deleteDoc(doc(db, 'businesses', businessId, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function adjustProductStock(
  businessId: string,
  productId: string,
  changeQty: number, // positive for add, negative for deduct
  reason: string,
  userId: string,
  movementType: StockMovement['type'] = 'adjustment_in'
): Promise<void> {
  const path = `businesses/${businessId}/products/${productId}`;
  try {
    const prodRef = doc(db, 'businesses', businessId, 'products', productId);
    const prodSnap = await getDoc(prodRef);
    if (!prodSnap.exists()) throw new Error('Product not found');
    const prod = prodSnap.data() as Product;
    const oldStock = prod.currentStock;
    const newStock = Math.max(0, oldStock + changeQty);

    await updateDoc(prodRef, {
      currentStock: newStock,
      updatedAt: new Date().toISOString(),
    });

    // Log stock movement
    const movementId = createId('sm');
    await setDoc(doc(db, 'businesses', businessId, 'stock_movements', movementId), {
      id: movementId,
      businessId,
      productId,
      productName: prod.name,
      type: movementType,
      quantity: Math.abs(changeQty),
      previousStock: oldStock,
      newStock,
      reason,
      date: new Date().toISOString().split('T')[0],
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });

    // Automatic Audit Log for stock adjustments
    await recordAuditLog(businessId, {
      businessId,
      action: 'stock_adjusted',
      category: 'inventory',
      title: `Stock Adjusted: ${prod.name}`,
      details: `${changeQty >= 0 ? '+' : ''}${changeQty} ${prod.unit} adjustment applied (${movementType}). Previous stock: ${oldStock}, New stock: ${newStock}. Reason: ${reason}.`,
      performedBy: userId,
      performedByName: 'Inventory Manager',
      targetId: productId,
      metadata: {
        productId,
        productName: prod.name,
        changeQty,
        previousStock: oldStock,
        newStock,
        movementType,
        reason,
      },
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* Categories */
export function subscribeCategories(
  businessId: string,
  onData: (cats: ProductCategory[]) => void
) {
  const path = `businesses/${businessId}/categories`;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProductCategory)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function addCategory(businessId: string, name: string): Promise<void> {
  const id = createId('cat');
  const path = `businesses/${businessId}/categories/${id}`;
  try {
    await setDoc(doc(db, 'businesses', businessId, 'categories', id), {
      id,
      businessId,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* =========================================================================
   SALES & POS
   ========================================================================= */

export function subscribeSales(
  businessId: string,
  onData: (sales: Sale[]) => void
) {
  const path = `businesses/${businessId}/sales`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function recordSale(businessId: string, saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<string> {
  const saleId = createId('inv');
  const path = `businesses/${businessId}/sales/${saleId}`;
  try {
    const sale: Sale = {
      ...saleData,
      id: saleId,
      createdAt: new Date().toISOString(),
    };

    // 1. Save sale invoice
    await setDoc(doc(db, 'businesses', businessId, 'sales', saleId), sale);

    // 2. Deduct product stocks & record stock movements
    for (const item of sale.items) {
      const prodRef = doc(db, 'businesses', businessId, 'products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        const oldStock = prod.currentStock;
        const newStock = oldStock - item.quantity;
        await updateDoc(prodRef, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });

        // Stock movement
        const movId = createId('sm');
        await setDoc(doc(db, 'businesses', businessId, 'stock_movements', movId), {
          id: movId,
          businessId,
          productId: item.productId,
          productName: item.productName,
          type: 'sale',
          quantity: item.quantity,
          previousStock: oldStock,
          newStock,
          referenceId: saleId,
          reason: `Sale Invoice #${sale.invoiceNumber}`,
          date: sale.date,
          createdBy: sale.createdBy,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Update customer due balance if due exists
    if (sale.customerId && sale.dueAmount > 0) {
      const custRef = doc(db, 'businesses', businessId, 'customers', sale.customerId);
      const custSnap = await getDoc(custRef);
      if (custSnap.exists()) {
        const cust = custSnap.data() as Customer;
        await updateDoc(custRef, {
          currentBalance: (cust.currentBalance || 0) + sale.dueAmount,
        });
      }
    }

    // 4. Deposit paid amount into financial account if > 0
    if (sale.accountId && sale.paidAmount > 0) {
      const accRef = doc(db, 'businesses', businessId, 'accounts', sale.accountId);
      await updateDoc(accRef, {
        currentBalance: increment(sale.paidAmount),
      });
    }

    // 5. Automatic Audit Log for sales invoice creation
    await recordAuditLog(businessId, {
      businessId,
      action: 'invoice_created',
      category: 'sales',
      title: `Invoice #${sale.invoiceNumber} Created`,
      details: `Generated invoice for "${sale.customerName}". Total: ৳${sale.totalAmount}, Paid: ৳${sale.paidAmount}, Due: ৳${sale.dueAmount} (${sale.items.length} items sold). Status: ${sale.status}.`,
      performedBy: sale.createdBy,
      performedByName: sale.createdByName || 'Staff',
      targetId: saleId,
      metadata: {
        invoiceNumber: sale.invoiceNumber,
        customerName: sale.customerName,
        totalAmount: sale.totalAmount,
        paidAmount: sale.paidAmount,
        dueAmount: sale.dueAmount,
        itemsCount: sale.items.length,
        paymentMethod: sale.paymentMethod,
      },
    });

    return saleId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* =========================================================================
   PURCHASES & SUPPLIERS
   ========================================================================= */

export function subscribePurchases(
  businessId: string,
  onData: (purchases: Purchase[]) => void
) {
  const path = `businesses/${businessId}/purchases`;
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Purchase)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function recordPurchase(
  businessId: string,
  purchaseData: Omit<Purchase, 'id' | 'createdAt'>
): Promise<string> {
  const purchaseId = createId('bill');
  const path = `businesses/${businessId}/purchases/${purchaseId}`;
  try {
    const purchase: Purchase = {
      ...purchaseData,
      id: purchaseId,
      createdAt: new Date().toISOString(),
    };

    // 1. Save purchase bill
    await setDoc(doc(db, 'businesses', businessId, 'purchases', purchaseId), purchase);

    // 2. Increase product stocks & record stock movements
    for (const item of purchase.items) {
      const prodRef = doc(db, 'businesses', businessId, 'products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        const oldStock = prod.currentStock;
        const newStock = oldStock + item.quantity;
        await updateDoc(prodRef, {
          currentStock: newStock,
          purchasePrice: item.purchasePrice || prod.purchasePrice, // update latest cost price
          updatedAt: new Date().toISOString(),
        });

        // Stock movement
        const movId = createId('sm');
        await setDoc(doc(db, 'businesses', businessId, 'stock_movements', movId), {
          id: movId,
          businessId,
          productId: item.productId,
          productName: item.productName,
          type: 'purchase',
          quantity: item.quantity,
          previousStock: oldStock,
          newStock,
          referenceId: purchaseId,
          reason: `Purchase Bill #${purchase.billNumber}`,
          date: purchase.date,
          createdBy: purchase.createdBy,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. Update supplier payable due if due exists
    if (purchase.supplierId && purchase.dueAmount > 0) {
      const supRef = doc(db, 'businesses', businessId, 'suppliers', purchase.supplierId);
      const supSnap = await getDoc(supRef);
      if (supSnap.exists()) {
        const sup = supSnap.data() as Supplier;
        await updateDoc(supRef, {
          currentBalance: (sup.currentBalance || 0) + purchase.dueAmount,
        });
      }
    }

    // 4. Deduct paid amount from financial account if > 0
    if (purchase.accountId && purchase.paidAmount > 0) {
      const accRef = doc(db, 'businesses', businessId, 'accounts', purchase.accountId);
      await updateDoc(accRef, {
        currentBalance: increment(-purchase.paidAmount),
      });
    }

    // Automatic Audit Log for purchase bill
    await recordAuditLog(businessId, {
      businessId,
      action: 'purchase_created',
      category: 'purchases',
      title: `Purchase Bill #${purchase.billNumber} Recorded`,
      details: `Received purchase bill from "${purchase.supplierName}". Total: ৳${purchase.totalAmount}, Paid: ৳${purchase.paidAmount}, Due: ৳${purchase.dueAmount} (${purchase.items.length} items received).`,
      performedBy: purchase.createdBy,
      performedByName: purchase.createdByName || 'Staff',
      targetId: purchaseId,
      metadata: {
        billNumber: purchase.billNumber,
        supplierName: purchase.supplierName,
        totalAmount: purchase.totalAmount,
        paidAmount: purchase.paidAmount,
        dueAmount: purchase.dueAmount,
        itemCount: purchase.items.length,
      },
    });

    return purchaseId;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* =========================================================================
   CUSTOMERS & SUPPLIERS DIRECTORY
   ========================================================================= */

export function subscribeCustomers(
  businessId: string,
  onData: (customers: Customer[]) => void
) {
  const path = `businesses/${businessId}/customers`;
  return onSnapshot(
    query(collection(db, path), orderBy('name', 'asc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Customer)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function saveCustomer(businessId: string, customer: Partial<Customer>): Promise<string> {
  const isNew = !customer.id;
  const id = customer.id || createId('cust');
  const path = `businesses/${businessId}/customers/${id}`;
  try {
    const data: Customer = {
      id,
      businessId,
      name: customer.name || 'Walk-in Customer',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      email: customer.email || '',
      address: customer.address || '',
      openingBalance: Number(customer.openingBalance || 0),
      currentBalance: Number(customer.currentBalance ?? customer.openingBalance ?? 0),
      createdAt: customer.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'customers', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export function subscribeSuppliers(
  businessId: string,
  onData: (suppliers: Supplier[]) => void
) {
  const path = `businesses/${businessId}/suppliers`;
  return onSnapshot(
    query(collection(db, path), orderBy('name', 'asc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function saveSupplier(businessId: string, supplier: Partial<Supplier>): Promise<string> {
  const isNew = !supplier.id;
  const id = supplier.id || createId('sup');
  const path = `businesses/${businessId}/suppliers/${id}`;
  try {
    const data: Supplier = {
      id,
      businessId,
      name: supplier.name || 'Vendor',
      phone: supplier.phone || '',
      whatsapp: supplier.whatsapp || '',
      email: supplier.email || '',
      address: supplier.address || '',
      openingBalance: Number(supplier.openingBalance || 0),
      currentBalance: Number(supplier.currentBalance ?? supplier.openingBalance ?? 0),
      createdAt: supplier.createdAt || new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'suppliers', id), data, { merge: true });
    return id;
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

// Customer Receipt (Receiving due collection)
export async function recordCustomerPayment(
  businessId: string,
  customerId: string,
  amount: number,
  accountId: string,
  note: string,
  userId: string
): Promise<void> {
  const path = `businesses/${businessId}/customers/${customerId}`;
  try {
    // 1. Deduct customer balance
    const custRef = doc(db, 'businesses', businessId, 'customers', customerId);
    await updateDoc(custRef, {
      currentBalance: increment(-amount),
    });

    // 2. Credit to selected financial account
    const accRef = doc(db, 'businesses', businessId, 'accounts', accountId);
    await updateDoc(accRef, {
      currentBalance: increment(amount),
    });

    // 3. Log as other income/receipt
    const incId = createId('rcpt');
    await setDoc(doc(db, 'businesses', businessId, 'income', incId), {
      id: incId,
      businessId,
      category: 'Customer Due Receipt',
      amount,
      accountId,
      note: `Receipt from customer. ${note}`,
      date: new Date().toISOString().split('T')[0],
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Supplier Payment (Paying dues to supplier)
export async function recordSupplierPayment(
  businessId: string,
  supplierId: string,
  amount: number,
  accountId: string,
  note: string,
  userId: string
): Promise<void> {
  const path = `businesses/${businessId}/suppliers/${supplierId}`;
  try {
    // 1. Deduct supplier balance
    const supRef = doc(db, 'businesses', businessId, 'suppliers', supplierId);
    await updateDoc(supRef, {
      currentBalance: increment(-amount),
    });

    // 2. Deduct from selected financial account
    const accRef = doc(db, 'businesses', businessId, 'accounts', accountId);
    await updateDoc(accRef, {
      currentBalance: increment(-amount),
    });

    // 3. Log as expense
    const expId = createId('pmt');
    await setDoc(doc(db, 'businesses', businessId, 'expenses', expId), {
      id: expId,
      businessId,
      category: 'Supplier Due Payment',
      amount,
      accountId,
      note: `Payment to supplier. ${note}`,
      date: new Date().toISOString().split('T')[0],
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* =========================================================================
   FINANCIAL ACCOUNTS & ACCOUNTING
   ========================================================================= */

export function subscribeAccounts(
  businessId: string,
  onData: (accounts: FinancialAccount[]) => void
) {
  const path = `businesses/${businessId}/accounts`;
  return onSnapshot(
    collection(db, path),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FinancialAccount)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function createAccount(
  businessId: string,
  account: Omit<FinancialAccount, 'id' | 'createdAt'>
): Promise<string> {
  const id = createId('acc');
  const path = `businesses/${businessId}/accounts/${id}`;
  try {
    const data: FinancialAccount = {
      ...account,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'accounts', id), data);
    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function transferBetweenAccounts(
  businessId: string,
  fromAccountId: string,
  fromAccountName: string,
  toAccountId: string,
  toAccountName: string,
  amount: number,
  userId: string,
  note?: string
): Promise<void> {
  const path = `businesses/${businessId}/accounts`;
  try {
    const fromRef = doc(db, 'businesses', businessId, 'accounts', fromAccountId);
    const toRef = doc(db, 'businesses', businessId, 'accounts', toAccountId);

    await updateDoc(fromRef, { currentBalance: increment(-amount) });
    await updateDoc(toRef, { currentBalance: increment(amount) });

    const transferId = createId('xfer');
    await setDoc(doc(db, 'businesses', businessId, 'income', transferId), {
      id: transferId,
      businessId,
      category: 'Internal Transfer',
      amount,
      accountId: toAccountId,
      note: `Transferred ${amount} from ${fromAccountName} to ${toAccountName}. ${note || ''}`,
      date: new Date().toISOString().split('T')[0],
      createdBy: userId,
      createdAt: new Date().toISOString(),
    });

    // Automatic Audit Log for account transfer
    await recordAuditLog(businessId, {
      businessId,
      action: 'account_transfer',
      category: 'finance',
      title: `Fund Transfer: ${fromAccountName} → ${toAccountName}`,
      details: `Transferred ৳${amount} from "${fromAccountName}" to "${toAccountName}". Note: ${note || 'Inter-account liquidity rebalancing'}.`,
      performedBy: userId,
      performedByName: 'Accountant',
      targetId: transferId,
      metadata: {
        fromAccountId,
        fromAccountName,
        toAccountId,
        toAccountName,
        amount,
        note,
      },
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

/* Expenses */
export function subscribeExpenses(
  businessId: string,
  onData: (expenses: Expense[]) => void
) {
  const path = `businesses/${businessId}/expenses`;
  return onSnapshot(
    query(collection(db, path), orderBy('date', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function addExpense(
  businessId: string,
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<string> {
  const id = createId('exp');
  const path = `businesses/${businessId}/expenses/${id}`;
  try {
    const data: Expense = {
      ...expense,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'expenses', id), data);

    // Deduct from selected account
    if (expense.accountId && expense.amount > 0) {
      await updateDoc(doc(db, 'businesses', businessId, 'accounts', expense.accountId), {
        currentBalance: increment(-expense.amount),
      });
    }

    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* Income */
export function subscribeIncome(
  businessId: string,
  onData: (incomes: Income[]) => void
) {
  const path = `businesses/${businessId}/income`;
  return onSnapshot(
    query(collection(db, path), orderBy('date', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Income)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function addIncome(
  businessId: string,
  income: Omit<Income, 'id' | 'createdAt'>
): Promise<string> {
  const id = createId('inc');
  const path = `businesses/${businessId}/income/${id}`;
  try {
    const data: Income = {
      ...income,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'income', id), data);

    // Credit to account
    if (income.accountId && income.amount > 0) {
      await updateDoc(doc(db, 'businesses', businessId, 'accounts', income.accountId), {
        currentBalance: increment(income.amount),
      });
    }

    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* =========================================================================
   RETURNS & REFUNDS
   ========================================================================= */

export function subscribeReturns(
  businessId: string,
  onData: (returns: ReturnRecord[]) => void
) {
  const path = `businesses/${businessId}/returns`;
  return onSnapshot(
    query(collection(db, path), orderBy('createdAt', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ReturnRecord)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

export async function processReturn(
  businessId: string,
  returnRecord: Omit<ReturnRecord, 'id' | 'createdAt'>
): Promise<string> {
  const id = createId('ret');
  const path = `businesses/${businessId}/returns/${id}`;
  try {
    const data: ReturnRecord = {
      ...returnRecord,
      id,
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'returns', id), data);

    // Restock / destock
    for (const item of returnRecord.items) {
      const prodRef = doc(db, 'businesses', businessId, 'products', item.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        const prod = prodSnap.data() as Product;
        const oldStock = prod.currentStock;
        // Sales return adds back to stock; Purchase return removes from stock
        const stockDiff = returnRecord.type === 'sale_return' ? item.quantity : -item.quantity;
        const newStock = Math.max(0, oldStock + stockDiff);

        await updateDoc(prodRef, {
          currentStock: newStock,
          updatedAt: new Date().toISOString(),
        });

        // Stock movement
        const movId = createId('sm');
        await setDoc(doc(db, 'businesses', businessId, 'stock_movements', movId), {
          id: movId,
          businessId,
          productId: item.productId,
          productName: item.productName,
          type: returnRecord.type,
          quantity: item.quantity,
          previousStock: oldStock,
          newStock,
          referenceId: id,
          reason: returnRecord.reason,
          date: returnRecord.date,
          createdBy: returnRecord.createdBy,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Account adjustment if refunded directly
    if (returnRecord.accountId && returnRecord.totalRefund > 0) {
      const diff = returnRecord.type === 'sale_return' ? -returnRecord.totalRefund : returnRecord.totalRefund;
      await updateDoc(doc(db, 'businesses', businessId, 'accounts', returnRecord.accountId), {
        currentBalance: increment(diff),
      });
    }

    return id;
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

/* =========================================================================
   STOCK MOVEMENTS AUDIT LOG
   ========================================================================= */

export function subscribeStockMovements(
  businessId: string,
  onData: (movements: StockMovement[]) => void
) {
  const path = `businesses/${businessId}/stock_movements`;
  return onSnapshot(
    query(collection(db, path), orderBy('createdAt', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as StockMovement)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}

/* =========================================================================
   AUDIT LOGGING
   ========================================================================= */

export async function recordAuditLog(
  businessId: string,
  log: Omit<AuditLog, 'id' | 'timestamp'>
): Promise<string> {
  const logId = createId('audit');
  const path = `businesses/${businessId}/audit_logs/${logId}`;
  try {
    const data: AuditLog = {
      ...log,
      id: logId,
      timestamp: new Date().toISOString(),
    };
    await setDoc(doc(db, 'businesses', businessId, 'audit_logs', logId), data);
    return logId;
  } catch (err) {
    console.warn('Failed to record audit log:', err);
    return '';
  }
}

export function subscribeAuditLogs(
  businessId: string,
  onData: (logs: AuditLog[]) => void
) {
  const path = `businesses/${businessId}/audit_logs`;
  return onSnapshot(
    query(collection(db, path), orderBy('timestamp', 'desc')),
    (snap) => {
      onData(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditLog)));
    },
    (err) => handleFirestoreError(err, OperationType.GET, path)
  );
}


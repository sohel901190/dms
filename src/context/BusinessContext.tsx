import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuth } from './AuthContext';
import { Business, BusinessMember, UserRole, FinancialAccount, ProductCategory } from '../types';
import { handleFirestoreError, OperationType } from '../firebase/errorHandler';

interface BusinessContextType {
  activeBusiness: Business | null;
  userBusinesses: Business[];
  currentRole: UserRole;
  loading: boolean;
  members: BusinessMember[];
  switchBusiness: (businessId: string) => Promise<void>;
  createBusiness: (data: Partial<Business>) => Promise<string>;
  updateBusiness: (data: Partial<Business>) => Promise<void>;
  addMember: (email: string, role: UserRole, displayName?: string) => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  formatMoney: (amount: number) => string;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, userProfile, refreshProfile } = useAuth();
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [userBusinesses, setUserBusinesses] = useState<Business[]>([]);
  const [currentRole, setCurrentRole] = useState<UserRole>('owner');
  const [members, setMembers] = useState<BusinessMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Currency formatter helper
  const formatMoney = (amount: number): string => {
    const symbol = activeBusiness?.currencySymbol || '৳';
    const num = isNaN(amount) ? 0 : amount;
    return `${symbol}${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Load user businesses
  useEffect(() => {
    if (!currentUser) {
      setActiveBusiness(null);
      setUserBusinesses([]);
      setMembers([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Query businesses owned by user
    const businessesRef = collection(db, 'businesses');
    const qOwner = query(businessesRef, where('ownerId', '==', currentUser.uid));

    const unsubscribe = onSnapshot(
      qOwner,
      async (snapshot) => {
        const ownedList: Business[] = [];
        snapshot.forEach((d) => {
          ownedList.push({ id: d.id, ...d.data() } as Business);
        });

        setUserBusinesses(ownedList);

        // Determine which business should be active
        if (ownedList.length > 0) {
          const targetId = userProfile?.activeBusinessId || ownedList[0].id;
          const found = ownedList.find((b) => b.id === targetId) || ownedList[0];
          setActiveBusiness(found);
          setCurrentRole('owner');
        } else {
          setActiveBusiness(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching businesses:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Listen to members of active business
  useEffect(() => {
    if (!activeBusiness) {
      setMembers([]);
      return;
    }

    const membersRef = collection(db, 'businesses', activeBusiness.id, 'members');
    const unsub = onSnapshot(
      membersRef,
      (snapshot) => {
        const list: BusinessMember[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as BusinessMember);
        });
        setMembers(list);

        // Determine current user's role
        if (activeBusiness.ownerId === currentUser?.uid) {
          setCurrentRole('owner');
        } else {
          const m = list.find((item) => item.userId === currentUser?.uid || item.email === currentUser?.email);
          if (m) setCurrentRole(m.role);
        }
      },
      (err) => {
        console.warn('Members listener error:', err);
      }
    );

    return () => unsub();
  }, [activeBusiness?.id, currentUser?.uid]);

  const switchBusiness = async (businessId: string) => {
    const target = userBusinesses.find((b) => b.id === businessId);
    if (target) {
      setActiveBusiness(target);
      if (currentUser) {
        try {
          await updateDoc(doc(db, 'users', currentUser.uid), {
            activeBusinessId: target.id,
          });
          await refreshProfile();
        } catch (e) {
          console.warn('Could not save active business preference', e);
        }
      }
    }
  };

  const createBusiness = async (data: Partial<Business>): Promise<string> => {
    if (!currentUser) throw new Error('You must be signed in to create a business.');

    const businessId = 'biz_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const businessRef = doc(db, 'businesses', businessId);

    const currencyCode = data.currency || 'BDT';
    const currencySymbol = currencyCode === 'BDT' ? '৳' : currencyCode === 'USD' ? '$' : currencyCode === 'EUR' ? '€' : currencyCode;
    const openingCash = Number(data.openingCashBalance || 0);

    const newBusiness: Business = {
      id: businessId,
      name: data.name || 'My Business',
      ownerId: currentUser.uid,
      ownerName: data.ownerName || currentUser.displayName || 'Owner',
      businessType: data.businessType || 'Retail & Wholesale',
      phone: data.phone || '01789637029',
      whatsapp: data.whatsapp || '01789637029',
      email: data.email || currentUser.email || '',
      address: data.address || '',
      currency: currencyCode,
      currencySymbol,
      logoUrl: data.logoUrl || 'https://imgur.com/XjO7IJK.jpg',
      openingCashBalance: openingCash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(businessRef, newBusiness);

      // Create primary cash account
      const cashAccountId = 'acc_cash_primary';
      const cashAccountRef = doc(db, 'businesses', businessId, 'accounts', cashAccountId);
      const cashAccount: FinancialAccount = {
        id: cashAccountId,
        businessId,
        name: 'Main Cash Drawer',
        type: 'cash',
        openingBalance: openingCash,
        currentBalance: openingCash,
        isDefault: true,
        createdAt: new Date().toISOString(),
      };
      await setDoc(cashAccountRef, cashAccount);

      // Create sample categories
      const categories = ['General Goods', 'Groceries', 'Electronics', 'Apparel', 'Services'];
      for (const catName of categories) {
        const catId = 'cat_' + Math.random().toString(36).substring(2, 9);
        await setDoc(doc(db, 'businesses', businessId, 'categories', catId), {
          id: catId,
          businessId,
          name: catName,
          createdAt: new Date().toISOString(),
        });
      }

      // Add owner as member
      const memberRef = doc(db, 'businesses', businessId, 'members', currentUser.uid);
      await setDoc(memberRef, {
        id: currentUser.uid,
        businessId,
        userId: currentUser.uid,
        email: currentUser.email || '',
        displayName: currentUser.displayName || data.ownerName || 'Owner',
        role: 'owner',
        joinedAt: new Date().toISOString(),
      });

      // Update user active business
      await updateDoc(doc(db, 'users', currentUser.uid), {
        activeBusinessId: businessId,
      });

      setActiveBusiness(newBusiness);
      setCurrentRole('owner');
      await refreshProfile();

      return businessId;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `businesses/${businessId}`);
    }
  };

  const updateBusiness = async (data: Partial<Business>) => {
    if (!activeBusiness) throw new Error('No active business selected');
    try {
      const bizRef = doc(db, 'businesses', activeBusiness.id);
      const payload = {
        ...data,
        updatedAt: new Date().toISOString(),
      };
      await updateDoc(bizRef, payload);
      setActiveBusiness((prev) => (prev ? { ...prev, ...payload } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `businesses/${activeBusiness.id}`);
    }
  };

  const addMember = async (email: string, role: UserRole, displayName?: string) => {
    if (!activeBusiness) throw new Error('No active business');
    const memberId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const memberRef = doc(db, 'businesses', activeBusiness.id, 'members', memberId);

    try {
      const memberData: BusinessMember = {
        id: memberId,
        businessId: activeBusiness.id,
        userId: memberId,
        email: email.trim(),
        displayName: displayName || email.split('@')[0],
        role,
        joinedAt: new Date().toISOString(),
      };
      await setDoc(memberRef, memberData);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `businesses/${activeBusiness.id}/members/${memberId}`);
    }
  };

  const removeMember = async (memberId: string) => {
    if (!activeBusiness) throw new Error('No active business');
    try {
      const memberRef = doc(db, 'businesses', activeBusiness.id, 'members', memberId);
      await deleteDoc(memberRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `businesses/${activeBusiness.id}/members/${memberId}`);
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        activeBusiness,
        userBusinesses,
        currentRole,
        loading,
        members,
        switchBusiness,
        createBusiness,
        updateBusiness,
        addMember,
        removeMember,
        formatMoney,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
}

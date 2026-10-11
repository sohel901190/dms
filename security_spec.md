# DMS Solution - Firestore Security Specification

## 1. Data Invariants

1. **Tenant Isolation**: No user can read or write documents under `/businesses/{businessId}/...` unless they are an authenticated member of `{businessId}` with valid role permissions, or the business owner.
2. **User Identity Integrity**: A user can only read/write their own document at `/users/{userId}` where `request.auth.uid == userId`.
3. **Immutability of Ownership & Tenant Reference**: Once created, `businessId`, `ownerId`, `createdBy`, and `createdAt` cannot be modified by any update action.
4. **Role Partitioning**:
   - `owner` and `admin`: Full management rights over business settings, inventory, sales, purchases, finances, and members.
   - `manager`: Operational management for inventory, sales, purchases, and customers/suppliers.
   - `salesperson`: Sales invoicing and customer directory access only. Cannot access backend accounting ledgers, expenses, or profit & loss.
   - `accountant`: Financial accounts, expenses, income, receipts, payments, and general ledgers.
   - `inventory_manager`: Product catalogue, stock adjustments, purchase receiving.
5. **Denial of Wallet Defense**: All document IDs and string fields must be size-bounded (`<= 128` characters for IDs, `<= 200` to `500` for text strings).

## 2. The Dirty Dozen Malicious Payloads

1. **Payload 1 (Ghost Field / Privilege Escalation)**: Attacker attempts to inject `isAdmin: true` or `role: "owner"` into `/users/{userId}`. *Expected: PERMISSION_DENIED*.
2. **Payload 2 (Cross-Tenant Snooping)**: User authenticated under Business A queries `/businesses/BusinessB/products`. *Expected: PERMISSION_DENIED*.
3. **Payload 3 (Orphaned Business Item)**: Attacker creates a product in `/businesses/BusinessA/products` with `businessId: "BusinessB"`. *Expected: PERMISSION_DENIED*.
4. **Payload 4 (Unauthenticated Blanket Query)**: Unauthenticated client attempts to list `/businesses`. *Expected: PERMISSION_DENIED*.
5. **Payload 5 (ID Injection Attack)**: Document ID with 2000 characters of junk chars injected into `/businesses/{businessId}/sales/{saleId}`. *Expected: PERMISSION_DENIED*.
6. **Payload 6 (Shadow Field Mutation)**: Member attempts to update a sale with an unwhitelisted field `internalDiscountBypass: 9999`. *Expected: PERMISSION_DENIED*.
7. **Payload 7 (Salesperson Privilege Escalation)**: User with role `salesperson` attempts to create an expense document in `/businesses/{businessId}/expenses`. *Expected: PERMISSION_DENIED*.
8. **Payload 8 (Owner Impersonation)**: Attacker attempts to update the `ownerId` of a business to transfer ownership to themselves. *Expected: PERMISSION_DENIED*.
9. **Payload 9 (Price Tampering)**: Attacker submits product update altering purchase price with invalid type (string `"free"` instead of number). *Expected: PERMISSION_DENIED*.
10. **Payload 10 (Non-Member Invoice Creation)**: Authenticated user who is not a member of Business A attempts to write a sale into `/businesses/BusinessA/sales`. *Expected: PERMISSION_DENIED*.
11. **Payload 11 (Customer PII Scraping)**: Attacker without business membership lists `/businesses/{businessId}/customers`. *Expected: PERMISSION_DENIED*.
12. **Payload 12 (Negative Quantity Injection)**: Attacker tries to write negative inventory or corrupt stock balances. *Expected: PERMISSION_DENIED*.

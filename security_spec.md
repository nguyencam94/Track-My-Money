# Security Specification for Quản Lý Tài Chính & Nợ

## 1. Data Invariants
- A user can only access their own profile.
- A transaction must belong to the logged-in user.
- A debt must belong to the logged-in user.
- A payment schedule must belong to the logged-in user and be linked to a valid debt.
- Debt status cannot be changed to 'paid' unless `remainingAmount` is 0 (or specifically managed).
- Users cannot modify `userId` after creation.
- `createdAt` and `updatedAt` (if used) must be server-validated.

## 2. The Dirty Dozen Payloads
1. **Identity Theft**: Update another user's profile by changing `{userId}`.
2. **Transaction Forging**: Create a transaction for a different `userId`.
3. **Debt Inflation**: Update someone else's debt to increase their balance.
4. **Phantom Payment**: Update a `PaymentSchedule` as 'paid' without a valid user ID.
5. **Ghost Field Injection**: Add `isAdmin: true` to a user profile.
6. **Date Spoofing**: Set a `createdAt` date in the past to bypass logic.
7. **Negative Money**: Create a transaction with a negative amount.
8. **ID Poisoning**: Use a 1MB string as a document ID.
9. **Orphaned Schedule**: Create an installment for a debt that doesn't exist.
10. **Privilege Escalation**: Try to change their `role` (if it existed) in the profile.
11. **PII Leak**: Query all user profiles to get emails.
12. **State Jumper**: Set a debt status to 'paid' immediately upon creation.

## 3. Test Runner (Draft Rules First)
I will implement the rules to block these.

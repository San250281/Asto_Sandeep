# Security Specification: Vedic Voice AI

## 1. Data Invariants
1. **User Ownership**: A user profile document (`/users/{userId}`) can only be accessed (get, update) by the authenticated user whose `request.auth.uid` matches the `userId`. Blanket list reads are strictly prohibited.
2. **Transaction Integrity**: Every wallet transaction (`/users/{userId}/transactions/{transactionId}`) must belong to the parent user. A user cannot create a transaction for another user.
3. **Session Context**: A voice session (`/users/{userId}/sessions/{sessionId}`) belongs to the user who initiated it. A session cannot be accessed or modified by other users.
4. **Message Relational Alignment**: A transcript message (`/users/{userId}/sessions/{sessionId}/messages/{messageId}`) is bound to its parent session.
5. **Static Agents**: Global definitions of available AI Astrologer Agents (`/ai_agents/{agentId}`) are read-only. No client SDK is permitted to write or delete them.
6. **Immortal Fields**: Fields like `createdAt` and `created_at` are immutable after document creation.
7. **Temporal Verification**: Timestamps must align with the server time using `request.time`.

---

## 2. The "Dirty Dozen" Payloads (Exploit Scenarios)
These malicious payloads are designed to attack the system and are blocked by the fortress rules:

### Exploit 1: User Profile Hijack
**Attack**: Authenticated User A tries to overwrite User B's profile document.
**Payload** to `setDoc` on `/users/user_B`:
```json
{
  "id": "user_B",
  "name": "Hacker A",
  "email": "hacker@evil.com",
  "phone": "+91 99999 99999",
  "wallet_balance": 10000.0,
  "created_at": "2026-06-09T00:00:00Z"
}
```
**Mechanism**: Blocked as `userId` (document ID) must strictly match `request.auth.uid`.

### Exploit 2: Shadow Field Injection
**Attack**: Overwriting `wallet_balance` with a secret/malicious role field (e.g., `isAdmin`).
**Payload** to `/users/user_A`:
```json
{
  "id": "user_A",
  "wallet_balance": 5000.0,
  "isAdmin": true
}
```
**Mechanism**: Blocked by `affectedKeys().hasOnly(['wallet_balance', 'kundlis_purchased'])` during partial client-side profile updates.

### Exploit 3: Transaction Mimicry (Relational Spoof)
**Attack**: Overwriting transaction to deposit free money.
**Payload** to `/users/user_A/transactions/bogus_tx`:
```json
{
  "id": "bogus_tx",
  "user_id": "user_B",
  "amount": 99999.0,
  "type": "recharge",
  "status": "completed",
  "created_at": "2026-06-09T00:00:00Z"
}
```
**Mechanism**: Blocked since `user_id` inside the payload must match `request.auth.uid`.

### Exploit 4: Session State Forgery
**Attack**: User A tries to create or modify a voice session for User B.
**Payload** to `/users/user_B/sessions/sess_123`:
```json
{
  "id": "sess_123",
  "user_id": "user_B",
  "agent_id": "guru-ji",
  "start_time": "2026-06-09T00:00:00Z",
  "total_seconds": 3600,
  "total_amount": 0.0
}
```
**Mechanism**: Match route `/users/{userId}/sessions/{sessionId}` blocks writes because `userId` must equal `request.auth.uid`.

### Exploit 5: Message Spinoff (Orphaned Msg)
**Attack**: Injecting transcript messages to another user's active session.
**Payload** to `/users/user_B/sessions/sess_123/messages/msg_456`:
```json
{
  "id": "msg_456",
  "session_id": "sess_123",
  "sender": "ai",
  "text": "Your bad karma is purged",
  "timestamp": "2026-06-09T00:00:00Z"
}
```
**Mechanism**: Blocked via `userId == request.auth.uid`.

### Exploit 6: Unauthorized Global Agent Modification
**Attack**: Trying to write or change the price per minute of a global agent record.
**Payload** to `/ai_agents/guru-ji`:
```json
{
  "price_per_minute": 0.0
}
```
**Mechanism**: Blocked by absolute catch-all rule: `/ai_agents/{agentId}` allows write if `false`.

### Exploit 7: Spoofed Client Timestamp Bypass
**Attack**: Providing a client-generated past or future timestamp for a record.
**Payload** to `/users/user_A/transactions/tx_123`:
```json
{
  "id": "tx_123",
  "user_id": "user_A",
  "amount": 50,
  "type": "recharge",
  "status": "completed",
  "created_at": "2020-01-01T00:00:00Z"
}
```
**Mechanism**: Blocked by strict enforcement of `incoming().created_at == request.time`.

### Exploit 8: Negative Balance Refunding
**Attack**: Initiating a recharge with a negative transaction amount.
**Payload** to `/users/user_A/transactions/tx_bad`:
```json
{
  "id": "tx_bad",
  "user_id": "user_A",
  "amount": -50.0,
  "type": "recharge",
  "status": "completed",
  "created_at": "request.time"
}
```
**Mechanism**: Blocked because `amount` must be greater than 0.

### Exploit 9: Large ID Buffer Overload (Resource Denial-of-Wallet)
**Attack**: Attempting to poison paths with an exceedingly large document ID.
**Payload**: Saving document ID `a.size() > 128` (e.g. 2KB string).
**Mechanism**: Blocked by strict `isValidId()` check requiring length `<= 128`.

### Exploit 10: Value Poisoning (Fake Enum Values)
**Attack**: Initiating an transaction type that is not supported.
**Payload** to `/users/user_A/transactions/tx_123`:
```json
{
  "id": "tx_123",
  "user_id": "user_A",
  "amount": 100,
  "type": "admin_grant_unlimited",
  "status": "completed",
  "created_at": "request.time"
}
```
**Mechanism**: Blocked because type must be in `['recharge', 'call_deduction', 'kundli_purchase']`.

### Exploit 11: Free Trial Recovery Cheat
**Attack**: Overwriting `free_trial_remaining_seconds` directly with `30` as a client-side update.
**Payload**: Updating `/users/user_A`:
```json
{
  "free_trial_remaining_seconds": 30
}
```
**Mechanism**: Only allowing allowed state transition fields (`wallet_balance`, `kundlis_purchased`, `free_trial_remaining_seconds`) with explicit validation on updates.

### Exploit 12: Profile deletion self-service
**Attack**: Attempting to delete own profile or transactions to wipe out historical logs.
**Payload**: DELETE request on `/users/user_A/transactions/tx_123`.
**Mechanism**: Blocked because `allow delete` is restricted to `false` for critical auditing logs.

---

## 3. Test Coverage Strategy
The tests for these exploits are simulated by ensuring that:
- Every query of database collection has clear security conditions.
- Production rules strictly require `request.auth.uid == userId` and secure type check validations.

# API Reference

Base URL: `https://<your-domain>` (local: `http://localhost:3000`)

All responses are JSON with a `success: boolean` field. Errors return
`{ "success": false, "error": string, "fieldErrors"?: object }` with an appropriate 4xx/5xx status.

Authenticated public endpoints use an httpOnly `hayatna_participant_session` cookie issued by
`/api/register`. Admin endpoints use an httpOnly `hayatna_admin_session` cookie issued by
`/api/admin/login`. Neither token needs to be manually attached by API consumers — the browser
sends cookies automatically on same-origin requests.

---

## Public / Participant Endpoints

### `POST /api/register`

Registers a participant and issues a session cookie.

**Body**
```json
{
  "fullName": "Fatima Al Mazrouei",
  "mobileNumber": "0501234567",
  "email": "fatima@example.com",
  "emirate": "Dubai",
  "ageConfirmed": true,
  "acceptedTerms": true,
  "deviceFingerprint": "fp_123456_abc"
}
```

**Response `201`**
```json
{ "success": true, "userId": "clx...", "returning": false }
```

Errors: `422` validation, `409` mobile/email already registered under a different account, `429`
rate limited, `503` no active campaign.

---

### `POST /api/upload-receipt`

`multipart/form-data` with fields `file` (JPG/PNG/PDF, ≤10 MB) and `deviceFingerprint`. Requires
the participant session cookie. Runs OCR, fuzzy brand matching, and all fraud checks synchronously.

**Response `200`**
```json
{
  "success": true,
  "receiptId": "clx...",
  "status": "APPROVED",
  "eligible": true,
  "confidence": 0.95,
  "detectedProducts": [{ "name": "HAYATNA FRESH MILK 1L", "confidence": 0.98 }],
  "rejectionReason": null
}
```

Errors: `401` no session, `413` file too large, `415` unsupported/spoofed file type, `429` rate
limited.

---

### `POST /api/verify-receipt`

Read-only status check. **Body**: `{ "receiptId": "clx..." }`.

**Response `200`**
```json
{
  "success": true,
  "receiptId": "clx...",
  "status": "APPROVED",
  "eligible": true,
  "confidence": 0.95,
  "rejectionReason": null,
  "detectedProducts": [{ "name": "HAYATNA FRESH MILK 1L", "confidence": 0.98 }],
  "canSpin": true,
  "alreadySpun": false
}
```

---

### `POST /api/spin`

**Body**: `{ "receiptId": "clx..." }`. Requires the receipt to belong to the current session and be
`APPROVED`. The prize is selected entirely server-side.

**Response `200` (won)**
```json
{
  "success": true,
  "won": true,
  "winnerId": "clx...",
  "winnerCode": "HYW-AB12CD34",
  "prizeId": "clx...",
  "prizeName": "Hayatna Gift Basket",
  "redemptionCode": "AB12CD34EF"
}
```

**Response `200` (no inventory left)**
```json
{ "success": true, "won": false, "message": "All prizes have been claimed for now. Thank you for participating!" }
```

Errors: `403` receipt not approved, `404` receipt not found, `409` already claimed, `429` rate
limited.

---

### `GET /api/campaign`

Public campaign metadata (name, description, dates, status, min purchase amount, terms URL).

### `GET /api/prizes`

Public prize list for the wheel UI — `id`, `name`, `description`, `imageUrl`, `tier` only.
Probability weights and inventory counts are never exposed to the client.

### `GET /api/winner/:id`

Accepts either the winner's internal ID or its public `winnerCode`. Returns prize name, store,
status, redemption code, and the winner's first name only.

---

## Admin Endpoints

All require the `hayatna_admin_session` cookie (see `POST /api/admin/login`). Role-gated actions
require `ADMIN` or `SUPER_ADMIN` as noted.

### `POST /api/admin/login`

**Body**: `{ "email": "...", "password": "..." }` → sets session cookies.

### `POST /api/admin/logout`

Clears session cookies.

### `GET /api/admin/dashboard`

Returns campaign summary, aggregate stats (registrations, receipts by status, today's entries/
winners), per-prize inventory, store-wise participation, and a 14-day daily participation series.

### `GET /api/admin/users?page=&pageSize=&search=`

Paginated user list with receipt/winner counts.

### `GET /api/admin/receipts?page=&pageSize=&search=&status=`

Paginated receipt list. `status` ∈ `PENDING|PROCESSING|APPROVED|REJECTED|FLAGGED`.

### `GET /api/admin/winners?page=&pageSize=&search=`

Paginated winner list with user/prize/receipt summaries.

### `GET|PUT /api/admin/settings`

`GET` returns current campaign thresholds. `PUT` body (all optional):
```json
{
  "minPurchaseAmountAed": 20,
  "receiptConfidenceThreshold": 0.65,
  "maxSubmissionsPerUserPerDay": 3,
  "fuzzyMatchThreshold": 0.75
}
```

### `POST /api/admin/campaign/pause` / `POST /api/admin/campaign/resume`

Toggles campaign status between `ACTIVE` and `PAUSED`. New submissions are rejected while paused.

### `POST /api/admin/prizes/reset-inventory`

**Requires `SUPER_ADMIN`.** Body (optional): `{ "prizeId": "clx..." }` — omit to reset every prize
in the active campaign back to full stock and reactivate any exhausted prizes.

### `POST /api/admin/receipts/:id/override`

**Body**: `{ "action": "APPROVE" | "REJECT", "reason"?: string }` — manual review override.

### `DELETE /api/admin/receipts/:id`

Permanently deletes a receipt. Fails with `409` if a winner is already attached (cancel the winner
first).

### `POST /api/admin/blacklist/user` / `DELETE /api/admin/blacklist/user?userId=`

Blacklist / restore a user. Body for POST: `{ "userId": "clx...", "reason": "..." }`.

### `POST /api/admin/blacklist/receipt`

Body: `{ "receiptId": "clx...", "reason": "..." }`. Marks the receipt blacklisted and rejected;
future submissions sharing its image hash or receipt number are auto-blocked.

### `GET /api/admin/export/:type?format=csv|xlsx`

`type` ∈ `users|receipts|winners`. Streams a CSV or Excel file download.

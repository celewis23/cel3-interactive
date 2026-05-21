# External API — Developer Connection Guide

This guide explains how to connect a separate client-owned web app or admin console to the CEL3 Interactive messaging system.

---

## Overview

External apps authenticate using a `client_id` + `client_secret` credential pair, exchange them for a short-lived access token, and then call the `/api/ext/messages/*` endpoints. All API calls are scoped to the portal user the integration was created for — the external app cannot access other clients' conversations.

---

## Step 1 — Create an Integration

1. Log in to the **CEL3 Admin Console**.
2. Navigate to **Operations → API Access**.
3. Click **Create New Integration**.
4. Fill in the form:
   - **App Name** — a human-readable label (e.g. "Acme Client Portal").
   - **App Type** — select `ClientAdminPortal` for a client-side admin console.
   - **Portal User** — the client this integration will act on behalf of. All API calls will be scoped to this user's conversations.
   - **Allowed Origins** — one origin per line (e.g. `https://app.acme.com`). Leave blank to allow all origins (not recommended for production).
   - **Scopes** — check the permissions this app needs (see scope reference below).
5. Click **Create Integration**.

**The secret is shown exactly once.** Copy both the **Client ID** and **Client Secret** immediately and store them securely in your environment variables. They cannot be retrieved again.

---

## Step 2 — Store Credentials

In your external app's environment, set:

```
CEL3_CLIENT_ID=<your client ID>
CEL3_CLIENT_SECRET=<your client secret>
CEL3_API_BASE=https://your-cel3-domain.com
```

---

## Step 3 — Request an Access Token

Exchange your credentials for a short-lived access token (valid for **1 hour**).

**Endpoint:** `POST /api/integrations/token`

**Request:**
```json
{
  "clientId": "YOUR_CLIENT_ID",
  "clientSecret": "YOUR_CLIENT_SECRET"
}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scopes": ["messaging:read", "messaging:write"]
}
```

**Example (fetch):**
```js
const res = await fetch('https://your-cel3-domain.com/api/integrations/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientId: process.env.CEL3_CLIENT_ID,
    clientSecret: process.env.CEL3_CLIENT_SECRET,
  }),
});
const { access_token, expires_in } = await res.json();
```

Cache the token and refresh it before it expires. Do **not** request a new token on every API call.

---

## Step 4 — Call the Messaging API

Include the access token as a `Bearer` token in the `Authorization` header of every request.

```
Authorization: Bearer <access_token>
```

### Available Endpoints

All endpoints are under `/api/ext/messages/`.

#### List conversations
```
GET /api/ext/messages/conversations
```
Optional query: `?search=<term>`

Returns all conversations for the portal user this integration is tied to.

#### Get conversation detail + messages
```
GET /api/ext/messages/conversations/:id
```

#### Send a message
```
POST /api/ext/messages/conversations/:id/messages
Content-Type: application/json

{ "body": "Hello, this is a message." }
```

#### Mark conversation as read
```
POST /api/ext/messages/conversations/:id/read
```

#### Start a new conversation
```
POST /api/ext/messages/conversations
Content-Type: application/json

{ "subject": "Question about project X", "body": "Initial message text." }
```

#### Get unread message count
```
GET /api/ext/messages/unread-count
```
Returns `{ "count": 3 }`.

#### List notifications
```
GET /api/ext/messages/notifications
```
Requires scope `messaging:notifications:read`.

---

## Scope Reference

| Scope | Description |
|---|---|
| `messaging:read` | Read conversations and unread counts |
| `messaging:write` | Send messages and mark conversations read |
| `conversations:read` | List and retrieve conversation details |
| `conversations:write` | Start new conversations |
| `messaging:notifications:read` | Read notification feed |

Request only the scopes your app actually needs.

---

## CORS

The token endpoint (`/api/integrations/token`) accepts requests from any origin — it is designed for server-to-server use.

All `/api/ext/messages/*` endpoints enforce the **Allowed Origins** list you configured when creating the integration. If your app's origin is not in the list, preflight requests will be rejected with `403 Forbidden`. Add your production and development origins in the API Access admin UI.

For server-to-server calls (no `Origin` header), CORS restrictions do not apply.

---

## Token Endpoint — Preflight

Browser apps making a cross-origin token request must handle the `OPTIONS` preflight. The token endpoint supports it:

```
OPTIONS /api/integrations/token
```

---

## Revoking / Regenerating Credentials

- **Revoke** — disables the integration immediately. All subsequent API calls will return `401 Unauthorized`. Useful when decommissioning an app or responding to a security incident.
- **Regenerate Secret** — issues a new client secret. The old secret is immediately invalidated. The new secret is shown once — copy it immediately.

Both actions are available in **Operations → API Access** from the integration's card menu.

---

## Error Reference

| HTTP Status | `error` field | Meaning |
|---|---|---|
| `401` | `invalid_credentials` | Client ID or secret is wrong |
| `401` | `integration_revoked` | The integration has been revoked |
| `401` | `invalid_token` | Access token is missing, malformed, or expired |
| `403` | `insufficient_scope` | Token lacks the required scope for this endpoint |
| `403` | `origin_not_allowed` | Request origin is not in the integration's allowed origins list |
| `404` | `not_found` | Resource does not exist or is not accessible to this integration |
| `500` | `server_error` | Internal error — retry with exponential backoff |

---

## Audit Log

Every API call made by an external integration is recorded in the audit log. Admins can review activity in the admin console under **Operations → Audit Log**.

---

## Quick-Start Checklist

- [ ] Create integration in API Access admin UI
- [ ] Copy and store `clientId` and `clientSecret` securely
- [ ] Set `CEL3_CLIENT_ID`, `CEL3_CLIENT_SECRET`, `CEL3_API_BASE` in your environment
- [ ] Implement token fetch + cache logic
- [ ] Add your app's origin to the Allowed Origins list
- [ ] Test with `GET /api/ext/messages/unread-count`

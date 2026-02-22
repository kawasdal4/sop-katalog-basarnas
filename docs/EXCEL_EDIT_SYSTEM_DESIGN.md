# Sistem Edit Excel Internal - Microsoft Ecosystem

## Overview

Sistem edit Excel internal menggunakan Microsoft 365 tanpa perlu login Microsoft oleh admin. Semua autentikasi Microsoft dilakukan server-side menggunakan Azure App Registration dengan Client Credentials Flow.

---

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SISTEM EDIT EXCEL INTERNAL                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────┐        ┌─────────────────┐        ┌─────────────────────┐     │
│   │             │        │                 │        │                     │     │
│   │   ADMIN     │───────►│  VERCEL API     │───────►│   AZURE AD          │     │
│   │   (Browser) │        │  (Backend)      │        │   (Client Creds)    │     │
│   │             │        │                 │        │                     │     │
│   └─────────────┘        └────────┬────────┘        └──────────┬──────────┘     │
│                                   │                            │                 │
│                                   │                            │                 │
│                                   ▼                            ▼                 │
│   ┌─────────────┐        ┌─────────────────┐        ┌─────────────────────┐     │
│   │  SUPABASE   │◄───────│  Graph API      │        │   Microsoft 365     │     │
│   │  (Auth)     │        │  Calls          │───────►│   OneDrive          │     │
│   │             │        │                 │        │   /R2-Edit-Temp/    │     │
│   └─────────────┘        └────────┬────────┘        └──────────┬──────────┘     │
│                                   │                            │                 │
│                                   │                            │                 │
│                                   ▼                            │                 │
│   ┌─────────────┐        ┌─────────────────┐                   │                 │
│   │             │        │                 │                   │                 │
│   │ CLOUDFLARE  │◄───────│   SYNC BACK     │◄──────────────────┘                 │
│   │    R2       │        │   (Webhook/     │                                     │
│   │ (PRIMARY)   │        │    Polling)     │                                     │
│   │             │        │                 │                                     │
│   └─────────────┘        └─────────────────┘                                     │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Environment Configuration

### Required Environment Variables

```env
# Azure AD - Client Credentials Flow
AZURE_TENANT_ID=your-azure-tenant-id
AZURE_CLIENT_ID=your-azure-client-id
AZURE_CLIENT_SECRET=your-azure-client-secret

# Microsoft 365 Service Account (OneDrive for editing)
M365_SERVICE_ACCOUNT=edit-service@basarnas.onmicrosoft.com
M365_EDIT_FOLDER=R2-Edit-Temp

# Cloudflare R2 (Primary Storage)
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=sop-katalog-basarnas
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Supabase (App Auth)
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key

# Webhook (for auto-sync)
WEBHOOK_BASE_URL=https://your-vercel-app.vercel.app
WEBHOOK_VALIDATION_TOKEN=your-random-secret-token
```

---

## FLOW 1 – Handle Edit (Server Side)

### 1.1 Urutan Action Detail

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW 1: HANDLE EDIT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  [FRONTEND]                  [BACKEND]                          │
│      │                          │                                │
│      │ 1. Klik Edit             │                                │
│      │ ──────────────────────►  │                                │
│      │                          │                                │
│      │                          │ 2. Validate Supabase Session   │
│      │                          │    └─► Check admin role        │
│      │                          │                                │
│      │                          │ 3. Get Azure AD Token          │
│      │                          │    └─► Client Credentials      │
│      │                          │                                │
│      │                          │ 4. Download from R2            │
│      │                          │    └─► HTTP GET to R2          │
│      │                          │                                │
│      │                          │ 5. Upload to OneDrive          │
│      │                          │    └─► Graph API PUT           │
│      │                          │                                │
│      │                          │ 6. Create Edit Link            │
│      │                          │    └─► Graph API createLink    │
│      │                          │                                │
│      │ 7. Return Edit URL       │                                │
│      │ ◄────────────────────── │                                │
│      │                          │                                │
│      │ 8. Open Excel Online     │                                │
│      │ ──────────────────────►  │                                │
│      │                          │                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Endpoint Graph yang Tepat

#### Step 1: Get Access Token (Azure AD)

```http
POST https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token
Content-Type: application/x-www-form-urlencoded

client_id={client-id}
&client_secret={client-secret}
&scope=https://graph.microsoft.com/.default
&grant_type=client_credentials
```

**Response:**
```json
{
  "token_type": "Bearer",
  "expires_in": 3599,
  "access_token": "eyJ0eXAiOiJKV1QiLCJub25jZSI6..."
}
```

#### Step 2: Ensure Edit Folder Exists

```http
GET https://graph.microsoft.com/v1.0/users/{service-account}/drive/root:/R2-Edit-Temp
Authorization: Bearer {access_token}
```

**If not exists (404), create:**
```http
POST https://graph.microsoft.com/v1.0/users/{service-account}/drive/root/children
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "R2-Edit-Temp",
  "folder": {},
  "@microsoft.graph.conflictBehavior": "fail"
}
```

#### Step 3: Upload File to OneDrive

```http
PUT https://graph.microsoft.com/v1.0/users/{service-account}/drive/root:/R2-Edit-Temp/{filename}:/content
Authorization: Bearer {access_token}
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet

[binary file content]
```

**Response:**
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#users('edit-service%40basarnas.onmicrosoft.com')/drive/items/$entity",
  "id": "01A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7",
  "name": "SOP-0008.xlsx",
  "size": 45678,
  "createdDateTime": "2024-01-15T10:30:00Z",
  "lastModifiedDateTime": "2024-01-15T10:30:00Z",
  "webUrl": "https://basarnas-my.sharepoint.com/personal/edit-service_basarnas_onmicrosoft_com/Documents/R2-Edit-Temp/SOP-0008.xlsx"
}
```

#### Step 4: Create Edit Sharing Link

```http
POST https://graph.microsoft.com/v1.0/users/{service-account}/drive/items/{item-id}/createLink
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "type": "edit",
  "scope": "organization"
}
```

**Response:**
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#permission",
  "id": "p!ABC123DEF456",
  "link": {
    "webUrl": "https://basarnas-my.sharepoint.com/:x:/g/personal/edit-service_basarnas_onmicrosoft_com/EfGhIjKlMnOpQrStUvWxYz",
    "application": {
      "id": "12345678-1234-1234-1234-123456789012",
      "displayName": "Excel Online"
    },
    "type": "edit",
    "scope": "organization"
  },
  "roles": ["write"]
}
```

### 1.3 Field yang Harus Diisi

#### Request Payload - Start Edit

```typescript
interface StartEditRequest {
  objectKey: string;        // Required: R2 path, e.g., "sop-files/SOP-0008.xlsx"
  fileId?: string;          // Optional: Database ID for logging
}

interface StartEditResponse {
  success: boolean;
  editUrl: string;          // Excel Online edit URL
  driveItemId: string;      // OneDrive item ID for tracking
  originalPath: string;     // Original R2 path
  expiresAt: string;        // Link expiration (optional)
  message: string;
}
```

### 1.4 Contoh Payload Request

#### Frontend Request

```typescript
// API Call from Frontend
const response = await fetch('/api/excel-edit/start', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseSession.access_token}`
  },
  body: JSON.stringify({
    objectKey: 'sop-files/SOP-0008.xlsx',
    fileId: 'uuid-from-database'
  })
});

const data = await response.json();
// data.editUrl = "https://basarnas-my.sharepoint.com/:x:/g/personal/..."
window.open(data.editUrl, '_blank');
```

### 1.5 Error Handling

| Error Code | Description | Handling |
|------------|-------------|----------|
| `401 Unauthorized` | Azure AD token expired/invalid | Retry token acquisition |
| `403 Forbidden` | Insufficient permissions | Check admin consent, verify permissions |
| `404 Not Found` | File not found in R2 | Return error to user |
| `409 Conflict` | File already exists in edit folder | Overwrite or generate unique name |
| `413 Payload Too Large` | File exceeds OneDrive limit | Max 250MB for upload |
| `429 Too Many Requests` | Rate limited | Implement exponential backoff |
| `500 Internal Server Error` | Graph API error | Log and return generic error |
| `503 Service Unavailable` | Microsoft service down | Retry with backoff |

```typescript
// Error Response Format
interface ErrorResponse {
  success: false;
  error: string;
  code: string;           // ERROR_CODE
  details?: string;
  retryable: boolean;
}
```

---

## FLOW 2 – Auto Sync Back to R2

### 2.1 Architecture Options

#### Option A: Microsoft Graph Webhook (Recommended)

```
┌─────────────────────────────────────────────────────────────────┐
│                 WEBHOOK SUBSCRIPTION FLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐  │
│  │   ONE DRIVE │        │  GRAPH API  │        │  VERCEL API │  │
│  │   (Edit)    │        │  WEBHOOK    │        │  (Handler)  │  │
│  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘  │
│         │                      │                      │          │
│         │  File Modified       │                      │          │
│         │ ──────────────────►  │                      │          │
│         │                      │                      │          │
│         │                      │  POST Notification   │          │
│         │                      │ ──────────────────►  │          │
│         │                      │                      │          │
│         │                      │                      │ Validate │
│         │                      │                      │ ────┐    │
│         │                      │                      │     │    │
│         │                      │                      │ ◄───┘    │
│         │                      │                      │          │
│         │  GET file content    │                      │          │
│         │ ◄────────────────────────────────────────────│          │
│         │                      │                      │          │
│         │  Return content      │                      │          │
│         │ ─────────────────────────────────────────────►          │
│         │                      │                      │          │
│         │                      │                      │ PUT R2   │
│         │                      │                      │ ────┐    │
│         │                      │                      │     │    │
│         │                      │                      │ ◄───┘    │
│         │                      │                      │          │
│         │  DELETE temp file    │                      │          │
│         │ ◄────────────────────────────────────────────│          │
│         │                      │                      │          │
│         │                      │  202 Accepted        │          │
│         │                      │ ◄───────────────────── │          │
│         │                      │                      │          │
└─────────────────────────────────────────────────────────────────┘
```

#### Option B: Scheduled Polling (Fallback)

```
┌─────────────────────────────────────────────────────────────────┐
│                    POLLING FLOW                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────┐        ┌─────────────┐        ┌─────────────┐  │
│  │  CRON JOB   │        │  GRAPH API  │        │     R2      │  │
│  │ (Vercel)    │        │             │        │             │  │
│  └──────┬──────┘        └──────┬──────┘        └──────┬──────┘  │
│         │                      │                      │          │
│         │  Every 5 min         │                      │          │
│         │ ──────────────────►  │                      │          │
│         │                      │                      │          │
│         │                      │  GET /R2-Edit-Temp/  │          │
│         │                      │  children            │          │
│         │                      │ ──────────────────►  │          │
│         │                      │                      │          │
│         │                      │  Return file list    │          │
│         │                      │ ◄─────────────────── │          │
│         │                      │                      │          │
│         │  For each modified:  │                      │          │
│         │ ─────────────────►   │                      │          │
│         │                      │                      │          │
│         │                      │  GET content         │          │
│         │                      │ ──────────────────►  │          │
│         │                      │                      │          │
│         │                      │  Return binary       │          │
│         │                      │ ◄─────────────────── │          │
│         │                      │                      │          │
│         │  PUT to R2           │                      │          │
│         │ ─────────────────────────────────────────►  │          │
│         │                      │                      │          │
│         │  DELETE from OneDrive│                      │          │
│         │ ─────────────────►   │                      │          │
│         │                      │                      │          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Webhook Implementation (Option A - Recommended)

#### Step 1: Create Webhook Subscription

```http
POST https://graph.microsoft.com/v1.0/subscriptions
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "changeType": "updated",
  "notificationUrl": "https://your-app.vercel.app/api/excel-edit/webhook",
  "resource": "/users/{service-account}/drive/root:/R2-Edit-Temp:/delta",
  "expirationDateTime": "2024-02-15T00:00:00Z",
  "clientState": "your-validation-token",
  "latestSupportedTlsVersion": "v1_2"
}
```

**Response:**
```json
{
  "@odata.context": "https://graph.microsoft.com/v1.0/$metadata#subscriptions/$entity",
  "id": "subscription-id",
  "resource": "/users/{service-account}/drive/root:/R2-Edit-Temp:/delta",
  "changeType": "updated",
  "notificationUrl": "https://your-app.vercel.app/api/excel-edit/webhook",
  "expirationDateTime": "2024-02-15T00:00:00Z",
  "clientState": "your-validation-token"
}
```

#### Step 2: Webhook Validation Endpoint

```typescript
// GET /api/excel-edit/webhook
// Microsoft validates webhook on subscription creation

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const validationToken = searchParams.get('validationToken');
  
  if (validationToken) {
    // Return plain text validation token
    return new Response(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
  
  return new Response('No validation token', { status: 400 });
}
```

#### Step 3: Webhook Notification Handler

```typescript
// POST /api/excel-edit/webhook

interface WebhookNotification {
  value: Array<{
    subscriptionId: string;
    changeType: 'updated' | 'created' | 'deleted';
    resource: string;
    resourceData?: {
      id: string;
    };
    tenantId: string;
    clientState: string;
  }>;
}

export async function POST(request: Request) {
  const notification: WebhookNotification = await request.json();
  
  // Validate client state
  if (notification.value[0]?.clientState !== process.env.WEBHOOK_VALIDATION_TOKEN) {
    return new Response('Invalid client state', { status: 401 });
  }
  
  // Process each notification
  for (const item of notification.value) {
    if (item.changeType === 'updated' || item.changeType === 'created') {
      // Trigger sync process (async)
      syncFileToR2(item.resourceData?.id).catch(console.error);
    }
  }
  
  // Must return 202 quickly (within 30 seconds)
  return new Response(null, { status: 202 });
}
```

### 2.3 Polling Implementation (Option B - Fallback)

```typescript
// Cron endpoint: /api/excel-edit/sync-check
// Called every 5 minutes by Vercel Cron

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const accessToken = await getAccessToken();
  const serviceAccount = process.env.M365_SERVICE_ACCOUNT!;
  const editFolder = process.env.M365_EDIT_FOLDER || 'R2-Edit-Temp';
  
  // Get all files in edit folder
  const filesResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/root:/${editFolder}:/children?select=id,name,lastModifiedDateTime,size`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  const files = await filesResponse.json();
  const results = [];
  
  for (const file of files.value || []) {
    // Check if file was modified in last 10 minutes
    const lastModified = new Date(file.lastModifiedDateTime);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    if (lastModified > tenMinutesAgo) {
      // Sync this file
      const result = await syncFileToR2(file.id, file.name);
      results.push({ file: file.name, ...result });
    }
  }
  
  return Response.json({ success: true, processed: results.length, results });
}
```

### 2.4 Sync File to R2 Function

```typescript
async function syncFileToR2(driveItemId: string, fileName?: string): Promise<{
  success: boolean;
  r2Path?: string;
  error?: string;
}> {
  const accessToken = await getAccessToken();
  const serviceAccount = process.env.M365_SERVICE_ACCOUNT!;
  
  // Step 1: Get file metadata to find original R2 path
  const metaResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}?select=id,name,parentReference,description`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!metaResponse.ok) {
    return { success: false, error: 'Failed to get file metadata' };
  }
  
  const metadata = await metaResponse.json();
  const actualFileName = fileName || metadata.name;
  
  // Extract R2 path from description or mapping
  // Option: Store mapping in database or encode in description
  const r2Path = await getR2PathForFile(driveItemId, actualFileName);
  
  // Step 2: Download file content from OneDrive
  const contentResponse = await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}/content`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  
  if (!contentResponse.ok) {
    return { success: false, error: 'Failed to download file' };
  }
  
  const fileBuffer = Buffer.from(await contentResponse.arrayBuffer());
  
  // Step 3: Upload to R2 (overwrite)
  const r2Response = await fetch(
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET_NAME}/${r2Path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `AWS4-HMAC-SHA256 ...`,  // AWS signature
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Length': fileBuffer.length.toString(),
      },
      body: fileBuffer,
    }
  );
  
  if (!r2Response.ok) {
    return { success: false, error: 'Failed to upload to R2' };
  }
  
  // Step 4: Delete from OneDrive (cleanup)
  await fetch(
    `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` }
    }
  );
  
  // Step 5: Log activity
  await logSyncActivity(driveItemId, r2Path, fileBuffer.length);
  
  return { success: true, r2Path };
}
```

### 2.5 File Path Mapping

Two options for tracking which R2 file corresponds to OneDrive temp file:

#### Option A: Database Mapping

```typescript
// When starting edit, store mapping
await db.editSession.create({
  data: {
    id: generateId(),
    driveItemId: driveItem.id,
    r2Path: objectKey,
    originalFileName: fileName,
    createdAt: new Date(),
    status: 'editing',
  }
});

// When syncing, lookup mapping
const mapping = await db.editSession.findFirst({
  where: { driveItemId, status: 'editing' }
});
const r2Path = mapping?.r2Path;
```

#### Option B: Encode in File Description

```typescript
// When uploading to OneDrive, set description
await fetch(
  `https://graph.microsoft.com/v1.0/users/${serviceAccount}/drive/items/${driveItemId}`,
  {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      description: `R2-PATH:${objectKey}|EDIT-SESSION:${sessionId}`
    }),
  }
);
```

---

## Implementation Checklist

### Backend (Vercel API Routes)

- [ ] `/api/excel-edit/start` - POST - Start editing session
- [ ] `/api/excel-edit/webhook` - GET/POST - Webhook handler
- [ ] `/api/excel-edit/sync-check` - GET - Cron polling endpoint
- [ ] `/api/excel-edit/status` - GET - Check edit session status
- [ ] `/lib/azure-auth.ts` - Token management with caching
- [ ] `/lib/graph-api.ts` - Graph API helper functions
- [ ] `/lib/file-mapping.ts` - R2 <-> OneDrive path mapping

### Frontend Components

- [ ] Update ExcelEditDialog component
- [ ] Add edit status indicator
- [ ] Handle edit URL redirect
- [ ] Add manual sync button (optional)

### Database Schema

```sql
-- Edit sessions table
CREATE TABLE edit_sessions (
  id TEXT PRIMARY KEY,
  drive_item_id TEXT NOT NULL,
  r2_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  edit_url TEXT,
  status TEXT DEFAULT 'editing', -- editing, synced, expired
  created_at TIMESTAMP DEFAULT NOW(),
  synced_at TIMESTAMP,
  created_by TEXT REFERENCES users(id)
);

-- Sync logs table
CREATE TABLE sync_logs (
  id TEXT PRIMARY KEY,
  session_id TEXT REFERENCES edit_sessions(id),
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Security Considerations

1. **Token Storage**: Cache Azure AD tokens in memory, never in database
2. **Webhook Validation**: Always validate client state token
3. **Rate Limiting**: Implement rate limiting on edit endpoints
4. **Session Expiry**: Auto-cleanup edit sessions after 24 hours
5. **Admin Only**: Verify Supabase session has admin role
6. **CORS**: Restrict API to your frontend domain only

---

## Monitoring & Logging

```typescript
// Log structure
interface EditLog {
  timestamp: Date;
  action: 'START_EDIT' | 'SYNC_COMPLETE' | 'SYNC_FAILED' | 'CLEANUP';
  userId: string;
  fileId: string;
  driveItemId?: string;
  r2Path?: string;
  duration?: number;
  error?: string;
}
```

---

## Deployment Steps

1. **Azure AD Setup**
   - Verify admin consent granted
   - Test token acquisition
   - Note service account email

2. **OneDrive Setup**
   - Login to service account once
   - Create R2-Edit-Temp folder manually (first time)
   - Note folder ID

3. **Vercel Deployment**
   - Set environment variables
   - Deploy API routes
   - Test webhook validation endpoint

4. **Webhook Subscription**
   - Create subscription via API
   - Verify notifications received
   - Set up renewal cron (subscriptions expire in 3 days max)

5. **Testing**
   - Test full edit flow
   - Test sync back to R2
   - Verify file integrity

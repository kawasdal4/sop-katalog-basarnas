# R2 ↔ Microsoft 365 OneDrive Bridge

## Overview

This document describes the integration between Cloudflare R2 (primary storage) and Microsoft 365 SharePoint/OneDrive (for Excel file editing).

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           E-SOP Document System                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│   ┌───────────────┐        ┌───────────────┐        ┌───────────────────┐   │
│   │               │        │               │        │                   │   │
│   │  Cloudflare   │        │   Next.js     │        │   Microsoft 365   │   │
│   │      R2       │◄──────►│    Server     │◄──────►│    SharePoint     │   │
│   │  (PRIMARY)    │        │               │        │   (EDIT ONLY)     │   │
│   │               │        │               │        │                   │   │
│   └───────────────┘        └───────────────┘        └───────────────────┘   │
│          │                        │                         │                 │
│          │                        │                         │                 │
│          ▼                        ▼                         ▼                 │
│   ┌───────────────┐        ┌───────────────┐        ┌───────────────────┐   │
│   │   Public URL  │        │  SQLite DB    │        │   R2-Edit-Temp    │   │
│   │   (Preview)   │        │  (Metadata)   │        │    (Folder)       │   │
│   └───────────────┘        └───────────────┘        └───────────────────┘   │
│                                                                               │
│   ┌───────────────┐                                                          │
│   │  Google Drive │                                                          │
│   │   (BACKUP)    │                                                          │
│   └───────────────┘                                                          │
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Storage Roles

| Storage | Role | Access | Notes |
|---------|------|--------|-------|
| **Cloudflare R2** | PRIMARY | Public URL | All files stored here for fast access |
| **Google Drive** | BACKUP | API | Automatic backup for redundancy |
| **Microsoft 365** | EDITING | Graph API | Temporary folder for Excel editing |

## Three Document Flows

### Flow 1: Preview (Direct R2 Access)
```
User Request → R2 Public URL → Browser
```
- No server processing
- Instant access via CDN
- Supports PDF, images, and Office files (via Office Online Viewer)

### Flow 2: Edit (R2 → SharePoint → Edit URL)
```
1. Admin clicks "Edit" on Excel file
2. Server downloads file from R2
3. Server uploads to SharePoint "R2-Edit-Temp" folder
4. Server creates sharing link
5. User redirected to Excel Online
6. User edits and saves in browser
7. User clicks "Sync to R2" when done
```

### Flow 3: Sync Back (SharePoint → R2)
```
1. Admin clicks "Sync to R2"
2. Server downloads edited file from SharePoint
3. Server uploads to R2 (overwrites original)
4. File now updated in primary storage
```

## API Endpoints

### `/api/edit` (POST)
Start editing a file in SharePoint.

**Request:**
```json
{
  "fileId": "uuid-of-sop-file"
}
```

**Response:**
```json
{
  "success": true,
  "mode": "sharepoint",
  "editUrl": "https://...",
  "fileName": "SOP-0001.xlsx",
  "r2Path": "SOP/SOP-0001.xlsx",
  "oneDriveId": "drive-item-id",
  "siteId": "sharepoint-site-id",
  "driveId": "sharepoint-drive-id",
  "message": "File uploaded to SharePoint. Edit in Excel Online, then click 'Sync to R2' when done."
}
```

### `/api/sync-edit` (POST)
Sync edited file back to R2.

**Request:**
```json
{
  "fileName": "SOP-0001.xlsx",
  "r2Path": "SOP/SOP-0001.xlsx",
  "siteId": "sharepoint-site-id",
  "driveId": "sharepoint-drive-id"
}
```

**Response:**
```json
{
  "success": true,
  "message": "File \"SOP-0001.xlsx\" successfully synced to R2",
  "r2Path": "SOP/SOP-0001.xlsx",
  "r2Url": "https://pub-xxx.r2.dev/SOP/SOP-0001.xlsx",
  "size": 12345
}
```

### `/api/sync-edit` (GET)
List files in SharePoint edit folder.

**Response:**
```json
{
  "success": true,
  "siteId": "...",
  "driveId": "...",
  "files": [
    {
      "id": "item-id",
      "name": "SOP-0001.xlsx",
      "size": 12345,
      "lastModified": "2024-01-15T10:30:00Z",
      "webUrl": "https://..."
    }
  ]
}
```

### `/api/sync-edit` (DELETE)
Remove file from SharePoint after sync.

**Query Parameters:**
- `fileName`: Name of the file to delete

## Environment Variables

```env
# Microsoft Azure AD
TENANT_ID=27912a48-01b0-4483-8e9d-1cfd1a581aa3
CLIENT_ID=be01c006-221c-4c52-ba9d-fcbe83fc22a9
CLIENT_SECRET=your-client-secret

# Cloudflare R2
R2_ACCOUNT_ID=your-account-id
R2_ACCESS_KEY_ID=your-access-key
R2_SECRET_ACCESS_KEY=your-secret-key
R2_BUCKET_NAME=sop-katalog-basarnas
R2_PUBLIC_URL=https://pub-xxx.r2.dev

# Google Drive (Backup)
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx
GOOGLE_REFRESH_TOKEN=1//xxx
GOOGLE_DRIVE_FOLDER_ID=xxx
```

## Microsoft Graph API Permissions

The Azure AD application requires these permissions:

| Permission | Type | Description |
|------------|------|-------------|
| `Files.ReadWrite.All` | Application | Read and write all files |
| `Sites.ReadWrite.All` | Application | Access SharePoint sites |

**Grant Admin Consent:**
1. Go to Azure Portal → App Registrations
2. Select your application
3. API Permissions → Click "Grant admin consent"

## Frontend Implementation

The edit dialog in `page.tsx` provides:

1. **Edit Button** - Opens edit dialog with options
2. **Start Edit** - Calls `/api/edit`, opens SharePoint URL in new tab
3. **Sync to R2** - Calls `/api/sync-edit` to sync changes back
4. **Close** - Closes the dialog

```tsx
// State for Excel edit
const [showExcelEditDialog, setShowExcelEditDialog] = useState(false)
const [excelEditData, setExcelEditData] = useState<SopFile | null>(null)
const [excelEditUrl, setExcelEditUrl] = useState<string | null>(null)
const [excelEditSiteId, setExcelEditSiteId] = useState<string | null>(null)
const [excelEditDriveId, setExcelEditDriveId] = useState<string | null>(null)

// Start editing
const handleStartExcelEdit = async () => {
  const res = await fetch('/api/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId: excelEditData.id })
  })
  const data = await res.json()
  if (data.success) {
    setExcelEditUrl(data.editUrl)
    setExcelEditSiteId(data.siteId)
    setExcelEditDriveId(data.driveId)
    window.open(data.editUrl, '_blank')
  }
}

// Sync back to R2
const handleSyncToR2 = async () => {
  const res = await fetch('/api/sync-edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      fileName: excelEditData.fileName,
      r2Path: excelEditData.filePath,
      siteId: excelEditSiteId,
      driveId: excelEditDriveId
    })
  })
  // Handle response...
}
```

## Cloudflare Worker (Optional)

For webhook-based auto-sync, a Cloudflare Worker is available at:
`/cloudflare-worker/src/index.ts`

### Deploy Worker:
```bash
cd cloudflare-worker
bun install
wrangler login
wrangler secret put CLIENT_ID
wrangler secret put CLIENT_SECRET
wrangler secret put TENANT_ID
wrangler secret put WEBHOOK_VALIDATION_TOKEN
wrangler deploy
```

### Worker Endpoints:
- `GET /health` - Health check
- `GET /edit?key=file-path` - Edit file
- `POST /webhook` - Microsoft Graph webhook for auto-sync

## Security Considerations

1. **Admin Only** - Only users with ADMIN role can edit files
2. **Session Required** - All edit operations require authentication
3. **Audit Log** - All operations are logged in the database
4. **Temp Folder** - Files in `R2-Edit-Temp` should be cleaned up periodically

## Troubleshooting

### "Cannot access SharePoint root site"
- Verify Azure AD app has correct permissions
- Grant admin consent in Azure Portal
- Check tenant ID is correct

### "Failed to get access token"
- Verify CLIENT_ID and CLIENT_SECRET
- Check if app is enabled
- Verify tenant ID matches

### "File not found in SharePoint"
- User hasn't saved changes yet
- File was deleted manually
- Folder `R2-Edit-Temp` doesn't exist

### R2 Connection Failed
- Check R2_ACCESS_KEY_ID and R2_SECRET_ACCESS_KEY
- Verify bucket exists
- Check R2_PUBLIC_URL is configured

## Changelog

- **2024-01-15**: Initial implementation of R2 ↔ SharePoint bridge
- **2024-01-16**: Added sync-back functionality
- **2024-01-17**: Created Cloudflare Worker for webhook support

/**
 * Microsoft Graph API Helper Functions
 * 
 * All operations use Application permissions (no user login required)
 */

import { getAzureAccessToken, getServiceAccount, getEditFolderName } from './azure-auth';

// Types
interface DriveItem {
  id: string;
  name: string;
  size?: number;
  webUrl?: string;
  createdDateTime?: string;
  lastModifiedDateTime?: string;
  description?: string;
  parentReference?: {
    id: string;
    driveId: string;
  };
}

interface ShareLink {
  id: string;
  link: {
    webUrl: string;
    type: 'view' | 'edit';
    scope: 'anonymous' | 'organization' | 'users';
  };
  roles: string[];
}

interface DriveItemList {
  value: DriveItem[];
  '@odata.nextLink'?: string;
}

/**
 * Make a Graph API request with auto token refresh
 */
async function graphRequest(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAzureAccessToken();
  
  const url = endpoint.startsWith('https') 
    ? endpoint 
    : `https://graph.microsoft.com/v1.0${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      ...options.headers,
    },
  });
}

/**
 * Get Graph API JSON response with error handling
 */
async function graphJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const response = await graphRequest(endpoint, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    let errorData;
    try {
      errorData = JSON.parse(errorText);
    } catch {
      errorData = { message: errorText };
    }
    
    console.error('❌ Graph API error:', response.status, errorData);
    throw new GraphApiError(
      errorData.error?.message || `Graph API error: ${response.status}`,
      response.status,
      errorData.error?.code
    );
  }
  
  return response.json();
}

/**
 * Custom error class for Graph API errors
 */
export class GraphApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message);
    this.name = 'GraphApiError';
  }
}

/**
 * Ensure the edit folder exists in OneDrive
 * Returns the folder ID
 */
export async function ensureEditFolder(): Promise<string> {
  const serviceAccount = getServiceAccount();
  const folderName = getEditFolderName();
  
  // Try to get existing folder
  try {
    const folder = await graphJson<DriveItem>(
      `/users/${serviceAccount}/drive/root:/${folderName}`
    );
    console.log('📁 Edit folder exists:', folder.id);
    return folder.id;
  } catch (error) {
    if (error instanceof GraphApiError && error.statusCode === 404) {
      // Folder doesn't exist, create it
      console.log('📁 Creating edit folder:', folderName);
      
      const newFolder = await graphJson<DriveItem>(
        `/users/${serviceAccount}/drive/root/children`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'fail',
          }),
        }
      );
      
      console.log('✅ Edit folder created:', newFolder.id);
      return newFolder.id;
    }
    throw error;
  }
}

/**
 * Upload a file to the edit folder
 * Returns the DriveItem of the uploaded file
 */
export async function uploadFileToEditFolder(
  fileName: string,
  content: Buffer | ArrayBuffer,
  contentType: string,
  metadata?: { r2Path: string; sessionId: string }
): Promise<DriveItem> {
  const serviceAccount = getServiceAccount();
  const folderName = getEditFolderName();
  
  // Upload file
  console.log(`📤 Uploading file to OneDrive: ${fileName}`);
  
  const uploadResponse = await graphRequest(
    `/users/${serviceAccount}/drive/root:/${folderName}/${fileName}:/content`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': contentType,
      },
      body: content,
    }
  );
  
  if (!uploadResponse.ok) {
    const errorText = await uploadResponse.text();
    throw new Error(`Failed to upload file: ${uploadResponse.status} ${errorText}`);
  }
  
  const driveItem: DriveItem = await uploadResponse.json();
  console.log('✅ File uploaded:', driveItem.id);
  
  // Add metadata as description for tracking
  if (metadata) {
    try {
      await graphRequest(
        `/users/${serviceAccount}/drive/items/${driveItem.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: `R2-PATH:${metadata.r2Path}|SESSION:${metadata.sessionId}`,
          }),
        }
      );
    } catch (error) {
      console.warn('⚠️ Failed to add metadata to file:', error);
    }
  }
  
  return driveItem;
}

/**
 * Create an edit sharing link for a file
 * Returns the sharing link URL
 */
export async function createEditLink(driveItemId: string): Promise<string> {
  const serviceAccount = getServiceAccount();
  
  console.log('🔗 Creating edit link for:', driveItemId);
  
  const shareResult = await graphJson<ShareLink>(
    `/users/${serviceAccount}/drive/items/${driveItemId}/createLink`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'edit',
        scope: 'organization',
      }),
    }
  );
  
  const editUrl = shareResult.link.webUrl;
  console.log('✅ Edit link created:', editUrl);
  
  return editUrl;
}

/**
 * Download file content from OneDrive
 */
export async function downloadFileFromOneDrive(driveItemId: string): Promise<ArrayBuffer> {
  const serviceAccount = getServiceAccount();
  
  console.log('📥 Downloading file from OneDrive:', driveItemId);
  
  const response = await graphRequest(
    `/users/${serviceAccount}/drive/items/${driveItemId}/content`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }
  
  const content = await response.arrayBuffer();
  console.log('✅ File downloaded:', content.byteLength, 'bytes');
  
  return content;
}

/**
 * Get file metadata
 */
export async function getFileMetadata(driveItemId: string): Promise<DriveItem> {
  const serviceAccount = getServiceAccount();
  
  return graphJson<DriveItem>(
    `/users/${serviceAccount}/drive/items/${driveItemId}?select=id,name,size,lastModifiedDateTime,description,parentReference`
  );
}

/**
 * Parse metadata from file description
 */
export function parseFileMetadata(description?: string): { r2Path?: string; sessionId?: string } {
  if (!description) return {};
  
  const result: { r2Path?: string; sessionId?: string } = {};
  
  const r2PathMatch = description.match(/R2-PATH:([^|]+)/);
  if (r2PathMatch) {
    result.r2Path = r2PathMatch[1];
  }
  
  const sessionMatch = description.match(/SESSION:([^|]+)/);
  if (sessionMatch) {
    result.sessionId = sessionMatch[1];
  }
  
  return result;
}

/**
 * List files in edit folder
 */
export async function listEditFolderFiles(): Promise<DriveItem[]> {
  const serviceAccount = getServiceAccount();
  const folderName = getEditFolderName();
  
  const result = await graphJson<DriveItemList>(
    `/users/${serviceAccount}/drive/root:/${folderName}:/children?select=id,name,size,lastModifiedDateTime,description`
  );
  
  return result.value || [];
}

/**
 * Delete file from OneDrive
 */
export async function deleteFileFromOneDrive(driveItemId: string): Promise<void> {
  const serviceAccount = getServiceAccount();
  
  console.log('🗑️ Deleting file from OneDrive:', driveItemId);
  
  const response = await graphRequest(
    `/users/${serviceAccount}/drive/items/${driveItemId}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete file: ${response.status}`);
  }
  
  console.log('✅ File deleted from OneDrive');
}

/**
 * Create webhook subscription for edit folder changes
 */
export async function createWebhookSubscription(
  notificationUrl: string,
  validationToken: string,
  expirationDays: number = 3
): Promise<{ id: string; expirationDateTime: string }> {
  const serviceAccount = getServiceAccount();
  const folderName = getEditFolderName();
  
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);
  
  console.log('🔔 Creating webhook subscription...');
  
  const result = await graphJson<{ id: string; expirationDateTime: string }>(
    '/subscriptions',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        changeType: 'updated,created',
        notificationUrl: notificationUrl,
        resource: `/users/${serviceAccount}/drive/root:/${folderName}:/delta`,
        expirationDateTime: expirationDate.toISOString(),
        clientState: validationToken,
        latestSupportedTlsVersion: 'v1_2',
      }),
    }
  );
  
  console.log('✅ Webhook subscription created:', result.id);
  return result;
}

/**
 * Renew webhook subscription
 */
export async function renewWebhookSubscription(
  subscriptionId: string,
  expirationDays: number = 3
): Promise<{ expirationDateTime: string }> {
  const expirationDate = new Date();
  expirationDate.setDate(expirationDate.getDate() + expirationDays);
  
  const result = await graphJson<{ expirationDateTime: string }>(
    `/subscriptions/${subscriptionId}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        expirationDateTime: expirationDate.toISOString(),
      }),
    }
  );
  
  console.log('✅ Webhook subscription renewed');
  return result;
}

/**
 * Delete webhook subscription
 */
export async function deleteWebhookSubscription(subscriptionId: string): Promise<void> {
  const response = await graphRequest(
    `/subscriptions/${subscriptionId}`,
    { method: 'DELETE' }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to delete subscription: ${response.status}`);
  }
  
  console.log('✅ Webhook subscription deleted');
}

/**
 * Azure AD Authentication - Client Credentials Flow
 * 
 * This module handles authentication with Azure AD using client credentials flow.
 * No user login required - all operations are server-side.
 */

// Token cache with auto-refresh
interface TokenCache {
  accessToken: string;
  expiresAt: number; // Unix timestamp in milliseconds
}

let tokenCache: TokenCache | null = null;

/**
 * Get Azure AD access token using Client Credentials Flow
 * 
 * @returns Access token for Microsoft Graph API
 */
export async function getAzureAccessToken(): Promise<string> {
  // Check cache first (refresh 5 minutes before expiry)
  if (tokenCache && tokenCache.expiresAt > Date.now() + 5 * 60 * 1000) {
    return tokenCache.accessToken;
  }

  const tenantId = process.env.AZURE_TENANT_ID;
  const clientId = process.env.AZURE_CLIENT_ID;
  const clientSecret = process.env.AZURE_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Azure AD credentials not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  console.log('🔐 Requesting Azure AD access token...');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
      grant_type: 'client_credentials',
    }).toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Azure AD token request failed:', errorText);
    throw new Error(`Failed to get Azure AD token: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  // Cache the token
  tokenCache = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in * 1000),
  };

  console.log('✅ Azure AD access token obtained, expires in', data.expires_in, 'seconds');

  return data.access_token;
}

/**
 * Clear the token cache (for testing or forced refresh)
 */
export function clearTokenCache(): void {
  tokenCache = null;
}

/**
 * Check if Azure AD is configured
 */
export function isAzureConfigured(): boolean {
  return !!(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);
}

/**
 * Get service account email for OneDrive operations
 */
export function getServiceAccount(): string {
  const account = process.env.M365_SERVICE_ACCOUNT;
  if (!account) {
    throw new Error('M365_SERVICE_ACCOUNT not configured');
  }
  return account;
}

/**
 * Get edit folder name
 */
export function getEditFolderName(): string {
  return process.env.M365_EDIT_FOLDER || 'R2-Edit-Temp';
}

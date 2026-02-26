/**
 * Cloudflare Worker: R2 ↔ Microsoft 365 OneDrive Bridge
 * 
 * Azure AD Solution for SOP File Editing
 */

interface Env {
  MY_BUCKET: R2Bucket;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  TENANT_ID: string;
  EDIT_FOLDER: string;
  R2_BUCKET_NAME: string;
  WEBHOOK_VALIDATION_TOKEN: string;
  ADMIN_EMAILS: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
}

interface DriveItem {
  id: string;
  name: string;
  webUrl: string;
}

interface Permission {
  link?: { webUrl: string };
}

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(env: Env): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }
  
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });
  
  const response = await fetch(
    `https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`,
    { method: 'POST', body: params.toString(), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );
  
  const data: TokenResponse = await response.json();
  tokenCache = { token: data.access_token, expiresAt: Date.now() + (data.expires_in - 300) * 1000 };
  return data.access_token;
}

async function graphFetch(endpoint: string, token: string, options: RequestInit = {}): Promise<Response> {
  return fetch(endpoint.startsWith('https') ? endpoint : `https://graph.microsoft.com/v1.0${endpoint}`, {
    ...options,
    headers: { 'Authorization': `Bearer ${token}`, ...options.headers },
  });
}

async function getOrCreateFolder(env: Env, token: string): Promise<string> {
  const name = env.EDIT_FOLDER || 'R2-Edit-Temp';
  const res = await graphFetch(`/me/drive/root:/${name}`, token);
  if (res.ok) return (await res.json() as DriveItem).id;
  
  const create = await graphFetch('/me/drive/root/children', token, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, folder: {} }),
  });
  return (await create.json() as DriveItem).id;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname, searchParams } = new URL(request.url);
    const corsHeaders = { 'Access-Control-Allow-Origin': '*' };
    
    if (request.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
    
    try {
      // Health
      if (pathname === '/health') {
        return Response.json({ success: true, status: 'ok' }, { headers: corsHeaders });
      }
      
      // Flow 2: Edit
      if (pathname === '/edit' && request.method === 'GET') {
        const objectKey = searchParams.get('key');
        if (!objectKey) return Response.json({ success: false, error: 'key required' }, { status: 400, headers: corsHeaders });
        
        const token = await getAccessToken(env);
        
        // Download from R2
        const r2Obj = await env.MY_BUCKET.get(objectKey);
        if (!r2Obj) return Response.json({ success: false, error: 'Not found in R2' }, { status: 404, headers: corsHeaders });
        const buffer = await r2Obj.arrayBuffer();
        const fileName = objectKey.split('/').pop() || objectKey;
        
        // Upload to OneDrive
        const folderId = await getOrCreateFolder(env, token);
        const uploadRes = await graphFetch(`/me/drive/items/${folderId}:/${fileName}:/content`, token, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
          body: buffer,
        });
        const driveItem: DriveItem = await uploadRes.json();
        
        // Create share link
        const linkRes = await graphFetch(`/me/drive/items/${driveItem.id}/createLink`, token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'edit', scope: 'organization' }),
        });
        const perm: Permission = await linkRes.json();
        
        return Response.json({
          success: true,
          objectKey,
          fileName,
          driveItemId: driveItem.id,
          editUrl: perm.link?.webUrl,
        }, { headers: corsHeaders });
      }
      
      // Flow 3: Webhook
      if (pathname === '/webhook' && request.method === 'POST') {
        const validationToken = searchParams.get('validationToken');
        if (validationToken) return new Response(validationToken, { headers: corsHeaders });
        
        const payload = await request.json();
        // Process notifications...
        return new Response(null, { status: 202, headers: corsHeaders });
      }
      
      return Response.json({ success: false, error: 'Not found' }, { status: 404, headers: corsHeaders });
    } catch (error) {
      return Response.json({ success: false, error: String(error) }, { status: 500, headers: corsHeaders });
    }
  },
};

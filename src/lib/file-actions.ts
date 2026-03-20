/**
 * Shared File Action Library for Tauri and Web
 * Unifies openExternal (preview) and handleNativeDownload (Save As)
 */

// Detect if running in Tauri environment
export const isTauri = typeof window !== 'undefined' && 
  ((window as any).__TAURI_INTERNALS__ !== undefined || (window as any).__TAURI__ !== undefined);

/**
 * Open external URL or local file path
 * Optimized for Tauri v2 and Web
 */
export const openExternal = async (url: string): Promise<boolean> => {
  if (!isTauri) {
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
    return false;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');

    if (url.startsWith('blob:')) {
      // Blob URL: download bytes, save to temp, then open via native OS
      console.log('[FileActions] Processing blob URL for native open...');
      const res = await fetch(url);
      const blob = await res.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = Array.from(new Uint8Array(arrayBuffer));
      const fileName = `preview_${Date.now()}.pdf`;
      
      const tempPath = await invoke<string>('save_temp_file', { bytes, fileName });
      if (tempPath) {
        console.log('[FileActions] Opening temp file:', tempPath);
        await invoke('native_open', { path: tempPath });
        return true;
      }
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      // HTTPS URL: use shell plugin (native_open/explorer doesn't reliably handle URLs on Windows)
      console.log('[FileActions] Opening HTTPS URL via shell plugin:', url);
      const { open } = await import('@tauri-apps/plugin-shell');
      await open(url);
      return true;
    } else {
      // Local file path (absolute)
      console.log('[FileActions] Opening local path:', url);
      await invoke('native_open', { path: url });
      return true;
    }
  } catch (err) {
    console.error('[FileActions] openExternal failed:', err);
    // Fallback to browser window.open if possible
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }
  return false;
};

/**
 * Native Download for Tauri (Save As dialog)
 * Fallback to browser blob download on Web
 */
export const handleNativeDownload = async (blob: Blob, fileName: string): Promise<string | null> => {
  if (!isTauri) {
    if (typeof window === 'undefined') return null;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    return 'browser';
  }

  try {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { invoke } = await import('@tauri-apps/api/core');
    
    const fileExt = fileName.split('.').pop() || 'pdf';
    const filePath = await save({
      defaultPath: fileName,
      filters: [{ name: 'Document', extensions: [fileExt] }]
    });
    
    if (!filePath) return null; // User cancelled
    
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = Array.from(new Uint8Array(arrayBuffer));
    
    // Use native Rust backend command to bypass ACL constraints
    await invoke('native_save', { path: filePath, bytes });
    
    console.log('[FileActions] File saved to:', filePath);
    return filePath;
  } catch (err) {
    console.error('[FileActions] handleNativeDownload failed:', err);
    throw err;
  }
};

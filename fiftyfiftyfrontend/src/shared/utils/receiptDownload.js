/**
 * Helper utilities for downloading and previewing official PDF receipts.
 * Handles binary Blob conversion, JWT authentication, and URL resolution.
 */

export const resolveReceiptUrl = (urlOrPath) => {
  if (!urlOrPath) return '';
  if (urlOrPath.startsWith('http://') || urlOrPath.startsWith('https://') || urlOrPath.startsWith('blob:')) {
    return urlOrPath;
  }
  const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  const cleanPath = urlOrPath.startsWith('/') ? urlOrPath : `/${urlOrPath}`;
  return `${apiBase}${cleanPath}`;
};

export const downloadReceiptPdf = async (receipt) => {
  if (!receipt) throw new Error('No receipt provided');

  const rawUrl = receipt.downloadUrl || `/api/receipts/${receipt.id}/download`;
  const fullUrl = resolveReceiptUrl(rawUrl);

  const token = localStorage.getItem('fiftyfifty_token') ||
                localStorage.getItem('fiftyfifty_owner_token') ||
                localStorage.getItem('fiftyfifty_member_token');

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    let errMsg = `Server returned status ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch (_e) {}
    throw new Error(errMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const text = await response.text();
    let errMsg = 'Downloaded file was not a valid PDF';
    try {
      const json = JSON.parse(text);
      errMsg = json.message || errMsg;
    } catch (_e) {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = `${receipt.receiptNumber || 'receipt'}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
};

export const previewReceiptPdf = async (receipt) => {
  if (!receipt) throw new Error('No receipt provided');

  const rawUrl = receipt.previewUrl || `/api/receipts/${receipt.id}/preview`;
  const fullUrl = resolveReceiptUrl(rawUrl);

  const token = localStorage.getItem('fiftyfifty_token') ||
                localStorage.getItem('fiftyfifty_owner_token') ||
                localStorage.getItem('fiftyfifty_member_token');

  const response = await fetch(fullUrl, {
    method: 'GET',
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    let errMsg = `Server returned status ${response.status}`;
    try {
      const errJson = await response.json();
      errMsg = errJson.message || errMsg;
    } catch (_e) {}
    throw new Error(errMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/pdf')) {
    const text = await response.text();
    let errMsg = 'Preview file was not a valid PDF';
    try {
      const json = JSON.parse(text);
      errMsg = json.message || errMsg;
    } catch (_e) {}
    throw new Error(errMsg);
  }

  const blob = await response.blob();
  const pdfBlob = new Blob([blob], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  window.open(blobUrl, '_blank', 'noopener,noreferrer');
};

import { API_BASE_URL } from './userService';

const API_URL = process.env.REACT_APP_GCS_API_URL || 'https://gcs-signed-urls-20536909632.us-central1.run.app';
// El respaldo local SIEMPRE debe apuntar al backend real de la app (la misma
// URL que usa el resto de los servicios). Nunca debe derivar de la URL del
// servicio de firmas GCS. Este era el bug: REACT_APP_BACKEND_URL apuntaba al
// Cloud Run de GCS y el respaldo /api/files/upload golpeaba un servicio caído.
const BACKEND_URL = API_BASE_URL;
console.log("fileStorageService API_URL:", API_URL, "| BACKEND_URL:", BACKEND_URL);

const getToken = () => {
  if (typeof window === 'undefined') return null;
  const userInfo = window.localStorage.getItem('userInfo');
  return userInfo ? JSON.parse(userInfo).token : null;
};

/**
 * Sube el archivo usando el backend como respaldo (multer) cuando el servicio
 * de firmas de GCS no está disponible.
 * @param {File} file
 * @returns {Promise<{fileUrl: string, uniqueFilename: string}>}
 */
const uploadFileToBackend = async (file) => {
  const form = new FormData();
  form.append('file', file);
  const token = getToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BACKEND_URL}/api/files/upload`, {
    method: 'POST',
    headers,
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Failed to upload file to backend: ${response.statusText}`);
  }
  return response.json();
};

/**
 * Requests a signed URL from the backend for uploading a file to GCS,
 * then uploads the file directly to GCS using a PUT request.
 * @param {File} file The file to upload.
 * @returns {Promise<{fileUrl: string, uniqueFilename: string}>} A promise that resolves with the URL and the unique filename of the uploaded file.
 */
export const uploadFile = async (file) => {
  if (!API_URL) {
    throw new Error("REACT_APP_GCS_API_URL / REACT_APP_BACKEND_URL is not defined.");
  }
  console.log(`[uploadFile] Requesting signed URL for: ${file.name} (Type: ${file.type}) from ${API_URL}/api/gcs/upload-url`);

  try {
    // 1. Request a signed URL from the backend for upload
    const response = await fetch(`${API_URL}/api/gcs/upload-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        contentType: file.type,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[uploadFile] Failed to get signed URL:', errorData);
      throw new Error(`Failed to get signed URL: ${errorData.message || response.statusText}`);
    }

    const { signedUrl, fileUrl } = await response.json();
    console.log('[uploadFile] Received signed URL and fileUrl:', { signedUrl, fileUrl });

    if (!signedUrl || !fileUrl) {
      throw new Error("Signed URL or file URL not received from backend.");
    }

    // 2. Upload the file directly to GCS using the signed URL
    console.log(`[uploadFile] Uploading file to GCS: ${file.name}`);
    const uploadResponse = await fetch(signedUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': file.type,
      },
      body: file,
    });

    if (!uploadResponse.ok) {
      console.error('[uploadFile] GCS upload failed. Status:', uploadResponse.statusText);
      throw new Error(`Failed to upload file to GCS: ${uploadResponse.statusText}`);
    }

    console.log(`[uploadFile] File uploaded successfully to: ${fileUrl}`);
    return { fileUrl, uniqueFilename: file.name }; // Return both the URL and the original filename
  } catch (error) {
    console.warn('[uploadFile] GCS no disponible, intentando respaldo local en backend:', error.message);
    try {
      const result = await uploadFileToBackend(file);
      console.log(`[uploadFile] Archivo subido al respaldo local: ${result.fileUrl}`);
      return result;
    } catch (fallbackError) {
      console.error('[uploadFile] Respaldo local también falló:', fallbackError);
      throw new Error(`Error al subir el archivo: ${fallbackError.message}`);
    }
  }
};

/**
 * Descarga un archivo. Acepta una URL absoluta (GCS), una URL relativa del
 * backend (/uploads/...) o un nombre de archivo (legacy).
 * @param {string} filenameOrUrl El nombre o URL del archivo a descargar.
 */
export const downloadFile = async (filenameOrUrl) => {
  let url;

  if (/^https?:\/\//i.test(filenameOrUrl)) {
    url = filenameOrUrl;
  } else if (filenameOrUrl.startsWith('/')) {
    url = `${BACKEND_URL}${filenameOrUrl}`;
  } else {
    // Legacy: nombre de archivo en GCS.
    try {
      const requestUrl = `${API_URL}/api/gcs/download-url?filename=${encodeURIComponent(filenameOrUrl)}`;
      console.log(`[downloadFile] Requesting signed URL for filename: "${filenameOrUrl}" from URL: ${requestUrl}`);
      const response = await fetch(requestUrl, { method: 'GET' });
      if (!response.ok) {
        throw new Error(`Failed to get signed URL for download: ${response.statusText}`);
      }
      const { signedUrl } = await response.json();
      if (!signedUrl) {
        throw new Error("Signed URL for download not received from backend.");
      }
      url = signedUrl;
    } catch (error) {
      console.warn('[downloadFile] GCS no disponible, intentando archivo local:', error.message);
      url = `${BACKEND_URL}/uploads/${encodeURIComponent(filenameOrUrl)}`;
    }
  }

  console.log(`[downloadFile] Initiating download for: ${url}`);
  window.open(url, '_blank');
};
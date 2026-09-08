
const API_URL = process.env.REACT_APP_GCS_API_URL || process.env.REACT_APP_BACKEND_URL || 'https://gcs-signed-urls-20536909632.us-central1.run.app';
console.log("fileStorageService API_URL:", API_URL);

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
    console.error('Error in uploadFile:', error);
    throw error;
  }
};

/**
 * Requests a signed URL from the backend for downloading a file from GCS,
 * then opens the URL in a new browser tab to initiate download.
 * @param {string} filename The name of the file to download.
 */
export const downloadFile = async (filename) => {
  if (!API_URL) {
    throw new Error("REACT_APP_GCS_API_URL / REACT_APP_BACKEND_URL is not defined.");
  }
  const requestUrl = `${API_URL}/api/gcs/download-url?filename=${encodeURIComponent(filename)}`;
  console.log(`[downloadFile] Requesting signed URL for filename: "${filename}" from URL: ${requestUrl}`);

  try {
    // 1. Request a signed URL from the backend for download
    const response = await fetch(requestUrl, {
      method: 'GET',
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('[downloadFile] Failed to get signed URL:', errorData);
      throw new Error(`Failed to get signed URL for download: ${errorData.message || response.statusText}`);
    }

    const { signedUrl } = await response.json();
    console.log('[downloadFile] Received signed URL:', signedUrl);

    if (!signedUrl) {
      throw new Error("Signed URL for download not received from backend.");
    }

    // 2. Open the signed URL in a new tab to initiate download
    window.open(signedUrl, '_blank');
    console.log(`[downloadFile] Initiated download for file: ${filename}`);
  } catch (error) {
    console.error('Error in downloadFile:', error);
    throw error;
  }
};

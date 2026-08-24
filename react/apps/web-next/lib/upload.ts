'use client';

import type { UploadedFile } from './types';

// Plain XHR (not fetch) because we want upload progress events, which
// fetch still doesn't expose for request bodies.
export function uploadFiles(files: File[], onProgress?: (percent: number) => void): Promise<UploadedFile[]> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload', true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response.fileData as UploadedFile[]);
        } catch (err) {
          reject(new Error('Bad response from upload server'));
        }
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.send(formData);
  });
}

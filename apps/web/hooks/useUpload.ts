import { useState } from 'react';
import { api } from '../lib/api';
import { useToast } from '../lib/toast';

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export function useUpload() {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const { addToast } = useToast();

  const uploadFile = async (file: File, type: 'image' | 'file' = 'file') => {
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      const formData = new FormData();
      formData.append(type, file);

      const response = await api.post(`/api/upload/${type}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const loaded = progressEvent.loaded;
          const total = progressEvent.total || file.size;
          const percentage = Math.round((loaded * 100) / total);

          setProgress({ loaded, total, percentage });
        },
      });

      addToast({
        type: 'success',
        title: 'File uploaded successfully',
      });

      return response.data;
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: error.response?.data?.error || 'Unknown error',
      });
      throw error;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const uploadWithPresignedUrl = async (
    file: File,
    uploadType: 'public' | 'private' = 'public'
  ) => {
    setUploading(true);
    setProgress({ loaded: 0, total: file.size, percentage: 0 });

    try {
      // Get presigned URL
      const { data } = await api.post('/api/upload/presigned-url', {
        fileName: file.name,
        fileType: file.type,
        uploadType,
      });

      // Upload directly to S3
      await fetch(data.uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      addToast({
        type: 'success',
        title: 'File uploaded successfully',
      });

      return {
        key: data.key,
        bucket: data.bucket,
        url: `https://${data.bucket}.s3.amazonaws.com/${data.key}`,
      };
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Upload failed',
        message: error.message,
      });
      throw error;
    } finally {
      setUploading(false);
      setProgress(null);
    }
  };

  const deleteFile = async (key: string) => {
    try {
      await api.delete(`/api/uploads/file/${encodeURIComponent(key)}`);

      addToast({
        type: 'success',
        title: 'File deleted',
      });
    } catch (error: any) {
      addToast({
        type: 'error',
        title: 'Delete failed',
        message: error.response?.data?.error,
      });
      throw error;
    }
  };

  return {
    uploadFile,
    uploadWithPresignedUrl,
    deleteFile,
    uploading,
    progress,
  };
}
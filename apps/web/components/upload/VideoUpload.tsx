'use client';

import { useState, useRef, useCallback } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Video, Upload, X, Play, Pause, AlertCircle, CheckCircle } from 'lucide-react';

interface VideoUploadProps {
  lessonId: string;
  currentVideo?: {
    url?: string;
    key?: string;
    size?: number;
    duration?: number;
  };
  onUpload?: (videoData: any) => void;
  maxSize?: number; // in MB
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  speed?: number;
  remainingTime?: number;
}

export function VideoUpload({
  lessonId,
  currentVideo,
  onUpload,
  maxSize = 500, // 500MB default
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadedParts, setUploadedParts] = useState<Array<{ ETag: string; PartNumber: number }>>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const CHUNK_SIZE = 8 * 1024 * 1024; // 8MB chunks

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid video file type. Supported formats: MP4, WebM, OGG, MOV');
      return;
    }

    // Validate file size
    const maxBytes = maxSize * 1024 * 1024;
    if (file.size > maxBytes) {
      setError(`Video file size too large. Maximum size: ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);
    setError(null);
    setSuccess(false);

    // Create video preview
    const videoUrl = URL.createObjectURL(file);
    setPreview(videoUrl);
  }, [maxSize]);

  const uploadDirect = async (file: File) => {
    const formData = new FormData();
    formData.append('video', file);

    const response = await api.post(`/api/courses/lessons/${lessonId}/video/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const loaded = progressEvent.loaded;
        const total = progressEvent.total || file.size;
        const percentage = Math.round((loaded * 100) / total);

        const now = Date.now();
        if (!progress) {
          setProgress({
            loaded,
            total,
            percentage,
            speed: 0,
            remainingTime: 0,
          });
        } else {
          const timeDiff = now - (progress as any).lastUpdate || 1000;
          const loadedDiff = loaded - progress.loaded;
          const speed = (loadedDiff / timeDiff) * 1000; // bytes per second
          const remainingBytes = total - loaded;
          const remainingTime = remainingBytes / speed;

          setProgress({
            loaded,
            total,
            percentage,
            speed,
            remainingTime,
            lastUpdate: now,
          } as any);
        }
      },
    });

    return response.data;
  };

  const uploadMultipart = async (file: File) => {
    // Step 1: Initiate multipart upload
    const { data: initData } = await api.post(
      `/api/courses/lessons/${lessonId}/video/multipart/initiate`,
      {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
      }
    );

    const { uploadId: uploadIdFromServer, key, chunkSize } = initData;
    setUploadId(uploadIdFromServer);

    const chunks: Array<{ partNumber: number; chunk: Blob }> = [];
    let partNumber = 1;
    let start = 0;

    // Split file into chunks
    while (start < file.size) {
      const end = Math.min(start + chunkSize, file.size);
      chunks.push({
        partNumber,
        chunk: file.slice(start, end),
      });
      start = end;
      partNumber++;
    }

    const uploadedPartsArray: Array<{ ETag: string; PartNumber: number }> = [];

    // Step 2: Upload each chunk
    for (let i = 0; i < chunks.length; i++) {
      const { partNumber: partNum, chunk } = chunks[i];

      // Get presigned URL for this part
      const { data: partData } = await api.get(
        `/api/courses/lessons/${lessonId}/video/multipart/${uploadIdFromServer}/part-url`,
        { params: { partNumber: partNum } }
      );

      // Upload the chunk
      const response = await fetch(partData.uploadUrl, {
        method: 'PUT',
        body: chunk,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to upload part ${partNum}`);
      }

      const etag = response.headers.get('ETag');
      if (!etag) {
        throw new Error(`No ETag received for part ${partNum}`);
      }

      uploadedPartsArray.push({
        ETag: etag,
        PartNumber: partNum,
      });

      setUploadedParts([...uploadedPartsArray]);

      // Update progress
      const loaded = (i + 1) * chunk.size;
      const percentage = Math.round((loaded * 100) / file.size);
      setProgress({
        loaded,
        total: file.size,
        percentage,
      });
    }

    // Step 3: Complete multipart upload
    const { data: completeData } = await api.post(
      `/api/courses/lessons/${lessonId}/video/multipart/${uploadIdFromServer}/complete`,
      {
        parts: uploadedPartsArray,
        key,
        fileSize: file.size,
      }
    );

    return completeData;
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress({ loaded: 0, total: selectedFile.size, percentage: 0 });
    setError(null);

    try {
      let result;

      // Use multipart upload for large files (> 100MB)
      if (selectedFile.size > 100 * 1024 * 1024) {
        result = await uploadMultipart(selectedFile);
      } else {
        result = await uploadDirect(selectedFile);
      }

      setSuccess(true);
      onUpload?.(result);
    } catch (error: any) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.error || error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(null);
      setUploadId(null);
      setUploadedParts([]);
    }
  };

  const handleRemove = () => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setError(null);
    setSuccess(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const togglePreview = () => {
    const video = document.getElementById('video-preview') as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            {/* Current Video Display */}
            {currentVideo?.url && !selectedFile && (
              <div className="space-y-2">
                <h3 className="text-sm font-medium text-gray-900">Current Video</h3>
                <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <video
                    src={currentVideo.url}
                    controls
                    className="w-full h-full"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Size: {formatFileSize(currentVideo.size || 0)}</span>
                  {currentVideo.duration && (
                    <span>Duration: {formatTime(currentVideo.duration)}</span>
                  )}
                </div>
              </div>
            )}

            {/* Video Upload Area */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-900">
                  {selectedFile ? 'Selected Video' : 'Upload Video'}
                </h3>
                {selectedFile && (
                  <button
                    onClick={handleRemove}
                    className="text-red-600 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative aspect-video border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors bg-gray-50"
                >
                  <Video className="h-12 w-12 text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600">Click to select video</p>
                  <p className="text-xs text-gray-500 mt-1">Max {maxSize}MB</p>
                  <p className="text-xs text-gray-500">Supported: MP4, WebM, OGG, MOV</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Video Preview */}
                  {preview && (
                    <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                      <video
                        id="video-preview"
                        src={preview}
                        className="w-full h-full"
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                      />
                      <button
                        onClick={togglePreview}
                        className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        {isPlaying ? (
                          <Pause className="h-16 w-16 text-white" />
                        ) : (
                          <Play className="h-16 w-16 text-white" />
                        )}
                      </button>
                    </div>
                  )}

                  {/* File Info */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Video className="h-8 w-8 text-primary-600" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(selectedFile.size)} • {selectedFile.type}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-700">Video uploaded successfully!</p>
              </div>
            )}

            {/* Upload Progress */}
            {progress && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">
                    {uploading ? 'Uploading...' : 'Upload complete'}
                  </span>
                  <span className="text-gray-600">{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
                {progress.speed && progress.remainingTime && (
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(progress.speed)}/s</span>
                    <span>{Math.ceil(progress.remainingTime)}s remaining</span>
                  </div>
                )}
                {uploadId && (
                  <div className="text-xs text-gray-500">
                    Parts uploaded: {uploadedParts.length}
                  </div>
                )}
              </div>
            )}

            {/* Upload Button */}
            {selectedFile && !uploading && !success && (
              <Button
                onClick={handleUpload}
                className="w-full"
                disabled={!!error}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Video
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
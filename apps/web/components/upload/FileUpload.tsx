'use client';

import { useState, useRef } from 'react';
import { useUpload } from '../../hooks/useUpload';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Upload, X, File, CheckCircle } from 'lucide-react';

interface FileUploadProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
  onUpload?: (files: any[]) => void;
  uploadType?: 'public' | 'private';
}

export function FileUpload({
  accept = '*',
  multiple = false,
  maxSize = 50,
  onUpload,
  uploadType = 'public',
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const { uploadWithPresignedUrl, uploading, progress } = useUpload();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    // Validate file sizes
    const validFiles = files.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        alert(`${file.name} exceeds maximum size of ${maxSize}MB`);
        return false;
      }
      return true;
    });

    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    const uploads = [];

    for (const file of selectedFiles) {
      try {
        const result = await uploadWithPresignedUrl(file, uploadType);
        uploads.push(result);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setUploadedFiles(uploads);
    onUpload?.(uploads);
    setSelectedFiles([]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-primary-500 transition-colors"
          >
            <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Max file size: {maxSize}MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            multiple={multiple}
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Selected Files</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center space-x-3">
                    <File className="h-5 w-5 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Uploading...</span>
                  <span>{progress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all"
                    style={{ width: `${progress.percentage}%` }}
                  />
                </div>
              </div>
            )}

            <Button
              onClick={handleUpload}
              isLoading={uploading}
              disabled={selectedFiles.length === 0}
              className="w-full mt-4"
            >
              Upload {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''}
            </Button>
          </CardContent>
        </Card>
      )}

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              Uploaded Files
            </h3>
            <div className="space-y-2">
              {uploadedFiles.map((file, index) => (
                <div
                  key={index}
                  className="p-2 bg-green-50 rounded text-sm"
                >
                  <p className="font-medium text-green-800">
                    {file.key.split('/').pop()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
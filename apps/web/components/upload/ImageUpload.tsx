'use client';

import { useState, useRef } from 'react';
import { useUpload } from '../../hooks/useUpload';
import { Button } from '../ui/Button';
import { Camera, X, Upload } from 'lucide-react';
import Image from 'next/image';

interface ImageUploadProps {
  currentImage?: string;
  onUpload?: (imageUrl: string) => void;
  aspectRatio?: 'square' | '16:9' | '4:3';
  maxSize?: number; // in MB
}

export function ImageUpload({
  currentImage,
  onUpload,
  aspectRatio = 'square',
  maxSize = 10,
}: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadFile, uploading, progress } = useUpload();

  const aspectRatioClasses = {
    square: 'aspect-square',
    '16:9': 'aspect-video',
    '4:3': 'aspect-4/3',
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      alert(`Image exceeds maximum size of ${maxSize}MB`);
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    try {
      const result = await uploadFile(selectedFile, 'image');
      const imageUrl = result.variants.find((v: any) => v.type === 'medium')?.url || result.file.url;

      onUpload?.(imageUrl);
      setSelectedFile(null);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className={`relative ${aspectRatioClasses[aspectRatio]} w-full max-w-md`}>
        {preview ? (
          <>
            <Image
              src={preview}
              alt="Preview"
              fill
              className="object-cover rounded-lg"
            />
            <button
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary-500 transition-colors bg-gray-50"
          >
            <Camera className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">Click to upload image</p>
            <p className="text-xs text-gray-500 mt-1">Max {maxSize}MB</p>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {selectedFile && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{selectedFile.name}</span>
            <span className="text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>

          {progress && (
            <div>
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
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Image
          </Button>
        </div>
      )}
    </div>
  );
}
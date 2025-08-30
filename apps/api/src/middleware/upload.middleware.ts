import multer from 'multer';
import { Request } from 'express';
import { BadRequestError } from '../utils/errors';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const ALLOWED_VIDEO_TYPES = [
  'video/mp4',
  'video/webm',
  'video/ogg',
];

const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    ...ALLOWED_IMAGE_TYPES,
    ...ALLOWED_VIDEO_TYPES,
    ...ALLOWED_DOCUMENT_TYPES,
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // Reject file without error
  }
};

export const uploadSingle = (fieldName: string) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB
    },
  }).single(fieldName);
};

export const uploadMultiple = (fieldName: string, maxCount: number = 10) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
      files: maxCount,
    },
  }).array(fieldName, maxCount);
};

export const uploadFields = (fields: multer.Field[]) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB per file
    },
  }).fields(fields);
};

export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(null, false); // Reject file without error
  }
};

export const uploadImage = (fieldName: string) => {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter: imageFileFilter,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB for images
    },
  }).single(fieldName);
};
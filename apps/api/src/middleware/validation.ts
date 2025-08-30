import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Zod-based validation middleware
export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query.query ? req.query : req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.issues
        });
      }
      next(error);
    }
  };
};

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

export const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('username')
    .isLength({ min: 3, max: 30 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-30 characters, alphanumeric and underscore only'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('firstName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  body('lastName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  handleValidationErrors,
];

export const validatePasswordResetRequest = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  handleValidationErrors,
];

export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  handleValidationErrors,
];

export const validateEmailVerification = [
  body('token')
    .notEmpty()
    .withMessage('Token is required'),
  handleValidationErrors,
];

export const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
];

export const validateMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be 1-2000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file', 'video'])
    .withMessage('Invalid message type'),
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 attachments allowed for messages'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateEditMessage = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 2000 })
    .withMessage('Message content must be 1-2000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 attachments allowed for messages'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateConversation = [
  body('participantId')
    .isUUID()
    .withMessage('Valid participant ID is required'),
  body('type')
    .optional()
    .isIn(['direct', 'group'])
    .withMessage('Invalid conversation type'),
  body('name')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Conversation name must be 1-100 characters'),
  handleValidationErrors,
];

// Post validation schemas
export const validateCreatePost = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Post title must be 1-255 characters'),
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Post content must be 1-10000 characters'),
  body('communityId')
    .isUUID()
    .withMessage('Valid community ID is required'),
  body('categoryId')
    .isUUID()
    .withMessage('Valid category ID is required'),
  body('richTextContent')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Rich text content cannot exceed 50000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 attachments allowed'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateUpdatePost = [
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Post title must be 1-255 characters'),
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Post content must be 1-10000 characters'),
  body('richTextContent')
    .optional()
    .isLength({ max: 50000 })
    .withMessage('Rich text content cannot exceed 50000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 attachments allowed'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateReportPost = [
  body('reason')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Report reason must be 1-200 characters'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Report details cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const validateModeratePost = [
  body('action')
    .isIn(['APPROVE', 'DELETE', 'HIDE', 'WARN', 'FEATURE', 'PIN'])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Moderation notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

// Comment validation schemas
export const validateCreateComment = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment content must be 1-5000 characters'),
  body('postId')
    .isUUID()
    .withMessage('Valid post ID is required'),
  body('parentId')
    .optional()
    .isUUID()
    .withMessage('Valid parent comment ID required if provided'),
  body('richTextContent')
    .optional()
    .isLength({ max: 25000 })
    .withMessage('Rich text content cannot exceed 25000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 attachments allowed for comments'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateUpdateComment = [
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Comment content must be 1-5000 characters'),
  body('richTextContent')
    .optional()
    .isLength({ max: 25000 })
    .withMessage('Rich text content cannot exceed 25000 characters'),
  body('attachments')
    .optional()
    .isArray({ max: 5 })
    .withMessage('Maximum 5 attachments allowed for comments'),
  body('attachments.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 500 })
    .withMessage('Attachment URLs must be 1-500 characters'),
  handleValidationErrors,
];

export const validateReportComment = [
  body('reason')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Report reason must be 1-200 characters'),
  body('details')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Report details cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const validateModerateComment = [
  body('action')
    .isIn(['APPROVE', 'DELETE', 'HIDE', 'WARN'])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Moderation reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Moderation notes cannot exceed 1000 characters'),
  handleValidationErrors,
];

// Reaction validation schemas
export const validateReaction = [
  body('type')
    .isIn(['like', 'love', 'laugh', 'angry', 'sad', 'celebrate', 'support', 'insightful'])
    .withMessage('Invalid reaction type'),
  body('targetType')
    .isIn(['post', 'comment'])
    .withMessage('Invalid target type'),
  body('targetId')
    .isUUID()
    .withMessage('Valid target ID is required'),
  handleValidationErrors,
];

// Generic UUID parameter validation
export const validateUUIDParam = (paramName: string) => [
  body(paramName)
    .isUUID()
    .withMessage(`Valid ${paramName} is required`),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  body('page')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Page must be between 1 and 1000'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// Message search validation
export const validateMessageSearch = [
  body('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be 1-100 characters'),
  body('senderId')
    .optional()
    .isUUID()
    .withMessage('Valid sender ID required'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'video', 'deleted'])
    .withMessage('Invalid message type'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date required (ISO 8601 format)'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required (ISO 8601 format)'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// Message history validation
export const validateMessageHistory = [
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date required (ISO 8601 format)'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date required (ISO 8601 format)'),
  body('messageType')
    .optional()
    .isIn(['text', 'image', 'file', 'video', 'deleted'])
    .withMessage('Invalid message type'),
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  handleValidationErrors,
];

// Notification preferences validation
export const validateNotificationPreferences = [
  body('emailEnabled')
    .optional()
    .isBoolean()
    .withMessage('emailEnabled must be a boolean'),
  body('emailDigest')
    .optional()
    .isIn(['NEVER', 'IMMEDIATELY', 'DAILY', 'WEEKLY'])
    .withMessage('Invalid email digest frequency'),
  body('emailPosts')
    .optional()
    .isBoolean()
    .withMessage('emailPosts must be a boolean'),
  body('emailComments')
    .optional()
    .isBoolean()
    .withMessage('emailComments must be a boolean'),
  body('emailMessages')
    .optional()
    .isBoolean()
    .withMessage('emailMessages must be a boolean'),
  body('emailEvents')
    .optional()
    .isBoolean()
    .withMessage('emailEvents must be a boolean'),
  body('emailCourses')
    .optional()
    .isBoolean()
    .withMessage('emailCourses must be a boolean'),
  body('pushEnabled')
    .optional()
    .isBoolean()
    .withMessage('pushEnabled must be a boolean'),
  body('pushPosts')
    .optional()
    .isBoolean()
    .withMessage('pushPosts must be a boolean'),
  body('pushComments')
    .optional()
    .isBoolean()
    .withMessage('pushComments must be a boolean'),
  body('pushMessages')
    .optional()
    .isBoolean()
    .withMessage('pushMessages must be a boolean'),
  body('pushEvents')
    .optional()
    .isBoolean()
    .withMessage('pushEvents must be a boolean'),
  body('pushCourses')
    .optional()
    .isBoolean()
    .withMessage('pushCourses must be a boolean'),
  body('inAppEnabled')
    .optional()
    .isBoolean()
    .withMessage('inAppEnabled must be a boolean'),
  body('inAppSound')
    .optional()
    .isBoolean()
    .withMessage('inAppSound must be a boolean'),
  body('notificationSound')
    .optional()
    .isLength({ max: 100 })
    .withMessage('notificationSound must be less than 100 characters'),
  body('dndEnabled')
    .optional()
    .isBoolean()
    .withMessage('dndEnabled must be a boolean'),
  body('dndStart')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('dndStart must be in HH:MM format'),
  body('dndEnd')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('dndEnd must be in HH:MM format'),
  handleValidationErrors,
];

// Notification history validation
export const validateNotificationHistory = [
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  body('offset')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Offset must be a non-negative integer'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('startDate must be a valid ISO 8601 date'),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('endDate must be a valid ISO 8601 date'),
  handleValidationErrors,
];

// Archive notifications validation
export const validateArchiveNotifications = [
  body('daysOld')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('daysOld must be between 1 and 365'),
  handleValidationErrors,
];

// File upload validation schemas
export const validateFileUpload = [
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('accessLevel')
    .optional()
    .isIn(['private', 'public', 'shared'])
    .withMessage('accessLevel must be private, public, or shared'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tags must be 1-50 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors,
];

export const validateBulkDelete = [
  body('fileIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('fileIds must be an array with 1-100 items'),
  body('fileIds.*')
    .isUUID()
    .withMessage('Each file ID must be a valid UUID'),
  handleValidationErrors,
];

export const validateGetPresignedUrl = [
  body('fileName')
    .isLength({ min: 1, max: 255 })
    .withMessage('File name is required and must be 1-255 characters'),
  body('fileType')
    .isLength({ min: 1, max: 100 })
    .withMessage('File type is required and must be 1-100 characters'),
  body('uploadType')
    .optional()
    .isIn(['public', 'private'])
    .withMessage('uploadType must be public or private'),
  handleValidationErrors,
];

export const validateFileVersion = [
  body('isPublic')
    .optional()
    .isBoolean()
    .withMessage('isPublic must be a boolean'),
  body('accessLevel')
    .optional()
    .isIn(['private', 'public', 'shared'])
    .withMessage('accessLevel must be private, public, or shared'),
  body('tags')
    .optional()
    .isArray({ max: 10 })
    .withMessage('Maximum 10 tags allowed'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Tags must be 1-50 characters'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must be less than 500 characters'),
  handleValidationErrors,
];

// Moderation Validation Schemas

export const validateContentCheck = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  body('contentType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Content type must be post, comment, or message'),
  handleValidationErrors,
];

export const validateAutoModerationCheck = [
  body('content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('Content must be between 1 and 10000 characters'),
  body('contentType')
    .isIn(['post', 'comment', 'message'])
    .withMessage('Content type must be post, comment, or message'),
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object if provided'),
  handleValidationErrors,
];

export const validateModerateContent = [
  body('targetId')
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('targetType')
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Target type must be post, comment, user, or message'),
  body('action')
    .isIn(['APPROVE', 'DELETE', 'HIDE', 'FLAG', 'WARN', 'MUTE', 'BAN', 'UNBAN'])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 525600 }) // Max 1 year in minutes
    .withMessage('Duration must be between 1 and 525600 minutes'),
  handleValidationErrors,
];

export const validateBulkModerate = [
  body('targetIds')
    .isArray({ min: 1, max: 50 })
    .withMessage('targetIds must be an array with 1-50 items'),
  body('targetIds.*')
    .isUUID()
    .withMessage('Each target ID must be a valid UUID'),
  body('targetType')
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Target type must be post, comment, user, or message'),
  body('action')
    .isIn(['APPROVE', 'DELETE', 'HIDE', 'FLAG', 'WARN', 'MUTE', 'BAN', 'UNBAN'])
    .withMessage('Invalid moderation action'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('duration')
    .optional()
    .isInt({ min: 1, max: 525600 }) // Max 1 year in minutes
    .withMessage('Duration must be between 1 and 525600 minutes'),
  handleValidationErrors,
];

export const validateModerationStats = [
  body('timeframe')
    .optional()
    .isIn(['day', 'week', 'month'])
    .withMessage('Timeframe must be day, week, or month'),
  handleValidationErrors,
];

export const validateCreateContentFilter = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Filter name must be 1-100 characters'),
  body('type')
    .isIn(['profanity', 'spam', 'toxicity', 'custom'])
    .withMessage('Filter type must be profanity, spam, toxicity, or custom'),
  body('pattern')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Pattern must be 1-1000 characters'),
  body('severity')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be low, medium, or high'),
  body('action')
    .isIn(['FLAG', 'HIDE', 'DELETE', 'WARN'])
    .withMessage('Action must be FLAG, HIDE, DELETE, or WARN'),
  handleValidationErrors,
];

export const validateUpdateContentFilter = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Filter name must be 1-100 characters'),
  body('type')
    .optional()
    .isIn(['profanity', 'spam', 'toxicity', 'custom'])
    .withMessage('Filter type must be profanity, spam, toxicity, or custom'),
  body('pattern')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Pattern must be 1-1000 characters'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Severity must be low, medium, or high'),
  body('action')
    .optional()
    .isIn(['FLAG', 'HIDE', 'DELETE', 'WARN'])
    .withMessage('Action must be FLAG, HIDE, DELETE, or WARN'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

export const validateCreateReport = [
  body('targetType')
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Target type must be post, comment, user, or message'),
  body('targetId')
    .isUUID()
    .withMessage('Target ID must be a valid UUID'),
  body('reason')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Reason must be 1-50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const validateReportReview = [
  body('decision')
    .isIn(['approve', 'dismiss', 'escalate'])
    .withMessage('Decision must be approve, dismiss, or escalate'),
  body('resolution')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution cannot exceed 1000 characters'),
  handleValidationErrors,
];

export const validateReportStats = [
  body('timeframe')
    .optional()
    .isIn(['day', 'week', 'month', 'all'])
    .withMessage('Timeframe must be day, week, month, or all'),
  handleValidationErrors,
];

export const moderationActionSchema = z.enum(['APPROVE', 'DELETE', 'HIDE', 'FLAG', 'WARN', 'MUTE', 'BAN', 'UNBAN']);
export const targetTypeSchema = z.enum(['post', 'comment', 'user', 'message']);
export const contentTypeSchema = z.enum(['post', 'comment', 'message']);
export const filterTypeSchema = z.enum(['profanity', 'spam', 'toxicity', 'custom']);
export const severitySchema = z.enum(['low', 'medium', 'high']);
export const filterActionSchema = z.enum(['FLAG', 'HIDE', 'DELETE', 'WARN']);
export const reportDecisionSchema = z.enum(['approve', 'dismiss', 'escalate']);
export const timeframeSchema = z.enum(['day', 'week', 'month', 'all', '']);

export const validateModerationRequestSchema = z.object({
  body: z.object({
    targetId: z.string().uuid('Invalid target ID'),
    targetType: targetTypeSchema,
    action: moderationActionSchema,
    reason: z.string().max(500, 'Reason too long').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    duration: z.number().int().min(1).max(525600).optional()
  })
});

export const validateBulkModerationRequestSchema = z.object({
  body: z.object({
    targetIds: z.array(z.string().uuid()).min(1).max(50, 'Cannot process more than 50 items at once'),
    targetType: targetTypeSchema,
    action: moderationActionSchema,
    reason: z.string().max(500, 'Reason too long').optional(),
    notes: z.string().max(1000, 'Notes too long').optional(),
    duration: z.number().int().min(1).max(525600).optional()
  })
});

export const validateContentFilterSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100, 'Name must be 1-100 characters'),
    type: filterTypeSchema,
    pattern: z.string().min(1).max(1000, 'Pattern must be 1-1000 characters'),
    severity: severitySchema,
    action: filterActionSchema
  })
});

// Validation middleware using Zod schemas
export const validateModerationRequest = validateRequest(validateModerationRequestSchema);
export const validateBulkModerationRequest = validateRequest(validateBulkModerationRequestSchema);
export const validateContentFilterRequest = validateRequest(validateContentFilterSchema);
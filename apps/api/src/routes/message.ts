import { Router } from 'express';
import * as messageController from '../controllers/messageController';
import { authenticate } from '../middleware/auth';
import { validateMessage, validateConversation, validateEditMessage, validateMessageSearch, validateMessageHistory } from '../middleware/validation';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Conversation routes
router.route('/conversations')
  .get(messageController.getConversations)
  .post(validateConversation, messageController.createConversation);

// Specific conversation routes
router.route('/conversations/:conversationId')
  .get(messageController.getConversationDetails);

router.route('/conversations/:conversationId/messages')
  .get(messageController.getMessages)
  .post(validateMessage, messageController.sendMessage);

// Message actions
router.route('/conversations/:conversationId/read')
  .post(messageController.markAsRead);

// Participant management
router.route('/conversations/:conversationId/participants')
  .post(messageController.addParticipant);

router.route('/conversations/:conversationId/participants/:userId')
  .delete(messageController.removeParticipant);

// Search and export
router.route('/conversations/:conversationId/search')
  .get(validateMessageSearch, messageController.searchMessages);

router.route('/conversations/:conversationId/export')
  .get(messageController.exportConversation);

// Message actions
router.route('/:messageId/reactions')
  .post(messageController.toggleReaction);

router.route('/:messageId/pin')
  .post(messageController.toggleMessagePin);

// Message editing and deletion
router.route('/:messageId')
  .put(validateEditMessage, messageController.editMessage)
  .delete(messageController.deleteMessage);

// Message history
router.route('/conversations/:conversationId/history')
  .get(validateMessageHistory, messageController.getMessageHistory);

export default router;
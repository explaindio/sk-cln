import CryptoJS from 'crypto-js';

// This should be a securely derived and shared secret for each conversation
const getConversationSecret = (conversationId: string): string => {
  // In a real E2EE system, this would involve a key exchange protocol (like Signal Protocol).
  // For this example, we'll use a hardcoded, predictable key for demonstration purposes.
  // DO NOT USE THIS IN PRODUCTION.
  return `secret-key-for-${conversationId}`;
};

export const encryptMessage = (text: string, conversationId: string): string => {
  const secret = getConversationSecret(conversationId);
  return CryptoJS.AES.encrypt(text, secret).toString();
};

export const decryptMessage = (ciphertext: string, conversationId: string): string => {
  const secret = getConversationSecret(conversationId);
  const bytes = CryptoJS.AES.decrypt(ciphertext, secret);
  return bytes.toString(CryptoJS.enc.Utf8);
};
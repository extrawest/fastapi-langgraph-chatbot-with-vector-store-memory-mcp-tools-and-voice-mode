import axios from 'axios';

/**
 * Service for interacting with chat API endpoints
 */
const chatService = {
  /**
   * Get all chats for the current user
   * @param {number} limit - Maximum number of chats to retrieve (default: 50)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} Chat history response with messages and total count
   */
  getUserChats: async (limit = 50, offset = 0) => {
    try {
      const response = await axios.get(`/api/v1/history/chats?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching user chats:', error);
      throw error;
    }
  },

  /**
   * Get messages for a specific chat
   * @param {string} chatId - The chat ID
   * @param {number} limit - Maximum number of messages to retrieve (default: 50)
   * @param {number} offset - Offset for pagination (default: 0)
   * @returns {Promise<Object>} Chat history response with messages and total count
   */
  getChatById: async (chatId, limit = 50, offset = 0) => {
    try {
      const response = await axios.get(`/api/v1/history/chats/${chatId}?limit=${limit}&offset=${offset}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching chat ${chatId}:`, error);
      throw error;
    }
  },

  /**
   * Send a message to the chat API
   * @param {string} userMessage - The user's message
   * @param {string} chatId - The chat ID
   * @returns {Promise<Object>} The response data
   */
  sendMessage: async (userMessage, chatId) => {
    try {
      const response = await axios.post('/api/v1/chat/completions', {
        user_message: userMessage,
        chat_id: chatId
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
};

export default chatService;

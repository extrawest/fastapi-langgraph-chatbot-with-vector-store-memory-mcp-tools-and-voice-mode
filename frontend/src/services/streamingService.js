/**
 * Service for handling streaming responses from the chat API
 */
const streamingService = {
  /**
   * Start a streaming request to the chat completions API
   * @param {string} userMessage - The user message to send
   * @param {string} chatId - The chat ID
   * @param {Object} callbacks - Callback functions for handling the stream
   * @param {Function} callbacks.onChunk - Called when a chunk is received
   * @param {Function} callbacks.onComplete - Called when the stream is complete
   * @param {Function} callbacks.onError - Called when an error occurs
   * @returns {Object} - Controller object with abort method
   */
  startStream: (userMessage, chatId, callbacks) => {
    const controller = new AbortController();
    const { signal } = controller;

    const body = JSON.stringify({
      user_message: userMessage,
      chat_id: chatId
    });

    const token = localStorage.getItem('token');

    console.log(`Starting stream for chat ${chatId} with message: ${userMessage.substring(0, 20)}...`);

    let accumulatedContent = '';

    try {
      callbacks.onChunk('');
      
      console.log('Sending request to streaming endpoint...');

      fetch('/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body,
        signal
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        function processText({ done, value }) {
          if (done) {
            console.log('Stream complete, final content:', accumulatedContent);
            callbacks.onComplete();
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          const messages = buffer.split('\n\n');

          for (let i = 0; i < messages.length - 1; i++) {
            const message = messages[i].trim();

            const lines = message.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);

                if (data === '[DONE]') {
                  console.log('Received [DONE] message');
                  continue;
                }
                
                try {
                  const parsedData = JSON.parse(data);

                  if (parsedData.choices && 
                      parsedData.choices[0] && 
                      parsedData.choices[0].delta) {
                    
                    const delta = parsedData.choices[0].delta;

                    if (delta.content) {
                      const content = delta.content;
                      accumulatedContent += content;
                      console.log('Received content chunk:', content);
                      callbacks.onChunk(content);
                    }

                    if (parsedData.choices[0].finish_reason) {
                      console.log('Finish reason:', parsedData.choices[0].finish_reason);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing JSON:', e, data);
                }
              }
            }
          }

          buffer = messages[messages.length - 1];

          return reader.read().then(processText);
        }

        return reader.read().then(processText);
      })
      .catch(error => {
        if (error.name === 'AbortError') {
          console.log('Stream aborted');
        } else {
          console.error('Streaming error:', error);
          callbacks.onError(error);
        }
      });
    } catch (error) {
      console.error('Error setting up stream:', error);
      callbacks.onError(error);
    }

    return {
      abort: () => controller.abort()
    };
  }
};

export default streamingService;

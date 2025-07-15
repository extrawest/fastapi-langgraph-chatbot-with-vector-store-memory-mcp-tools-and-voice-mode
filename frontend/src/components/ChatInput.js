import React, { useState } from 'react';
import { Box, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

/**
 * Chat input component for sending messages
 * @param {Object} props - Component props
 * @param {Function} props.onSendMessage - Callback for sending a message
 * @param {boolean} props.disabled - Whether the input is disabled
 */
const ChatInput = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');

  /**
   * Handle form submission
   * @param {React.FormEvent} e - Form event
   */
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled) {
      return;
    }
    
    onSendMessage(message.trim());
    setMessage('');
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit}
      sx={{
        display: 'flex',
        alignItems: 'center',
        p: 2,
        borderTop: '1px solid',
        borderColor: 'divider',
      }}
    >
      <TextField
        fullWidth
        placeholder="Type a message..."
        variant="outlined"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={disabled}
        multiline
        maxRows={4}
        sx={{
          '& .MuiOutlinedInput-root': {
            borderRadius: 3,
          },
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
      />
      <IconButton
        color="primary"
        type="submit"
        disabled={!message.trim() || disabled}
        sx={{ ml: 1 }}
      >
        <SendIcon />
      </IconButton>
    </Box>
  );
};

export default ChatInput;

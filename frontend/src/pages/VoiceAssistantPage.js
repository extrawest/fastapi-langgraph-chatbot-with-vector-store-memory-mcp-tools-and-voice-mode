import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';
import VoiceAssistant from '../components/VoiceAssistant';

/**
 * Voice Assistant Page component
 * Displays the LiveKit voice assistant interface
 */
const VoiceAssistantPage = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Voice Assistant
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Speak to the AI assistant using your microphone
        </Typography>
        
        <Paper 
          elevation={3} 
          sx={{ 
            p: 4, 
            mt: 4, 
            bgcolor: 'background.paper', 
            borderRadius: 2,
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}
        >
          <VoiceAssistant />
        </Paper>
      </Box>
    </Container>
  );
};

export default VoiceAssistantPage;

import React, { useState, useEffect, useRef } from 'react';
import { Box, Paper, IconButton, CircularProgress, Button } from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import CallEndIcon from '@mui/icons-material/CallEnd';

import { useLiveKit } from '../contexts/LiveKitContext';
import { useAuth } from '../contexts/AuthContext';

import { RoomEvent } from 'livekit-client';
import { RoomContext, RoomAudioRenderer, StartAudio } from '@livekit/components-react';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [textInput, setTextInput] = useState('');
  const messagesEndRef = useRef(null);
  const { 
    room, 
    isConnected, 
    connect, 
    disconnect, 
    error, 
    setError, 
    logConnectionDetails,
    transcriptions,
    chatMessages,
    agentState,
    sendChatMessage
  } = useLiveKit();
  const { token: authToken, tokenType } = useAuth();

  const handleDisconnect = async () => {
    try {
      console.log('🔴 Disconnecting from LiveKit room...');

      if (room && room.localParticipant) {
        await room.localParticipant.setMicrophoneEnabled(false);
      }

      disconnect();

      setIsListening(false);
      setTranscript('');
      setResponse('');
      setIsSpeaking(false);

      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `system-${Date.now()}`,
          text: 'Voice call ended',
          isSystem: true,
          timestamp: new Date().toISOString()
        }
      ]);
      
      console.log('✅ Voice call ended');
    } catch (error) {
      console.error('❌ Error disconnecting:', error);
    }
  };

  const handleSendMessage = () => {
    if (textInput.trim() && isConnected) {
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `user-${Date.now()}`,
          text: textInput,
          isUser: true,
          timestamp: new Date().toISOString()
        }
      ]);

      sendChatMessage(textInput);

      setTextInput('');
    }
  };
  
  const toggleMicrophone = async () => {
    if (!isConnected) {
      try {
        setError(null);
        
        console.log('🎤️ Starting LiveKit connection process');
        setIsLoading(true);

        console.log('🔑 Fetching token from backend...');
        const response = await fetch('/api/v1/livekit/generate_token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `${tokenType} ${authToken}`
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Failed to fetch token:', response.status, errorText);
          setError(`Failed to get LiveKit token: ${response.status}`);
          setIsLoading(false);
          return;
        }
        
        const data = await response.json();
        console.log('📦 Received from backend:', {
          hasToken: !!data.token,
          tokenLength: data.token ? data.token.length : 0,
          roomName: data.room_name
        });

        const liveKitUrl = process.env.REACT_APP_LIVEKIT_URL;
        console.log('🌐 LiveKit URL from env:', liveKitUrl);
        
        if (!liveKitUrl) {
          console.error('❌ LiveKit URL not found in environment variables');
          setError('LiveKit URL not configured');
          setIsLoading(false);
          return;
        }

        console.log('🔄 Connecting to LiveKit room:', {
          url: liveKitUrl,
          roomName: data.room_name,
          hasToken: !!data.token
        });
        
        const connectedRoom = await connect(liveKitUrl, data.token);
        
        if (!connectedRoom) {
          console.error('❌ Failed to connect to LiveKit room');
          setError('Failed to connect to LiveKit room');
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Connected to LiveKit room:', connectedRoom.name);

        if (connectedRoom.localParticipant) {
          console.log('🎤️ Enabling microphone...');
          console.log('🔍 Room state:', {
            name: connectedRoom.name,
            sid: connectedRoom.sid,
            connectionState: connectedRoom.connectionState,
            localParticipant: connectedRoom.localParticipant ? connectedRoom.localParticipant.identity : 'Not available'
          });
          
          await connectedRoom.localParticipant.setMicrophoneEnabled(true);
          console.log('✅ Microphone enabled successfully');
          setIsListening(true);

          setMessages(prevMessages => [
            ...prevMessages,
            {
              id: `system-${Date.now()}`,
              text: 'Voice call connected',
              isSystem: true,
              timestamp: new Date().toISOString()
            }
          ]);
        } else {
          console.error('❌ Room object not available after connection');
          setError('Failed to initialize voice call room');
        }
      } catch (error) {
        console.error('❌ Error connecting to LiveKit room:', error);
        setError(`Connection error: ${error.message}. Please try again.`);

        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `error-${Date.now()}`,
            text: `Connection error: ${error.message}. Please try again.`,
            isSystem: true,
            isError: true,
            timestamp: new Date().toISOString()
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        if (isListening) {
          await room.localParticipant.setMicrophoneEnabled(false);
          setIsListening(false);
        } else {
          await room.localParticipant.setMicrophoneEnabled(true);
          setIsListening(true);
        }
      } catch (error) {
        console.error('Error toggling microphone:', error);
      }
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (transcriptions.length > 0) {
      const latestTranscription = transcriptions[transcriptions.length - 1];
      console.log('🎤 Received transcription:', latestTranscription);

      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `transcription-${Date.now()}`,
          text: latestTranscription.text || latestTranscription.message,
          isUser: true,
          timestamp: latestTranscription.timestamp || new Date().toISOString()
        }
      ]);
    }
  }, [transcriptions]);

  useEffect(() => {
    if (chatMessages.length > 0) {
      const latestMessage = chatMessages[chatMessages.length - 1];
      console.log('💬 Received chat message:', latestMessage);

      if (latestMessage.sender !== 'user') {
        setMessages(prevMessages => [
          ...prevMessages,
          {
            id: `chat-${Date.now()}`,
            text: latestMessage.message,
            isUser: false,
            timestamp: latestMessage.timestamp || new Date().toISOString()
          }
        ]);
      }
    }
  }, [chatMessages]);

  useEffect(() => {
    console.log('🤖 Agent state updated:', agentState);
    setIsSpeaking(agentState === 'speaking');
    setIsListening(agentState === 'listening' || isListening);
  }, [agentState, isListening]);

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = (message) => {
    if (message.isSystem) {
      if (message.isError) {
        return (
          <Box 
            key={message.id} 
            sx={{ 
              textAlign: 'center', 
              py: 1.5, 
              my: 2,
              borderTop: '1px dashed rgba(92, 107, 192, 0.3)',
              borderBottom: '1px dashed rgba(92, 107, 192, 0.3)',
              bgcolor: 'rgba(92, 107, 192, 0.05)',
              borderRadius: 1
            }}
          >
            <Box 
              component="div" 
              sx={{ 
                fontStyle: 'italic',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 0.5,
                typography: 'caption',
                color: '#5C6BC0'
              }}
            >
              <span role="img" aria-label="Error">⚠️</span> {message.text}
            </Box>
          </Box>
        );
      }

      return (
        <Box 
          key={message.id} 
          sx={{ 
            textAlign: 'center', 
            py: 1.5, 
            my: 2,
            borderTop: '1px dashed rgba(0, 0, 0, 0.1)',
            borderBottom: '1px dashed rgba(0, 0, 0, 0.1)'
          }}
        >
          <Box component="div" sx={{ 
            fontStyle: 'italic',
            typography: 'caption',
            color: 'text.secondary'
          }}>
            {message.text}
          </Box>
        </Box>
      );
    }

    return (
      <Box 
        key={message.id} 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: message.isUser ? 'flex-end' : 'flex-start',
          mb: 2.5,
          maxWidth: '85%',
          alignSelf: message.isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 0.5,
          ml: message.isUser ? 0 : 1,
          mr: message.isUser ? 1 : 0
        }}>
          <Box component="span" sx={{ fontWeight: 'medium', typography: 'caption', color: 'text.secondary' }}>
            {message.isUser ? 'You' : 'Assistant'}
          </Box>
          <Box component="span" sx={{ ml: 1, opacity: 0.8, typography: 'caption', color: 'text.secondary' }}>
            {formatTime(message.timestamp)}
          </Box>
        </Box>
        <Paper 
          elevation={message.isUser ? 1 : 2} 
          sx={{
            p: 2,
            width: 'fit-content',
            maxWidth: '100%',
            bgcolor: message.isUser ? 'grey.100' : 'primary.light',
            color: message.isUser ? 'text.primary' : 'primary.contrastText',
            borderRadius: message.isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
            position: 'relative',
            '&::after': message.isUser ? {
              content: '""',
              position: 'absolute',
              bottom: 0,
              right: -8,
              width: 15,
              height: 15,
              backgroundColor: 'grey.100',
              borderBottomLeftRadius: '50%',
              transform: 'translateY(30%)'
            } : {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: -8,
              width: 15,
              height: 15,
              backgroundColor: 'primary.light',
              borderBottomRightRadius: '50%',
              transform: 'translateY(30%)'
            }
          }}
        >
          <Box component="div" sx={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            lineHeight: 1.5
          }}>
            {message.text}
          </Box>
        </Paper>
      </Box>
    );
  };

  useEffect(() => {
    if (!room) return;

    const handleDataReceived = (payload, participant) => {
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('📥 Received data message:', data);
        
        if (data.type === 'transcript') {
          setTranscript(data.text);

          if (data.text && data.text.trim() !== '') {
            const newMessage = {
              id: `transcript-${Date.now()}`,
              text: data.text,
              isUser: true,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prevMessages => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && lastMessage.isUser) {
                return [...prevMessages.slice(0, -1), newMessage];
              }
              return [...prevMessages, newMessage];
            });
          }
        } else if (data.type === 'response') {
          setResponse(data.text);
          setIsSpeaking(true);

          if (data.text && data.text.trim() !== '') {
            const newMessage = {
              id: `response-${Date.now()}`,
              text: data.text,
              isUser: false,
              timestamp: new Date().toISOString()
            };
            
            setMessages(prevMessages => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && !lastMessage.isUser) {
                return [...prevMessages.slice(0, -1), newMessage];
              }
              return [...prevMessages, newMessage];
            });
          }
        } else if (data.type === 'speaking_started') {
          setIsSpeaking(true);
        } else if (data.type === 'speaking_finished') {
          setIsSpeaking(false);
        } else if (data.type === 'error') {
          console.error('❌ Error from LiveKit agent:', data.text);
          setError(data.text);

          const errorMessage = {
            id: `error-${Date.now()}`,
            text: data.text,
            isSystem: true,
            isError: true,
            timestamp: new Date().toISOString()
          };
          
          setMessages(prevMessages => [...prevMessages, errorMessage]);

          if (room && room.localParticipant) {
            room.localParticipant.setMicrophoneEnabled(false);
            setIsListening(false);
          }
        }
      } catch (error) {
        console.error('❌ Error parsing data message:', error);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <>
      {/* Conditionally render LiveKit components when connected */}
      {isConnected && room && (
        <RoomContext.Provider value={room}>
          <RoomAudioRenderer />
          <StartAudio label="Start Audio" />
        </RoomContext.Provider>
      )}
      
      <Paper 
        elevation={3} 
        sx={{ 
          width: '100%', 
          maxWidth: 700, 
          mx: 'auto', 
          height: '70vh', 
          display: 'flex', 
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 2
        }}
      >
      <Box component="div" sx={{ typography: 'h5', mb: 2 }}>
        Voice Assistant
      </Box>
      
      {isConnected ? (
        <>
          {/* Messages area with scrolling */}
          <Box sx={{ 
            flexGrow: 1, 
            overflowY: 'auto', 
            mb: 2, 
            p: 2,
            display: 'flex',
            flexDirection: 'column'
          }}>
            {}
            <Box sx={{ 
              p: 4, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              mb: messages.length > 0 ? 4 : 0
            }}>
              <Box sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center',
                opacity: 0.8
              }}>
                <MicIcon sx={{ fontSize: 48, color: 'primary.main', opacity: 0.6, mb: 2 }} />
                <Box component="div" sx={{ fontWeight: 'medium', mb: 1, textAlign: 'center', typography: 'body1', color: 'text.primary' }}>
                  Voice Assistant Ready
                </Box>
                <Box component="div" sx={{ maxWidth: '80%', textAlign: 'center', typography: 'body2', color: 'text.secondary' }}>
                  Your conversation will appear here.
                  <br />
                  Click the microphone button below to start speaking.
                </Box>
              </Box>
            </Box>
            
            {}
            {messages.length > 0 && (
              <Box sx={{ width: '100%' }}>
                {messages.map(renderMessage)}
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>
          
          {/* Status area removed */}
          
          {/* Control bar */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            borderTop: 1,
            borderColor: 'divider',
            pt: 3,
            mt: 2,
            pb: 1,
            px: 10,
            gap: 3
          }}>
            {/* Text input removed but logic preserved */}

            <IconButton 
              color={isListening ? "secondary" : "primary"}
              onClick={toggleMicrophone}
              disabled={isLoading}
              size="large"
              sx={{ 
                p: 3, 
                border: 2, 
                borderColor: isListening ? 'secondary.main' : 'primary.main',
                boxShadow: isListening ? '0 0 15px rgba(156, 39, 176, 0.5)' : '0 4px 8px rgba(25, 118, 210, 0.25)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  backgroundColor: isListening ? 'rgba(156, 39, 176, 0.08)' : 'rgba(25, 118, 210, 0.08)',
                  transform: 'scale(1.05)'
                }
              }}
            >
              {isListening ? <MicIcon /> : <MicOffIcon />}
            </IconButton>
            
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<CallEndIcon />}
              onClick={handleDisconnect}
              sx={{
                px: 4,
                py: 1.2,
                borderRadius: 28,
                backgroundColor: '#5C6BC0', // Indigo color instead of red
                boxShadow: '0 4px 12px rgba(92, 107, 192, 0.3)',
                '&:hover': {
                  backgroundColor: '#3F51B5',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 14px rgba(92, 107, 192, 0.4)'
                },
                transition: 'all 0.2s ease'
              }}
            >
              End Call
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexGrow: 1,
          gap: 3 
        }}>
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <MicIcon sx={{ fontSize: 64, color: error ? 'error.main' : 'primary.main', opacity: 0.8, mb: 2 }} />
            <Box component="div" sx={{ typography: 'h6', textAlign: 'center', mb: 1 }}>
              Voice Assistant
            </Box>
            <Box component="div" sx={{ typography: 'body1', textAlign: 'center', color: 'text.secondary', maxWidth: '80%', mx: 'auto' }}>
              {error ? (
                <Box sx={{ color: 'error.main', mt: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Box component="div" sx={{ fontWeight: 'medium', mb: 1, typography: 'body2', color: '#5C6BC0' }}>
                    {error}
                  </Box>
                  <Box component="div" sx={{ typography: 'body2', color: 'text.secondary' }}>
                    Please try again or check your connection
                  </Box>
                </Box>
              ) : (
                <Box component="div" sx={{ typography: 'body1', textAlign: 'center', color: 'text.secondary' }}>
                  Start a voice conversation with the AI assistant
                </Box>
              )}
            </Box>
          </Box>
          
          <Button 
            variant="contained" 
            color="primary" 
            size="large"
            onClick={toggleMicrophone}
            disabled={isLoading}
            sx={{ 
              py: 1.5, 
              px: 4, 
              borderRadius: 28,
              boxShadow: 3,
              '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: 4
              },
              transition: 'all 0.3s ease'
            }}
            startIcon={<MicIcon />}
          >
            {isLoading ? <CircularProgress size={24} /> : "Start Voice Call"}
          </Button>
        </Box>
      )}
      
      <Box 
        component="div"
        sx={{ 
          mt: 2, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          gap: 0.5,
          typography: 'caption',
          color: 'text.secondary',
          textAlign: 'center'
        }}
      >
        Powered by <span style={{ fontWeight: 'bold' }}>LiveKit</span> Cloud
      </Box>
    </Paper>
    </>
  );
};

export default VoiceAssistant;

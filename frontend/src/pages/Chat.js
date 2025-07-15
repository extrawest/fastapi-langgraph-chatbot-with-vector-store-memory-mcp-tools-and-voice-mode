import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  AppBar,
  Toolbar,
  Button,
  CircularProgress,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import LogoutIcon from '@mui/icons-material/Logout';
import MicIcon from '@mui/icons-material/Mic';
import { useAuth } from '../contexts/AuthContext';
import chatService from '../services/chatService';
import streamingService from '../services/streamingService';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';

const drawerWidth = 280;

/**
 * Chat page component
 */
const Chat = () => {
  const [chats, setChats] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [error, setError] = useState(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  
  const messagesEndRef = useRef(null);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  useEffect(() => {
    fetchChats();
  }, []);

  /**
   * Fetch a user's chat history
   */
  const fetchChats = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getUserChats();

      const chatGroups = {};
      response.messages.forEach(msg => {
        if (!chatGroups[msg.chat_id]) {
          chatGroups[msg.chat_id] = [];
        }
        chatGroups[msg.chat_id].push(msg);
      });

      const chatList = Object.entries(chatGroups).map(([chatId, messages]) => {
        const sortedMessages = [...messages].sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );

        const latestMessage = sortedMessages[0];
        
        return {
          id: chatId,
          title: latestMessage.user_message.substring(0, 30) + (latestMessage.user_message.length > 30 ? '...' : ''),
          timestamp: latestMessage.timestamp,
          messages: sortedMessages
        };
      });

      const sortedChats = chatList.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
      setChats(sortedChats);

      if (sortedChats.length > 0 && !currentChat) {
        handleSelectChat(sortedChats[0].id);
      }
    } catch (err) {
      console.error('Error fetching chats:', err);
      setError('Failed to load chat history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Fetch messages for a specific chat
   * @param {string} chatId - Chat ID
   */
  const fetchMessages = async (chatId) => {
    setChatLoading(true);
    setError(null);
    
    try {
      const response = await chatService.getChatById(chatId);

      const sortedMessages = [...response.messages].sort((a, b) => 
        new Date(a.timestamp) - new Date(b.timestamp)
      );

      const formattedMessages = sortedMessages.map(msg => ({
        id: msg.id,
        content: msg.user_message,
        role: 'user',
        timestamp: msg.timestamp
      })).flatMap(userMsg => [
        userMsg,
        {
          id: userMsg.id + '-response',
          content: sortedMessages.find(m => m.id === userMsg.id).assistant_message,
          role: 'assistant',
          timestamp: userMsg.timestamp
        }
      ]);
      
      setMessages(formattedMessages);
    } catch (err) {
      console.error(`Error fetching messages for chat ${chatId}:`, err);
      setError('Failed to load messages. Please try again.');
    } finally {
      setChatLoading(false);
    }
  };

  /**
   * Handle selecting a chat
   * @param {string} chatId - Chat ID
   */
  const handleSelectChat = (chatId) => {
    const selected = chats.find(chat => chat.id === chatId);
    
    if (selected) {
      setCurrentChat(selected);
      fetchMessages(chatId);
      
      if (isMobile) {
        setDrawerOpen(false);
      }
    }
  };

  /**
   * Create a new chat
   */
  const handleNewChat = () => {
    const newChatId = `chat_${Date.now()}`;

    const newChat = {
      id: newChatId,
      title: 'New Chat',
      timestamp: new Date().toISOString(),
      messages: []
    };

    setChats([newChat, ...chats]);
    setCurrentChat(newChat);
    setMessages([]);
    
    if (isMobile) {
      setDrawerOpen(false);
    }
  };

  /**
   * Handle sending a message
   * @param {string} message - Message content
   */
  const handleSendMessage = async (message) => {
    if (!message.trim() || isStreaming) return;

    const chatId = currentChat?.id || `chat_${Date.now()}`;

    if (!currentChat) {
      handleNewChat();
    }

    const userMessage = {
      id: `msg_${Date.now()}`,
      content: message,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, userMessage]);

    setIsStreaming(true);
    setStreamingMessage('');

    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    
    try {
      console.log(`Starting stream request for chat ${chatId}`);

      streamingService.startStream(
        message,
        chatId,
        {
          onChunk: (chunk) => {
            console.log(`Received chunk: ${chunk ? chunk.length : 0} chars`);

            setStreamingMessage(prev => {
              const newContent = prev + (chunk || '');
              return newContent;
            });

            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 50);
          },
          onComplete: () => {
            console.log('Stream complete, finalizing message');

            setStreamingMessage(finalContent => {
              console.log(`Final content length: ${finalContent.length}`);

              if (finalContent && finalContent.trim()) {
                setMessages(prev => [
                  ...prev,
                  {
                    id: `msg_${Date.now()}_response`,
                    content: finalContent,
                    role: 'assistant',
                    timestamp: new Date().toISOString()
                  }
                ]);
              } else {
                console.warn('No content in streaming message on completion');
                setError('No response received. Please try again.');
              }

              return '';
            });

            setIsStreaming(false);

            fetchChats();

            setTimeout(() => {
              if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
              }
            }, 100);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setError('Failed to get response. Please try again.');
            setIsStreaming(false);
          }
        }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setIsStreaming(false);
    }
  };

  /**
   * Handle user logout
   */
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            {currentChat?.title || 'LangGraph Chatbot'}
          </Typography>
          
          <Button
            color="inherit"
            onClick={() => navigate('/voice')}
            startIcon={<MicIcon />}
            sx={{ mr: 2 }}
          >
            Voice Assistant
          </Button>
          
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogoutIcon />}
          >
            Logout
          </Button>
        </Toolbar>
      </AppBar>
      
      {/* Chat List Drawer */}
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? drawerOpen : true}
        onClose={() => setDrawerOpen(false)}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Chats
          </Typography>
          <IconButton color="primary" onClick={handleNewChat}>
            <AddIcon />
          </IconButton>
        </Toolbar>
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {chats.length === 0 ? (
              <ListItem>
                <ListItemText primary="No chats yet" />
              </ListItem>
            ) : (
              chats.map((chat) => (
                <ListItem key={chat.id} disablePadding>
                  <ListItemButton
                    selected={currentChat?.id === chat.id}
                    onClick={() => handleSelectChat(chat.id)}
                  >
                    <ListItemText
                      primary={chat.title}
                      secondary={new Date(chat.timestamp).toLocaleString()}
                    />
                  </ListItemButton>
                </ListItem>
              ))
            )}
          </List>
        )}
      </Drawer>
      
      {/* Main Chat Area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Toolbar /> {/* Spacer for AppBar */}
        
        {/* Messages Area */}
        <Box
          sx={{
            flexGrow: 1,
            p: 2,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {chatLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Typography color="error" align="center" sx={{ my: 2 }}>
              {error}
            </Typography>
          ) : messages.length === 0 && !currentChat ? (
            <Box
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
              }}
            >
              <Typography variant="h5" gutterBottom>
                Welcome to LangGraph Chatbot
              </Typography>
              <Typography variant="body1" color="text.secondary" align="center">
                Start a new chat or select an existing one from the sidebar.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleNewChat}
                sx={{ mt: 2 }}
              >
                New Chat
              </Button>
            </Box>
          ) : (
            <>
              {/* Display messages */}
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  content={message.content}
                  role={message.role}
                />
              ))}
              
              {/* Display a streaming message if any */}
              {isStreaming && (
                <MessageBubble
                  content={streamingMessage}
                  role="assistant"
                  isStreaming={true}
                />
              )}
              
              {/* Scroll anchor */}
              <div ref={messagesEndRef} />
            </>
          )}
        </Box>
        
        {/* Chat Input */}
        {(currentChat || messages.length > 0) && (
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isStreaming}
          />
        )}
      </Box>
    </Box>
  );
};

export default Chat;

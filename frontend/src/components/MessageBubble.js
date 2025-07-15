import React from 'react';
import { Box, Typography, Paper, Fade, Avatar } from '@mui/material';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import PersonIcon from '@mui/icons-material/Person';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

/**
 * Component for displaying a chat message
 * @param {Object} props - Component props
 * @param {string} props.content - Message content
 * @param {string} props.role - Message role (user or assistant)
 * @param {boolean} props.isStreaming - Whether the message is currently streaming
 */
/**
 * Custom typing animation component
 */
const TypingAnimation = () => (
  <Box
    sx={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 0.7,
    }}
  >
    {[0, 1, 2].map((i) => (
      <Box
        key={i}
        sx={{
          width: 8,
          height: 8,
          backgroundColor: 'primary.main',
          borderRadius: '50%',
          animation: 'bounce 1.4s infinite ease-in-out',
          animationDelay: `${i * 0.16}s`,
          opacity: 0.7,
          '@keyframes bounce': {
            '0%, 100%': {
              transform: 'translateY(0)',
            },
            '50%': {
              transform: 'translateY(-10px)',
            },
          },
        }}
      />
    ))}
  </Box>
);

const MessageBubble = ({ content, role, isStreaming = false }) => {
  const isUser = role === 'user';
  
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: isUser ? 'row-reverse' : 'row',
        alignItems: 'center',
        mb: 2,
        maxWidth: '100%',
        gap: 1.5,
      }}
    >
      <Avatar 
        sx={{ 
          bgcolor: isUser ? 'primary.main' : '#4CAF50',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0px 2px 4px rgba(0,0,0,0.1)',
          flexShrink: 0,
        }}
      >
        {isUser ? 
          <PersonIcon sx={{ fontSize: 20 }} /> : 
          <SupportAgentIcon sx={{ fontSize: 20 }} />}
      </Avatar>

      <Paper
        elevation={1}
        sx={{
          p: 2,
          maxWidth: '80%',
          borderRadius: 2,
          bgcolor: isUser ? 'primary.dark' : 'background.paper',
          color: isUser ? 'primary.contrastText' : 'text.primary',
          position: 'relative',
          minHeight: '40px',
          minWidth: isStreaming && !isUser && !content ? '180px' : 'auto',
          transition: 'all 0.3s ease',
        }}
      >
        
        {isUser ? (
          <Typography>{content}</Typography>
        ) : (
          <>
            {isStreaming && !content ? (
              <Fade in={true} timeout={800}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: '80px',
                  width: '100%',
                  minWidth: '200px',
                  padding: 2,
                  background: 'linear-gradient(145deg, rgba(25,118,210,0.05) 0%, rgba(25,118,210,0.1) 100%)',
                  borderRadius: 2
                }}>
                  <Box sx={{ mb: 2 }}>
                    <TypingAnimation />
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      fontWeight: 500,
                      letterSpacing: '0.01em',
                      opacity: 0.8
                    }}
                  >
                    Generating response...
                  </Typography>
                </Box>
              </Fade>
            ) : content ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  pre: ({ node, ...props }) => (
                    <Box
                      component="pre"
                      sx={{
                        backgroundColor: 'rgba(0, 0, 0, 0.2)',
                        p: 1.5,
                        borderRadius: 1,
                        overflowX: 'auto',
                      }}
                      {...props}
                    />
                  ),
                  code: ({ node, inline, ...props }) =>
                    inline ? (
                      <Typography
                        component="code"
                        sx={{
                          backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          p: 0.3,
                          borderRadius: 0.5,
                          fontFamily: 'monospace',
                        }}
                        {...props}
                      />
                    ) : (
                      <Typography
                        component="code"
                        sx={{
                          display: 'block',
                          fontFamily: 'monospace',
                          whiteSpace: 'pre-wrap',
                        }}
                        {...props}
                      />
                    ),
                }}
              >
                {content}
              </ReactMarkdown>
            ) : null}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default MessageBubble;

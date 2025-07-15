import React, { createContext, useContext, useState, useCallback } from 'react';
import { Room, RoomEvent, DataPacket_Kind } from 'livekit-client';

const LiveKitContext = createContext(null);

export function useLiveKit() {
  const context = useContext(LiveKitContext);
  if (!context) {
    throw new Error('useLiveKit must be used within a LiveKitProvider');
  }
  return context;
}

export function LiveKitProvider({ children }) {
  const [room, setRoom] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [connectionDetails, setConnectionDetails] = useState(null);
  const [transcriptions, setTranscriptions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [agentState, setAgentState] = useState('disconnected'); // disconnected, connecting, listening, thinking, speaking

  const connect = useCallback(async (url, token) => {
    if (isConnecting) return;
    
    try {
      setIsConnecting(true);
      setError(null);

      console.log('🔌 LiveKit connection attempt:', {
        url: url,
        tokenLength: token ? token.length : 0,
        tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : 'none'
      });

      const newRoom = new Room();

      newRoom.on(RoomEvent.DataReceived, (payload, participant, kind) => {
        if (kind === DataPacket_Kind.RELIABLE) {
          try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            console.log('📥 Received data from LiveKit:', data);

            if (data.type === 'transcription') {
              setTranscriptions(prev => [...prev, data]);
            } else if (data.type === 'chat') {
              setChatMessages(prev => [...prev, data]);
            } else if (data.type === 'agent_state') {
              setAgentState(data.state);
              console.log('🤖 Agent state changed:', data.state);
            }
          } catch (error) {
            console.error('❌ Error parsing data message:', error);
          }
        }
      });
      
      newRoom.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log('👤 Participant connected:', participant.identity);
        if (participant.identity.includes('agent')) {
          console.log('🤖 Agent has joined the room');
        }
      });
      
      newRoom.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log('👤 Participant disconnected:', participant.identity);
      });
      
      newRoom.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log('🎵 Track subscribed:', track.kind, 'from', participant.identity);
      });

      console.log('⏳ Connecting to LiveKit room...');
      await newRoom.connect(url, token);
      console.log('✅ Connected to LiveKit room successfully');
      
      setRoom(newRoom);
      setIsConnected(true);
      return newRoom;
    } catch (err) {
      setError(`Failed to connect to LiveKit: ${err.message}`);
      return null;
    } finally {
      setIsConnecting(false);
    }
  }, [isConnecting]);

  const disconnect = useCallback(() => {
    if (room) {
      room.disconnect();
      setRoom(null);
      setIsConnected(false);
    }
  }, [room]);

  const logConnectionDetails = useCallback((url, token, roomName) => {
    console.log('🔄 LiveKit connection details:', {
      url: url,
      tokenPreview: token ? `${token.substring(0, 10)}...${token.substring(token.length - 5)}` : 'none',
      roomName: roomName
    });

    setConnectionDetails({ url, token, roomName });
  }, []);

  const sendChatMessage = useCallback((message) => {
    if (!room || !isConnected) {
      console.error('❌ Cannot send message: not connected to room');
      return false;
    }
    
    try {
      const data = {
        type: 'chat',
        message,
        timestamp: new Date().toISOString(),
        sender: 'user'
      };
      
      console.log('📤 Sending chat message:', data);
      const encoder = new TextEncoder();
      const payload = encoder.encode(JSON.stringify(data));
      room.localParticipant.publishData(payload, DataPacket_Kind.RELIABLE);
      return true;
    } catch (error) {
      console.error('❌ Error sending chat message:', error);
      return false;
    }
  }, [room, isConnected]);

  const value = {
    room,
    isConnected,
    isConnecting,
    error,
    setError,
    connectionDetails,
    connect,
    disconnect,
    logConnectionDetails,
    transcriptions,
    chatMessages,
    agentState,
    sendChatMessage
  };

  return (
    <LiveKitContext.Provider value={value}>
      {children}
    </LiveKitContext.Provider>
  );
}

export default LiveKitContext;

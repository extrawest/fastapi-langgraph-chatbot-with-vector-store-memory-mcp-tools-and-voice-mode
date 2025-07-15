# 🤖 FastAPI Langgraph Chatbot with Vector Store, Memory, MCP tools and Voice mode

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)]() 
[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
![GitHub release](https://img.shields.io/badge/release-v1.0.0-blue)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-orange.svg)](https://github.com/langchain-ai/langgraph)

A scalable AI chatbot platform built with FastAPI and LangGraph, featuring multi-agent orchestration, multi-tenant vector storage, cross-chat memory, and voice call capabilities through LiveKit integration.

## Demo


https://github.com/user-attachments/assets/fc2c11a7-72ad-429d-944d-e413bc76318a



## 🌟 Key Features

### 🔒 Secure Authentication & Multi-Tenancy

- **OAuth2 Password Flow**: Industry-standard authentication with JWT tokens for secure API access
- **User Registration System**: Complete registration flow with username, password, and tenant_id
- **Multi-Tenant Architecture**: Data isolation between different tenants for enhanced security and privacy
- **Role-Based Access Control**: Granular permissions for different user types

### 🧠 Advanced AI Orchestration with LangGraph

- **Multi-Agent System**: Specialized agents working together to solve complex tasks
  - **Supervisor Agent**: Coordinates workflow and delegates tasks to specialized agents
  - **Research Agent**: Retrieves information from the web and knowledge bases
  - **Scraper Agent**: Extracts and summarizes content from web pages
- **Complex Workflows**: Handle multistep reasoning and task decomposition
- **State Management**: Maintain conversation context across multiple turns

### 📊 Powerful Vector Storage with Qdrant

- **Multi-Tenant Vector Store**: Efficiently store and retrieve conversation history with tenant isolation
- **Semantic Search**: Find relevant past conversations using semantic similarity
- **Payload Filtering**: Efficient filtering by tenant_id for data security and performance
- **Metadata Storage**: Store and retrieve additional context alongside vector embeddings

### 💾 Persistent Memory with Mem0

- **Cross-Chat Memory**: Remember important information across different conversations
- **Long-Term Context**: Maintain context over extended interactions
- **Selective Memory**: Intelligently decide what information to remember
- **Memory Retrieval**: Retrieve relevant memories based on conversation context

### 🔍 MCP Tools Integration

- **Firecrawl**: Advanced web scraping and content extraction
  - Extract structured data from websites
  - Summarize long-form content
  - Process tables and lists
- **Tavily**: Intelligent web search capabilities
  - Semantic search across the web
  - Real-time information retrieval
  - Source attribution and citation

### 🎤 Voice Assistant via LiveKit

- **Real-Time Voice Communication**: Natural voice interaction using LiveKit's WebRTC platform
- **High-Quality Speech Recognition**: Accurate transcription with Deepgram's advanced STT
- **Natural Text-to-Speech**: Lifelike voice responses with Cartesia TTS
- **Voice Activity Detection**: Intelligent turn-taking with Silero VAD
- **Multilingual Support**: Voice interaction in multiple languages

### 🔎 LangSmith Integration

- **Comprehensive Tracing**: Capture detailed traces of all LangChain and LangGraph executions
- **Visual Debugging**: Visualize the multi-agent workflow and message passing
- **Performance Monitoring**: Track latency, token usage, and costs across different components
- **Feedback Collection**: Gather and analyze user feedback on model responses
- **Experiment Tracking**: Compare different prompts, models, and agent configurations

### 🎨 Modern React UI

- **Clean Material-UI Design**: Intuitive interface with modern design principles
- **Responsive Layout**: Seamless experience across desktop and mobile devices
- **Real-Time Chat Interface**: Dynamic message bubbles with user/assistant avatars
- **Markdown Support**: Rich text formatting in messages
- **Voice Mode Integration**: Seamless switching between text and voice interaction

### Backend Architecture

- **FastAPI Framework**: High-performance asynchronous API framework with automatic OpenAPI documentation
- **SQLAlchemy ORM**: Async database operations with SQLite (configurable for PostgreSQL/MySQL)
- **Pydantic Models**: Type-safe data validation and serialization
- **JWT Authentication**: Secure token-based authentication with OAuth2 password flow

## 👨‍💻 Usage Guide

### Getting Started

1. **Register an Account**:
   - Navigate to the registration page at `/register`
   - Create an account with a unique username, secure password, and your assigned tenant_id
   - Each tenant_id creates an isolated environment for your data

2. **Login to the Platform**:
   - Use your credentials to log in at the main page
   - Your JWT token will be stored securely for later API calls

### Using the Chat Interface

1. **Creating Conversations**:
   - Click the "+" button in the sidebar to start a new conversation
   - Give your conversation a meaningful title for easy reference
   - Each conversation is stored with your tenant_id for data isolation

2. **Interacting with the AI**:
   - Type your message in the input field and press Enter or click the send button
   - The AI response will stream in real-time with token-by-token updates
   - Messages are displayed with clear user/assistant avatars for easy distinction
   - The system supports markdown formatting in both user and assistant messages

3. **Managing Conversations**:
   - Access previous conversations from the sidebar navigation
   - Search through your conversation history

### Using the Voice Assistant

1. **Launching Voice Mode**:
   - Click the microphone icon in the chat interface to activate voice mode
   - The system will request microphone permissions if not already granted
   - Wait for the "Voice Assistant Ready" message before speaking

2. **Voice Interaction**:
   - Speak naturally when you see the "Listening..." indicator
   - The assistant will process your speech and respond with voice
   - Visual feedback shows the transcription of both your speech and the assistant's response
   - The voice assistant supports natural turn-taking in conversation

3. **Advanced Voice Features**:
   - The system automatically detects when you've finished speaking
   - Voice activity detection filters out background noise
   - Multilingual support allows interaction in different languages
   - Voice quality settings can be adjusted for different environments

4. **Ending a Voice Session**:
   - Click the disconnect button to end the voice session
   - Your conversation history is preserved for future reference

### Using External Tools

The AI assistant can leverage powerful external tools to enhance your experience:

1. **Web Search**: Ask questions that require up-to-date information from the web
2. **Web Scraping**: Request summaries or information from specific websites

## 💻 Installation

### Prerequisites

- Python 3.13+
- Node.js 16+
- npm 8+
- Qdrant (can be run via Docker)

### Backend Setup

1. Clone the repository

```bash
git clone <repository-url>
cd ruban_fastapi-langgraph-chatbot
```

2. Create and activate a virtual environment

```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install Python dependencies

```bash
pip install -r requirements.txt
```

4. Set up environment variables

Create a `.env` file in the root directory with the following variables:

```env
# FastAPI settings
SECRET_KEY=your_secret_key_here
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Database settings
SQLALCHEMY_DATABASE_URI=sqlite:///./app.db

# OpenAI settings
OPENAI_API_KEY=your_openai_api_key_here

# Qdrant settings
QDRANT_HOST=localhost
QDRANT_PORT=6333

# LiveKit settings
LIVEKIT_URL=your_livekit_url_here
LIVEKIT_API_KEY=your_livekit_api_key_here
LIVEKIT_API_SECRET=your_livekit_api_secret_here

# LangSmith (optional, for tracing)
LANGCHAIN_TRACING_V2=true
LANGSMITH_API_KEY=your_langsmith_api_key_here
LANGSMITH_PROJECT=your_project_name
```

### Frontend Setup

1. Navigate to the frontend directory

```bash
cd frontend
```

2. Install Node.js dependencies

```bash
npm install
```

## 🚀 Running the Application

### Starting the Backend Services

1. Start the MCP servers (in separate terminals)

```bash
# Terminal 1: Start the search server
python -m app.mcp_server.search_server

# Terminal 2: Start the web scraping server
python -m app.mcp_server.web_scrapping_server
```

2. Start the main FastAPI server

```bash
python app.py
```

3. Start the LiveKit voice assistant

```bash
python app/agent/livekit_agent.py dev
```

### Starting the Frontend

```bash
cd frontend
npm start
```

### Accessing the Application

- Backend API documentation: http://localhost:8000/docs
- Frontend interface: http://localhost:3000

If you don't have an account, register first and then log in to access the chat interface.

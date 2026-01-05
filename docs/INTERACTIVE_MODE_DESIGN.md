# Interactive Mode Design for Claude Code Containers

## Overview

Add interactive mode capability to run Claude Code in real-time with streaming output and bidirectional communication within the remote container/sandbox.

## Architecture

```
Client (Browser/CLI)
    │
    │ POST /interactive/start { prompt, repoUrl }
    ▼
Cloudflare Worker
    │
    ├─→ Creates session in SessionDO
    ├─→ Spawns container with session ID
    │
    │ SSE GET /interactive/stream?sessionId={id}
    ▼
    │ Streams Claude output in real-time
    │
    │ POST /interactive/send { sessionId, message }
    ▼
    │ Sends user input to active Claude session
```

## Components

### 1. Session Durable Object

Manages active interactive sessions:
- Session creation and lifecycle
- Message buffering
- User input queuing
- Session state tracking

### 2. Interactive Container Handler

Extended container handler that:
- Streams Claude output via stdout (JSONL format)
- Reads user input from stdin or HTTP endpoint
- Maintains Claude context across messages

### 3. Worker Endpoints

- `POST /interactive/start` - Start new interactive session
- `GET /interactive/stream` - SSE stream of Claude output
- `POST /interactive/send` - Send user message to session
- `DELETE /interactive/{sessionId}` - End session

## Message Protocol

### Container → Worker (Streaming via stdout)

```json
{"type":"status","message":"Cloning repository..."}
{"type":"claude_start","turn":1}
{"type":"claude_delta","content":"Hello! I'm analyzing your code..."}
{"type":"claude_delta","content":"I found 3 files..."}
{"type":"claude_end","turn":1}
{"type":"input_request","prompt":"Would you like me to proceed?"}
{"type":"status","message":"Waiting for user input..."}
{"type":"complete","success":true}
```

### Worker → Container (User input via stdin)

Sent as JSON lines:
```json
{"type":"user_input","content":"Yes, please proceed"}
{"type":"user_input","content":"Focus on the auth module"}
```

## Implementation Details

### Session Object Structure

```typescript
interface InteractiveSession {
  id: string;
  status: 'starting' | 'ready' | 'processing' | 'waiting_input' | 'completed' | 'error';
  createdAt: number;
  lastActivityAt: number;

  // Context
  repository?: {
    owner: string;
    name: string;
    cloneUrl: string;
    branch: string;
  };
  workspaceDir?: string;

  // Claude state
  conversationHistory: Message[];
  currentTurn: number;

  // Output buffer (for SSE streaming)
  outputBuffer: string[];
  waitingClients: Set<WebSocket>; // or SSE streams
}
```

### Claude Code SDK Integration

The SDK already supports streaming via async iterable:

```typescript
// Current: wait for all messages to complete
for await (const message of query({ prompt, options })) {
  results.push(message);
}

// Interactive: stream each message immediately
for await (const message of query({ prompt, options })) {
  // Stream to client via SSE
  await streamToClient(sessionId, {
    type: 'claude_delta',
    content: getMessageText(message)
  });

  // Check for user input
  if (message.requiresInput) {
    const userInput = await waitForUserInput(sessionId);
    // Continue conversation...
  }
}
```

## API Endpoints

### POST /interactive/start

Start a new interactive session.

```json
// Request
{
  "prompt": "Analyze this repository for security issues",
  "repository": {
    "url": "https://github.com/owner/repo",
    "branch": "main"
  },
  "options": {
    "permissionMode": "bypassPermissions",
    "maxTurns": 10
  }
}

// Response
{
  "sessionId": "sess_abc123",
  "status": "starting",
  "streamUrl": "/interactive/stream?sessionId=sess_abc123"
}
```

### GET /interactive/stream?sessionId={id}

SSE stream of session output.

```
data: {"type":"status","message":"Cloning repository..."}

data: {"type":"claude_start","turn":1}

data: {"type":"claude_delta","content":"I'll analyze your repository..."}

data: {"type":"input_request","prompt":"Should I continue?"}
```

### POST /interactive/send

Send user message to active session.

```json
// Request
{
  "sessionId": "sess_abc123",
  "message": "Yes, please continue with the analysis"
}

// Response
{
  "success": true,
  "message": "Input delivered to session"
}
```

## Container Changes

### New Endpoint: POST /interactive-session

```typescript
async function interactiveSessionHandler(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const sessionId = req.headers['x-session-id'] as string;

  // Set up SSE streaming
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Setup workspace
    sendSSE('status', { message: 'Setting up workspace...' });
    const workspaceDir = await setupWorkspace(/* ... */);

    // Run Claude Code with streaming
    sendSSE('status', { message: 'Starting Claude Code...' });

    const prompt = await getPromptFromRequest(req);

    for await (const message of query({
      prompt,
      options: {
        permissionMode: 'bypassPermissions',
        onStream: (delta) => {
          sendSSE('claude_delta', { content: delta });
        }
      }
    })) {
      sendSSE('claude_message', {
        type: message.type,
        content: getMessageText(message)
      });

      // Handle requests for input
      if (message.type === 'ask' || message.requiresInput) {
        sendSSE('input_request', {
          prompt: getMessageText(message)
        });

        // Wait for user input via stdin or separate endpoint
        const userInput = await waitForUserInput(sessionId);

        // Continue with user input...
      }
    }

    sendSSE('complete', { success: true });

  } catch (error) {
    sendSSE('error', { message: error.message });
  }

  res.end();
}
```

## Benefits

1. **Real-time feedback** - See Claude's thinking as it happens
2. **Interactive guidance** - Steer Claude's analysis with follow-up questions
3. **Transparency** - Understand what Claude is doing at each step
4. **Faster iteration** - Get partial results before completion
5. **Better UX** - More natural conversational experience

## Use Cases

- **Code Review** - Ask follow-up questions about specific files
- **Debugging** - Guide Claude through investigation steps
- **Refactoring** - Approve or reject changes in real-time
- **Learning** - Understand Claude's reasoning process
- **Complex Tasks** - Break down large tasks into interactive steps

## Future Enhancements

1. **WebSocket support** - True bidirectional communication
2. **Session persistence** - Resume sessions after disconnection
3. **Multi-user sessions** - Collaborative debugging
4. **Visual diff streaming** - Show file changes in real-time
5. **Progress indicators** - Show tool execution progress

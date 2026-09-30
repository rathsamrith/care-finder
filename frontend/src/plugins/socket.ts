import { io } from 'socket.io-client'

// Replaces the old Pusher client. Connects to the NestJS WebSocket gateway
// (`backend/src/core/websocket/notifications.gateway.ts`), which authenticates
// the connection with the same JWT access token used for HTTP requests and
// joins a per-user room server-side - no client-side channel subscription
// needed, just listen for the event names directly.
const SOCKET_URL = 'http://127.0.0.1:3001'

export const socketConstance = io(`${SOCKET_URL}/realtime`, {
  autoConnect: false,
  auth: (cb) => cb({ token: localStorage.getItem('access_token') })
})

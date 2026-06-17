import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { getRedisClient } from '../config/redis';
import { Subscription } from '../models/Subscription';
import { User } from '../models/User';
import { SOCKET_EVENTS, getRoomName, Segment } from '@theonetrade/shared-types';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
  userName?: string;
}

export function setupSocketHandlers(io: SocketServer): void {
  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        // Allow unauthenticated connections for public data
        return next();
      }

      const decoded = jwt.verify(token, env.JWT_SECRET) as any;
      const redis = getRedisClient();
      const storedSessionId = await redis.get(`session:${decoded.userId}`);

      if (!storedSessionId || storedSessionId !== decoded.sessionId) {
        // Proceed as unauthenticated rather than rejecting
        return next();
      }

      socket.userId = decoded.userId;
      socket.userRole = decoded.role;
      next();
    } catch {
      // Token invalid/expired — proceed as unauthenticated rather than rejecting
      next();
    }
  });

  io.on(SOCKET_EVENTS.CONNECTION, async (socket: AuthenticatedSocket) => {
    if (socket.userId) {
      // Join user-specific room
      socket.join(`user:${socket.userId}`);

      // Fetch and store user name for telemetry
      try {
        const user = await User.findById(socket.userId).select('name').lean();
        socket.userName = user?.name || 'Unknown';
      } catch {
        socket.userName = 'Unknown';
      }

      // Join admin room if admin
      if (socket.userRole === 'ADMIN') {
        socket.join('admin');
      }

      // Join ALL segment rooms if user has any active subscription
      // This ensures they receive signals regardless of which segment they subscribed to
      try {
        const hasActive = await Subscription.exists({
          userId: socket.userId,
          status: 'ACTIVE',
          expiresAt: { $gt: new Date() },
        });

        if (hasActive) {
          for (const seg of Object.values(Segment)) {
            socket.join(getRoomName(seg));
          }
        }
      } catch (error) {
        console.error('Error joining rooms:', error);
      }
    }

    // Handle signal acknowledgement
    socket.on(SOCKET_EVENTS.SIGNAL_ACKNOWLEDGE, (data: { signalId: string }) => {
      if (socket.userId) {
        // Silence alarm on all other connected devices
        io.to(`user:${socket.userId}`).except(socket.id).emit(SOCKET_EVENTS.SIGNAL_SILENCE_ALARM, {
          signalId: data.signalId,
        });
      }
    });

    // Handle heartbeat for telemetry
    socket.on(SOCKET_EVENTS.HEARTBEAT, (data: any) => {
      if (socket.userId) {
        socket.data.lastHeartbeat = {
          ...data,
          userId: socket.userId,
          timestamp: Date.now(),
        };
      }
    });

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      // Cleanup handled automatically by Socket.io
    });
  });
}

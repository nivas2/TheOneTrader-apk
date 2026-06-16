import { Server as SocketServer } from 'socket.io';
import { SOCKET_EVENTS } from '@theonetrade/shared-types';

export function startTelemetry(io: SocketServer): void {
  setInterval(async () => {
    try {
      const sockets = await io.fetchSockets();
      const roomCounts: Record<string, number> = {};

      // Count clients per room
      const rooms = io.of('/').adapter.rooms;
      for (const [roomName, socketIds] of rooms) {
        // Skip individual socket rooms
        if (!socketIds.has(roomName)) {
          roomCounts[roomName] = socketIds.size;
        }
      }

      // Gather active user data from heartbeats
      const activeUsers: Array<{ userId: string; name: string; page: string; lastSeen: number }> = [];
      for (const socket of sockets) {
        if (socket.data.lastHeartbeat) {
          activeUsers.push({
            userId: socket.data.lastHeartbeat.userId,
            name: (socket as any).userName || 'Unknown',
            page: socket.data.lastHeartbeat.page || 'unknown',
            lastSeen: socket.data.lastHeartbeat.timestamp,
          });
        }
      }

      // Deduplicate to get unique connected users (by userId)
      const uniqueUserMap = new Map<string, { userId: string; name: string; role: string }>();
      for (const socket of sockets) {
        const uid = (socket as any).userId;
        if (uid && !uniqueUserMap.has(uid)) {
          uniqueUserMap.set(uid, {
            userId: uid,
            name: (socket as any).userName || 'Unknown',
            role: (socket as any).userRole || 'USER',
          });
        }
      }
      const uniqueUsers = Array.from(uniqueUserMap.values());

      // Emit to admin room
      io.to('admin').emit(SOCKET_EVENTS.TELEMETRY_UPDATE, {
        connectedClients: sockets.length,
        uniqueUsers,
        roomCounts,
        activeUsers,
      });
    } catch (error) {
      console.error('Telemetry error:', error);
    }
  }, 5000);
}

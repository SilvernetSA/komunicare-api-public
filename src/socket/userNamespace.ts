import { Server as IOServer, Socket } from 'socket.io';
import { KeyboardSettingsPersistenceModel } from '../nest/common/models/keyboard-settings.persistence-model';
import { buildKeyboardSettingsUpdate } from '../nest/common/keyboard-settings-update.util';

function common(socket: Socket) {
  socket.onAny((evt, ...args) => {
    if (evt === 'ping' || evt === 'pong') return;
  });

  socket.on('joinUserRoom', (userId?: string | number) => {
    if (!userId) return;
    socket.join(String(userId));
    console.log(`[Socket][user] ${socket.id} joined user:${userId}`);
  });
}

export function attachUserNamespace(io: IOServer) {
  io.on('connection', (socket: Socket) => {
    console.log('[Socket][user] Connected', socket.id);
    common(socket);

    /** Forward de frames de cámara → admin namespace */
    socket.on('userCameraFrame', ({ userId, frame }) => {
      io.of('/admin').to(userId).emit('userCameraFrame', { userId, frame });
    });

    /** Actualizar configuraciones de teclado desde la app */
    socket.on(
      'updateKeyboardSettings',
      async ({ userId, settings }: { userId: string; settings: any }) => {
        console.log(`[Socket][user] updateKeyboardSettings for user:${userId}`, settings);

        if (!userId || !settings) {
          socket.emit('updateAck', { ok: false, error: 'Missing userId or settings' });
          console.log(`[Socket][user] Invalid updateKeyboardSettings: missing userId or settings`);
          return;
        }

        // Validar que el userId coincide con el usuario autenticado (si el token está disponible)
        const authToken = socket.handshake.auth?.token;
        if (!authToken) {
          socket.emit('updateAck', { ok: false, error: 'Authentication required' });
          console.log(`[Socket][user] No auth token provided for user:${userId}`);
          return;
        }

        try {
          const update = buildKeyboardSettingsUpdate(userId, settings);
          const updated = await KeyboardSettingsPersistenceModel.findOneAndUpdate(
            { user: userId },
            update,
            {
              upsert: true,
              new: true,
              runValidators: true,
              setDefaultsOnInsert: true,
            },
          ).lean();

          // Notificar a la app de teclado (namespace /, sala userId)
          io.of('/').to(userId).emit('keyboardSettingsUpdated', updated);
          // Notificar al backoffice (namespace /admin)
          io.of('/admin').to(userId).emit('keyboardSettingsUpdated', updated);
          // Confirmar al cliente que envió la actualización
          socket.emit('updateAck', { ok: true });
          console.log(`[Socket][user] Updated settings for user:${userId}`, updated);
        } catch (e: any) {
          socket.emit('updateAck', { ok: false, error: e.message });
          console.error(`[Socket][user] Error updating settings for user:${userId}`, e.message);
        }
      },
    );

    socket.on('disconnect', r => console.log('[Socket][user] Disconnected', socket.id, r));
  });
}

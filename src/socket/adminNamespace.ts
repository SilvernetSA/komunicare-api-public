import { Server as IOServer, Socket } from 'socket.io';
import { KeyboardSettingsPersistenceModel } from '../nest/common/models/keyboard-settings.persistence-model';
import { buildKeyboardSettingsUpdate } from '../nest/common/keyboard-settings-update.util';

function common(socket: Socket) {
  socket.onAny((evt, ...args) => {
    if (evt === 'ping' || evt === 'pong') return;
    console.log(`[Socket][admin] ${evt} from ${socket.id}`, args?.[0]);
  });

  socket.on('joinUserRoom', (userId?: string | number) => {
    if (!userId) return;
    socket.join(String(userId));
    console.log(`[Socket][admin] ${socket.id} joined user:${userId}`);
  });
}

export function attachAdminNamespace(io: IOServer) {
  const ns = io.of('/admin');

  ns.on('connection', (socket: Socket) => {
    console.log('[Socket][admin] Connected', socket.id);
    common(socket);

    /* ────────── Cambiar parámetros de teclado ────────── */
    socket.on(
      'adminUpdateKeyboardSettings',
      async ({ userId, settings }: { userId: string; settings: any }) => {
        if (!userId || !settings) return;

        try {
          const update = buildKeyboardSettingsUpdate(userId, settings);
          const updated = await KeyboardSettingsPersistenceModel.findOneAndUpdate(
            { user: userId },
            update,
            { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
          ).lean();

          io.of('/').to(userId).emit('keyboardSettingsUpdated', updated);
          socket.emit('adminUpdateAck', { ok: true });
        } catch (e: any) {
          console.error('[admin] DB error', e.message);
          socket.emit('adminUpdateAck', { ok: false, error: e.message });
        }
      },
    );

    /* ───── Solicitar cámara ───── */
    socket.on('requestUserCamera', (userId: string) => {
      io.of('/').to(userId).emit('requestUserCamera');
    });

    /* ───── Detener cámara ───── */
    socket.on('stopUserCamera', (userId: string) => {
      io.of('/').to(userId).emit('stopUserCamera');
    });

    socket.on('disconnect', r => console.log('[Socket][admin] Disconnected', socket.id, r));
  });
}

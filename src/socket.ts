import type { Server as HttpServer }  from 'http';
import type { Server as HttpsServer } from 'https';
import { Server as IOServer }         from 'socket.io';

import { attachUserNamespace }  from './socket/userNamespace';
import { attachAdminNamespace } from './socket/adminNamespace';

type SocketCorsOptions = {
  origin?: string | RegExp | Array<string | RegExp> | boolean;
  methods?: string | string[];
  allowedHeaders?: string | string[];
  credentials?: boolean;
};

let ioInstance: IOServer | null = null;

/** Llamar una sola vez después de crear el server HTTP/S */
export function init(
    httpServer : HttpServer | HttpsServer,
    corsOpts   : Partial<SocketCorsOptions> = {},
): IOServer {
  if (ioInstance) return ioInstance;

  ioInstance = new IOServer(httpServer, {
    cors: { origin: '*', credentials: true, ...corsOpts },
  });

  // Conectar namespaces
  attachUserNamespace(ioInstance);   // default "/"
  attachAdminNamespace(ioInstance);  // namespace "/admin"

  return ioInstance;
}

export function get(): IOServer {
  if (!ioInstance) throw new Error('Socket.IO not initialized');
  return ioInstance;
}
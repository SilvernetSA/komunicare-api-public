/**
 *  Extiende la definición de Request que viene con Express.
 *  – Usa el namespace `Express` porque es el que Exporta oficialmente
 *  – No exportes nada: con declararlo en el ámbito global alcanza
 */
import 'express';           // importa los tipos originales

declare global {
  namespace Express {
    interface Request {
      /** Inyectado por tu security-handler */
      auth?: {
        id?: string;
        [k: string]: any;
      };

      /** Añadido en el security-handler */
      user?: {
        isAdmin?: boolean;
        [k: string]: any;
      };
    }
  }
}

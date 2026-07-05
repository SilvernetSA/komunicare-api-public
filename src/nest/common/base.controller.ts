import { normalizeControllerError } from './controller-error.util';

export abstract class BaseController {
  protected async executeRequest<T>(
    operationName: string,
    action: () => Promise<T>,
    defaultMessage: string,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw normalizeControllerError(
        this.constructor.name,
        operationName,
        error,
        defaultMessage,
      );
    }
  }
}

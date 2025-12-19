import { RequestHandler } from 'express';

/**
 * Adapts a typed controller to an Express-compatible handler.
 * This is the ONLY place we cast.
 */
export function asHandler(fn: any): RequestHandler {
  return fn as RequestHandler;
}

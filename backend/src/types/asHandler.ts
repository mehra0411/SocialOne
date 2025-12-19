import { RequestHandler } from 'express';

export const asHandler =
  (fn: any): RequestHandler =>
  (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

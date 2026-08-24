import type { Request, Response } from 'express';
import { handleGetVapidKey } from '../../server/handlers/notifications';

export default async function handler(req: Request | any, res: Response | any) {
  return res.status(200).json(handleGetVapidKey());
}

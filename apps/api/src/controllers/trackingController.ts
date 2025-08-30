import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const trackNotificationOpen = async (req: Request, res: Response) => {
  const { id } = req.params;
  await prisma.notification.update({
    where: { id },
    data: { isOpened: true, openedAt: new Date() },
  });
  // Return a 1x1 transparent pixel
  const pixel = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
  res.writeHead(200, { 'Content-Type': 'image/gif', 'Content-Length': pixel.length });
  res.end(pixel);
};

export const trackNotificationClick = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { url } = req.query;
  await prisma.notification.update({
    where: { id },
    data: { isClicked: true, clickedAt: new Date() },
  });
  res.redirect(url as string || '/');
};
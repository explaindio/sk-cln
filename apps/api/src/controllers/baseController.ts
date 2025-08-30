import { Response } from 'express';

export class BaseController {
  protected sendSuccess(res: Response, data: any, statusCode: number = 200) {
    res.status(statusCode).json({
      success: true,
      data,
    });
  }

  protected sendError(res: Response, message: string, statusCode: number = 400) {
    res.status(statusCode).json({
      success: false,
      error: message,
    });
  }

  protected sendPaginated(res: Response, data: any[], page: number, limit: number, total: number) {
    res.json({
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
}
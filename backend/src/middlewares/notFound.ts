import { Request, Response, NextFunction } from 'express'
import { ApiResponse } from '../utils/ErrorHandler'

export const notFound = (req: Request, res: Response, next: NextFunction) => {
  const response = ApiResponse.error(`Route ${req.originalUrl} not found`, {
    path: req.originalUrl,
    method: req.method,
  })
  res.status(404).json(response)
}

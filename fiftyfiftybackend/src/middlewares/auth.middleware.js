import jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../exceptions/index.js';

export const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token is required');
    }

    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';

    const decoded = jwt.verify(token, secret);

    req.user = decoded; // { id, email, role, gymId, fullName }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Session expired. Please log in again.'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid authentication token'));
    } else {
      next(error);
    }
  }
};

export const optionalAuthenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const secret = process.env.JWT_SECRET || 'fiftyfifty_jwt_super_secret_key_2026';

      req.user = jwt.verify(token, secret);
    }
    next();
  } catch (_e) {
    next();
  }
};

export default {
  authenticate,
  optionalAuthenticate
};

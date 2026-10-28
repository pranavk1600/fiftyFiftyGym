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

    // In development mode, support dev tokens generated during offline fallback
    if (process.env.NODE_ENV !== 'production' && token.startsWith('dev_token_')) {
      if (token.startsWith('dev_token_superadmin')) {
        req.user = {
          id: 'usr_superadmin_dev',
          email: 'admin@fiftyfifty.com',
          role: 'SUPER_ADMIN',
          gymId: null,
          fullName: 'Platform Super Admin'
        };
        return next();
      } else if (token.startsWith('dev_token_owner')) {
        req.user = {
          id: 'usr_owner_dev',
          email: 'owner@fiftyfifty.com',
          role: 'GYM_OWNER',
          gymId: 'gym_alpha_1',
          fullName: 'Gym Owner'
        };
        return next();
      } else if (token.startsWith('dev_token_member')) {
        req.user = {
          id: 'usr_member_dev',
          email: 'member@fiftyfifty.com',
          role: 'MEMBER',
          gymId: 'gym_alpha_1',
          fullName: 'Member'
        };
        return next();
      }
    }

    const decoded = jwt.verify(token, secret);

    req.user = decoded; // { id, email, role, gymId }
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

      if (process.env.NODE_ENV !== 'production' && token.startsWith('dev_token_')) {
        if (token.startsWith('dev_token_superadmin')) {
          req.user = { id: 'usr_superadmin_dev', email: 'admin@fiftyfifty.com', role: 'SUPER_ADMIN', gymId: null, fullName: 'Platform Super Admin' };
        } else if (token.startsWith('dev_token_owner')) {
          req.user = { id: 'usr_owner_dev', email: 'owner@fiftyfifty.com', role: 'GYM_OWNER', gymId: 'gym_alpha_1', fullName: 'Gym Owner' };
        } else if (token.startsWith('dev_token_member')) {
          req.user = { id: 'usr_member_dev', email: 'member@fiftyfifty.com', role: 'MEMBER', gymId: 'gym_alpha_1', fullName: 'Member' };
        }
      } else {
        req.user = jwt.verify(token, secret);
      }
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

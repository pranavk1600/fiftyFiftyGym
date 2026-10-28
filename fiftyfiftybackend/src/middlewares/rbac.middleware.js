import { ForbiddenError } from '../exceptions/index.js';
import { ROLES } from '../constants/roles.constant.js';

export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return next(new ForbiddenError('User identity could not be verified'));
    }

    const userRole = req.user.role;

    // Treat SUPER_ADMIN and PLATFORM_ADMIN as synonymous Super Admin privileges
    const isSuperAdmin = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN || userRole === 'super_admin';
    const acceptsSuperAdmin = allowedRoles.includes(ROLES.SUPER_ADMIN) || allowedRoles.includes(ROLES.PLATFORM_ADMIN) || allowedRoles.includes('super_admin');

    const hasAccess = allowedRoles.includes(userRole) || (isSuperAdmin && acceptsSuperAdmin);

    if (!hasAccess) {
      return next(new ForbiddenError(`Forbidden: Access requires one of [${allowedRoles.join(', ')}] roles`));
    }

    next();
  };
};

/**
 * Enforces gym-level tenant data isolation.
 * Prevents Gym Owners or Members from accessing other gyms' records.
 * Never trusts a gym ID from client headers or query without validating it against req.user.gymId.
 */
export const enforceGymIsolation = (req, res, next) => {
  if (!req.user) {
    return next(new ForbiddenError('Authentication required for gym tenant access'));
  }

  const userRole = req.user.role;
  const isSuperAdmin = userRole === ROLES.SUPER_ADMIN || userRole === ROLES.PLATFORM_ADMIN || userRole === 'super_admin';

  if (isSuperAdmin) {
    req.gymId = req.headers['x-gym-id'] || req.query?.gymId || req.body?.gymId || req.user.gymId || 'gym_alpha_1';
    return next();
  }

  // Gym Owner MUST be constrained strictly to their own gymId from JWT
  if (userRole === ROLES.GYM_OWNER) {
    if (!req.user.gymId) {
      return next(new ForbiddenError('No gym assigned to this Gym Owner account'));
    }

    const requestedGymId = req.headers['x-gym-id'] || req.query?.gymId || req.body?.gymId;
    if (requestedGymId && requestedGymId !== req.user.gymId) {
      return next(new ForbiddenError('Access denied: You cannot view or modify data belonging to another gym'));
    }

    req.gymId = req.user.gymId;
    return next();
  }

  // Member role
  if (userRole === ROLES.MEMBER) {
    req.gymId = req.user.gymId;
    return next();
  }

  next();
};

export default {
  authorize,
  enforceGymIsolation
};

import bcrypt from 'bcryptjs';
import { ROLES } from '../constants/roles.constant.js';

let inMemoryGyms = [];
let inMemoryOwners = [];
const inMemoryTokens = new Map();

export const addInMemoryGym = (gym, owner, temporaryPassword, resetToken) => {
  const existingIdx = inMemoryGyms.findIndex(g => g.id === gym.id || g.slug === gym.slug);
  if (existingIdx >= 0) {
    inMemoryGyms[existingIdx] = { ...inMemoryGyms[existingIdx], ...gym };
  } else {
    inMemoryGyms.unshift(gym);
  }

  if (owner) {
    const ownerIdx = inMemoryOwners.findIndex(o => o.id === owner.id || o.email === owner.email);
    if (ownerIdx >= 0) {
      inMemoryOwners[ownerIdx] = { ...inMemoryOwners[ownerIdx], ...owner };
    } else {
      inMemoryOwners.unshift(owner);
    }
  }

  if (resetToken && owner) {
    registerInMemoryToken(resetToken, {
      userId: owner.id,
      email: owner.email,
      gymId: gym.id,
      gymSlug: gym.slug,
      gymName: gym.name
    });
  }
};

export const registerInMemoryToken = (token, tokenData) => {
  if (!token) return;
  const cleanToken = token.trim();

  // Invalidate previous tokens for this user
  for (const [, val] of inMemoryTokens.entries()) {
    if (val.userId === tokenData.userId || val.email === tokenData.email) {
      val.usedAt = new Date().toISOString();
    }
  }

  inMemoryTokens.set(cleanToken, {
    userId: tokenData.userId,
    email: tokenData.email,
    gymId: tokenData.gymId,
    gymSlug: tokenData.gymSlug,
    gymName: tokenData.gymName,
    usedAt: null,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
  });
};

export const getInMemoryGyms = () => [...inMemoryGyms];

export const findInMemoryGym = (idOrSlug) => {
  if (!idOrSlug) return null;
  const clean = idOrSlug.toLowerCase().trim();
  const hyphenated = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return inMemoryGyms.find(g =>
    g.id === idOrSlug ||
    g.slug.toLowerCase() === clean ||
    g.slug.toLowerCase() === hyphenated ||
    (g.name && g.name.toLowerCase() === clean)
  ) || null;
};

export const findInMemoryOwner = (emailOrGymId) => {
  if (!emailOrGymId) return null;
  const clean = emailOrGymId.toLowerCase().trim();
  return inMemoryOwners.find(o =>
    o.id === emailOrGymId ||
    o.gymId === emailOrGymId ||
    (o.email && o.email.toLowerCase() === clean)
  ) || null;
};

export const updateInMemoryGym = (id, updates) => {
  const idx = inMemoryGyms.findIndex(g => g.id === id || g.slug === id);
  if (idx >= 0) {
    inMemoryGyms[idx] = { ...inMemoryGyms[idx], ...updates, updated_at: new Date().toISOString() };
    return inMemoryGyms[idx];
  }
  return null;
};

export const deleteInMemoryGym = (idOrSlug) => {
  if (!idOrSlug) return false;
  const clean = idOrSlug.toLowerCase().trim();
  const hyphenated = clean.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

  const gymIdx = inMemoryGyms.findIndex(g =>
    g.id === idOrSlug ||
    (g.slug && (g.slug.toLowerCase() === clean || g.slug.toLowerCase() === hyphenated)) ||
    (g.name && g.name.toLowerCase() === clean)
  );

  let gymId = idOrSlug;
  let deleted = false;
  if (gymIdx >= 0) {
    gymId = inMemoryGyms[gymIdx].id;
    inMemoryGyms.splice(gymIdx, 1);
    deleted = true;
  }

  // Remove corresponding owner(s)
  inMemoryOwners = inMemoryOwners.filter(o => o.gymId !== gymId);

  // Invalidate and delete associated tokens
  for (const [key, val] of inMemoryTokens.entries()) {
    if (val.gymId === gymId || val.gymSlug === clean || val.gymSlug === hyphenated) {
      inMemoryTokens.delete(key);
    }
  }

  return deleted;
};

export const validateInMemoryToken = (token) => {
  if (!token) return null;
  const data = inMemoryTokens.get(token.trim());
  if (!data) return null;
  if (data.usedAt) {
    return { valid: false, reason: 'used' };
  }
  if (new Date() > new Date(data.expiresAt)) {
    return { valid: false, reason: 'expired' };
  }
  return { valid: true, data };
};

export const consumeInMemoryToken = async (token, newPassword = null) => {
  if (!token) return { success: false, reason: 'invalid' };
  const data = inMemoryTokens.get(token.trim());
  if (!data) return { success: false, reason: 'invalid' };
  if (data.usedAt) {
    return { success: false, reason: 'used' };
  }
  if (new Date() > new Date(data.expiresAt)) {
    return { success: false, reason: 'expired' };
  }
  data.usedAt = new Date().toISOString();

  // Update owner and gym to 'accepted'
  const owner = inMemoryOwners.find(o => o.id === data.userId || o.email === data.email);
  if (owner) {
    owner.must_change_password = false;
    owner.invitation_status = 'accepted';
    if (newPassword) {
      owner.password_hash = await bcrypt.hash(newPassword, 10);
    }
  }
  const gym = inMemoryGyms.find(g => g.id === data.gymId || g.slug === data.gymSlug);
  if (gym) {
    gym.invitation_status = 'accepted';
    gym.displayInvitationStatus = 'accepted';
    gym.must_change_password = false;
  }
  return {
    success: true,
    email: data.email,
    gymSlug: data.gymSlug,
    gymName: data.gymName
  };
};

export const resetInMemoryOwners = () => {
  inMemoryOwners = [];
  inMemoryTokens.clear();
  inMemoryGyms.forEach(g => {
    g.invitation_status = 'pending';
    g.displayInvitationStatus = 'pending';
    g.owner_name = '';
    g.owner_email = '';
    g.owner = '';
  });
};

export default {
  addInMemoryGym,
  registerInMemoryToken,
  getInMemoryGyms,
  findInMemoryGym,
  findInMemoryOwner,
  updateInMemoryGym,
  deleteInMemoryGym,
  validateInMemoryToken,
  consumeInMemoryToken,
  resetInMemoryOwners
};

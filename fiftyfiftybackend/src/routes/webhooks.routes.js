import { Router } from 'express';
import db from '../config/db.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { findInMemoryOwner, getInMemoryGyms } from '../services/devGymStore.js';

const router = Router();

/**
 * POST /api/webhooks/brevo
 * Handles Brevo webhook delivery events (delivered, opened, click, bounce, soft_bounce, etc.)
 */
router.post('/brevo', async (req, res, next) => {
  try {
    const payload = req.body || {};
    const event = (payload.event || '').toLowerCase();
    const recipientEmail = (payload.email || '').toLowerCase().trim();
    const messageId = payload['message-id'] || payload.messageId;

    console.log(`[Brevo Webhook] Event: "${event}" for <${recipientEmail}> (messageId: ${messageId || 'n/a'})`);

    if (event === 'delivered' && recipientEmail) {
      try {
        await db.query(`
          UPDATE gym_owners
          SET invitation_status = 'delivered', updated_at = CURRENT_TIMESTAMP
          WHERE LOWER(email) = $1 AND invitation_status != 'accepted';
        `, [recipientEmail]);

        await db.query(`
          UPDATE gyms
          SET invitation_status = 'delivered', updated_at = CURRENT_TIMESTAMP
          WHERE LOWER(email) = $1 AND invitation_status != 'accepted';
        `, [recipientEmail]);
      } catch (dbErr) {
        console.warn('[Brevo Webhook DB Notice]:', dbErr.message);
      }

      // Also update dev store if present
      const memOwner = findInMemoryOwner(recipientEmail);
      if (memOwner && memOwner.invitation_status !== 'accepted') {
        memOwner.invitation_status = 'delivered';
      }
      const memGyms = getInMemoryGyms();
      const gym = memGyms.find(g => (g.owner_email || g.email || '').toLowerCase() === recipientEmail);
      if (gym && gym.invitation_status !== 'accepted') {
        gym.invitation_status = 'delivered';
        gym.displayInvitationStatus = 'delivered';
      }
    }

    return ApiResponse.success(res, { received: true, event }, 'Brevo webhook event processed successfully');
  } catch (error) {
    next(error);
  }
});

export default router;

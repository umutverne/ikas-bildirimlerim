import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const sessions = new Map(); // In-memory session store (use Redis in production)

export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

export function createSession(adminUser) {
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  sessions.set(sessionId, {
    adminUserId: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    agencyId: adminUser.agency_id,
    fullName: adminUser.full_name,
    expiresAt
  });

  return { sessionId, expiresAt };
}

export function getSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return null;

  if (new Date() > session.expiresAt) {
    sessions.delete(sessionId);
    return null;
  }

  return session;
}

export function deleteSession(sessionId) {
  sessions.delete(sessionId);
}

export function requireAuth(req, res, next) {
  const sessionId = req.cookies?.session_id;

  if (!sessionId) {
    return res.redirect('/login');
  }

  const session = getSession(sessionId);

  if (!session) {
    res.clearCookie('session_id');
    return res.redirect('/login');
  }

  req.session = session;
  next();
}

export function requireSuperAdmin(req, res, next) {
  if (!req.session || req.session.role !== 'super_admin') {
    return res.status(403).send('Access denied: Super Admin only');
  }
  next();
}

export function requireAgencyAdmin(req, res, next) {
  if (!req.session || !['super_admin', 'agency_admin'].includes(req.session.role)) {
    return res.status(403).send('Access denied: Admin only');
  }
  next();
}

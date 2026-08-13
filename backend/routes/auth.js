import { Router } from 'express';
import { User } from '../models/User.js';
import { hashPassword, verifyPassword, signToken, verifyToken } from '../utils/auth.js';

const router = Router();

// Demo fallback user for running without a database. Remove once DB is available.
const DEMO_EMAIL = 'demo@medichain.com';
const DEMO_PASSWORD = 'medichain123';
const DEMO_FULLNAME = 'Demo User';
const DEMO_ROLE = 'Admin';
const demoUser = {
  _id: '000000000000000000000000',
  fullName: DEMO_FULLNAME,
  email: DEMO_EMAIL,
  role: DEMO_ROLE,
  isActive: true,
  passwordHash: hashPassword(DEMO_PASSWORD),
  avatarInitials: getInitials(DEMO_FULLNAME),
};

// In-memory store to support signup/signin without MongoDB
const memoryUsers = new Map();
let memoryIdCounter = 1;
function createMemoryUser({ fullName, email, passwordHash, role, avatarInitials }) {
  const id = `mem_${Date.now().toString(16)}_${memoryIdCounter++}`;
  const user = {
    _id: id,
    fullName,
    email: String(email).toLowerCase(),
    passwordHash,
    role,
    avatarInitials: avatarInitials || getInitials(fullName),
    isActive: true,
  };
  memoryUsers.set(user.email, user);
  memoryUsers.set(user._id, user);
  return user;
}

// register demo user in memory store
memoryUsers.set(demoUser.email, demoUser);
memoryUsers.set(demoUser._id, demoUser);

async function findUserByEmailSafe(email) {
  const key = String(email).toLowerCase();
  if (memoryUsers.has(key)) return memoryUsers.get(key);
  try {
    const u = await User.findOne({ email: key });
    return u;
  } catch (_) {
    return memoryUsers.get(key) || null;
  }
}

async function findUserByIdSafe(id) {
  if (memoryUsers.has(id)) return memoryUsers.get(id);
  try {
    const u = await User.findById(id);
    return u;
  } catch (_) {
    return memoryUsers.get(id) || null;
  }
}

function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function roleToTitle(role) {
  const titles = {
    Doctor: 'Obstetrician',
    Nurse: 'Triage & Records',
    Pharmacist: 'Clinical Pharmacist',
    Admin: 'Data Manager',
  };
  return titles[role] || role;
}

function publicUser(user) {
  return {
    id: String(user._id),
    name: user.fullName,
    role: String(user.role || '').toLowerCase(),
    title: roleToTitle(user.role || ''),
    avatarInitials: user.avatarInitials || getInitials(user.fullName || ''),
    email: user.email,
  };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, fullName, role } = req.body;
    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const validRoles = ['Doctor', 'Nurse', 'Pharmacist', 'Admin'];
    const normalizedRole =
      validRoles.find((r) => r.toLowerCase() === String(role).toLowerCase()) || 'Nurse';

    const existing = await findUserByEmailSafe(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    let user;
    const pwHash = hashPassword(password);
    try {
      user = await User.create({
        fullName,
        email: email.toLowerCase(),
        passwordHash: pwHash,
        role: normalizedRole,
        avatarInitials: getInitials(fullName),
      });
    } catch (e) {
      // DB not available — create in-memory user
      user = createMemoryUser({
        fullName,
        email: email.toLowerCase(),
        passwordHash: pwHash,
        role: normalizedRole,
        avatarInitials: getInitials(fullName),
      });
    }

    const token = signToken({ userId: user._id.toString(), role: user.role });
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/signin
router.post('/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmailSafe(email);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let ok;
    try {
      ok = verifyPassword(password, user.passwordHash);
    } catch (e) {
      console.error('Password verification error:', e);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!ok) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({ userId: String(user._id), role: user.role });
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/auth/me — validate token and return current user
router.get('/me', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    const token = auth.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    const user = await findUserByIdSafe(payload.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User not found' });
    }

    res.json({ user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

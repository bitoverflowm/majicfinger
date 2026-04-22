import { magic } from '../../lib/magic'
import { setLoginSession } from '../../lib/auth'
import dbConnect from '../../lib/dbConnect'
import User from '../../models/Users'
import {
  DEV_LOGIN_BYPASS_EMAIL as DEV_BYPASS_EMAIL,
  DEV_LOGIN_BYPASS_NAME as DEV_BYPASS_NAME,
  isDevMagicLinkBypassEmail,
  devBypassCanonicalEmail,
  defaultNameForDevBypassEmail,
} from '@/lib/devLoginBypass'

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function userEntitlementScore(user) {
  if (!user) return 0
  const status = String(user.subscriptionStatus || '').toLowerCase()
  let score = 0
  if (user.lifetimeMember) score += 100
  if (status === 'active') score += 50
  if (status === 'trialing') score += 25
  if (user.subscriptionTier) score += 10
  return score
}

async function findUserByEmailInsensitive(email) {
  const trimmed = normalizeEmail(email)
  if (!trimmed) return null
  const candidates = await User.find({
    email: { $regex: new RegExp(`^${escapeRegex(trimmed)}$`, 'i') },
  })
  if (!candidates?.length) return null
  candidates.sort((a, b) => userEntitlementScore(b) - userEntitlementScore(a))
  return candidates[0]
}

/** Dev-only: when DB is unreachable (e.g. VPN blocks MongoDB), set a minimal session so you can still test Polymarket with VPN on */
async function setDevNoDbSession(res) {
  const session = {
    email: DEV_BYPASS_EMAIL,
    name: DEV_BYPASS_NAME,
    userId: 'dev-bypass-no-db',
    issuer: 'dev-bypass-' + DEV_BYPASS_EMAIL,
  }
  await setLoginSession(res, session)
  return res.status(200).send({
    done: true,
    user: { email: DEV_BYPASS_EMAIL, name: DEV_BYPASS_NAME, _id: 'dev-bypass-no-db' },
  })
}

export default async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end()

  const isDev = process.env.NODE_ENV !== 'production'

  try {
    await dbConnect()

    // Dev-only: allow direct login without Magic link for testing (DB reachable)
    const isDevBypass =
      isDev && req.body?.devBypass === true && isDevMagicLinkBypassEmail(req.body?.email)

    if (isDevBypass) {
      const canonicalEmail = devBypassCanonicalEmail(req.body.email)
      if (!canonicalEmail) {
        return res.status(400).send('Invalid dev bypass email')
      }
      const defaultName = defaultNameForDevBypassEmail(canonicalEmail)
      let user = await User.findOne({ email: canonicalEmail })
      if (!user) {
        user = await User.create({
          name: (req.body.name && String(req.body.name).trim()) || defaultName,
          email: canonicalEmail,
          mgkIssuer: 'dev-bypass-' + canonicalEmail,
        })
      }
      const session = {
        email: user.email,
        userId: String(user._id),
        name: user.name,
        issuer: 'dev-bypass-' + canonicalEmail,
      }
      await setLoginSession(res, session)
      return res.status(200).send({ done: true, user })
    }

    const didToken = req.headers.authorization?.slice(7)
    if (!didToken) return res.status(401).send('Missing authorization')
    const metadata = await magic.users.getMetadataByToken(didToken)
    const normalizedEmail = normalizeEmail(metadata.email)
    let user = await findUserByEmailInsensitive(normalizedEmail)

    if (!user) {
      user = await User.create({
        name: req.body.name,
        email: normalizedEmail,
        mgkpublicAddress: metadata.publicAddress,
        confirmedAt: metadata.confirmedAt ? new Date(metadata.confirmedAt) : null,
        lastLoginAt: metadata.lastLoginAt ? new Date(metadata.lastLoginAt) : null,
        mgkIssuer: metadata.issuer,
        metadata: metadata.metadata,
      })
      const newSession = { ...metadata, userId: String(user._id), name: user.name }
      await setLoginSession(res, newSession)
      return res.status(200).send({ done: true, newUser: user })
    }

    const session = { ...metadata, userId: String(user._id), name: user.name }
    await setLoginSession(res, session)
    return res.status(200).send({ done: true, session, user })
  } catch (error) {
    console.error(error)
    // Dev-only: if login failed (e.g. DB unreachable due to VPN), log in anyway so you can test Polymarket with VPN on
    if (isDev) {
      try {
        return await setDevNoDbSession(res)
      } catch (fallbackErr) {
        console.error(fallbackErr)
      }
    }
    res.status(error.status || 500).send(error.message)
  }
}

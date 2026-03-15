import { magic } from '../../lib/magic'
import { setLoginSession } from '../../lib/auth'
import dbConnect from '../../lib/dbConnect'
import User from '../../models/Users'

const DEV_BYPASS_EMAIL = 'rikesh@bitoverflow.org'
const DEV_BYPASS_NAME = 'Rikesh'

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

  const isDev = process.env.NODE_ENV === 'development'

  try {
    await dbConnect()

    // Dev-only: allow direct login without Magic link for testing (DB reachable)
    const isDevBypass = isDev &&
      req.body?.devBypass === true &&
      req.body?.email === DEV_BYPASS_EMAIL

    if (isDevBypass) {
      let user = await User.findOne({ email: DEV_BYPASS_EMAIL })
      if (!user) {
        user = await User.create({
          name: req.body.name || DEV_BYPASS_NAME,
          email: DEV_BYPASS_EMAIL,
          mgkIssuer: 'dev-bypass-' + DEV_BYPASS_EMAIL,
        })
      }
      const session = {
        email: user.email,
        userId: user._id,
        name: user.name,
        issuer: 'dev-bypass-' + DEV_BYPASS_EMAIL,
      }
      await setLoginSession(res, session)
      return res.status(200).send({ done: true, user })
    }

    const didToken = req.headers.authorization?.slice(7)
    if (!didToken) return res.status(401).send('Missing authorization')
    const metadata = await magic.users.getMetadataByToken(didToken)
    let user = await User.findOne({ email: metadata.email })

    if (!user) {
      user = await User.create({
        name: req.body.name,
        email: metadata.email,
        mgkpublicAddress: metadata.publicAddress,
        confirmedAt: metadata.confirmedAt ? new Date(metadata.confirmedAt) : null,
        lastLoginAt: metadata.lastLoginAt ? new Date(metadata.lastLoginAt) : null,
        mgkIssuer: metadata.issuer,
        metadata: metadata.metadata,
      })
      const newSession = { ...metadata, userId: user._id, name: user.name }
      await setLoginSession(res, newSession)
      return res.status(200).send({ done: true, newUser: user })
    }

    const session = { ...metadata, userId: user._id, name: user.name }
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

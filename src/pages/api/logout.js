import { magic } from '../../lib/magic'
import { removeTokenCookie } from '../../lib/auth-cookies'
import { getLoginSession } from '../../lib/auth'

const MAGIC_LOGOUT_MS = 800

export default async function logout(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.setHeader('Allow', 'POST, GET')
    return res.status(405).json({ success: false, message: 'Method not allowed' })
  }

  let session = null
  try {
    session = await getLoginSession(req)
  } catch {
    session = null
  }

  // Clear the cookie first so the client can leave even if Magic is slow.
  removeTokenCookie(res)

  const issuer = session?.issuer
  if (issuer && !String(issuer).startsWith('dev-bypass-')) {
    try {
      await Promise.race([
        magic.users.logoutByIssuer(issuer).catch(() => null),
        new Promise((resolve) => setTimeout(resolve, MAGIC_LOGOUT_MS)),
      ])
    } catch {
      // Local session is already cleared.
    }
  }

  const wantsJson =
    String(req.headers.accept || '').includes('application/json') ||
    req.method === 'POST'

  if (wantsJson) {
    return res.status(200).json({ success: true })
  }

  res.writeHead(302, { Location: '/' })
  res.end()
}

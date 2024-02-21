import { magic } from '../../lib/magic'
import { removeTokenCookie } from '../../lib/auth-cookies'
import { getLoginSession } from '../../lib/auth'

export default async function logout(req, res) {
  try {
    const session = await getLoginSession(req)

    if (session && session.issuer) {
      await magic.users.logoutByIssuer(session.issuer);
      removeTokenCookie(res);
      res.writeHead(302, { Location: '/' });
      res.end();
    } else {
      // Handle the case where the session or issuer is not found
      res.status(400).send("Session not found or issuer missing");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
}
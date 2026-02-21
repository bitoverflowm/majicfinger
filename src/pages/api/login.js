import { magic } from '../../lib/magic'
import { setLoginSession } from '../../lib/auth'
import dbConnect from '../../lib/dbConnect'
import User from '../../models/Users'

const DEV_BYPASS_EMAIL = 'rikesh@bitoverflow.org'

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    
    await dbConnect()

    // Dev-only: allow direct login without Magic link for testing
    const isDevBypass = process.env.NODE_ENV === 'development' &&
      req.body?.devBypass === true &&
      req.body?.email === DEV_BYPASS_EMAIL

    if (isDevBypass) {
      let user = await User.findOne({ email: DEV_BYPASS_EMAIL })
      if (!user) {
        user = await User.create({
          name: req.body.name || 'Rikesh',
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
      try {
        user = await User.create({
          name: req.body.name,
          email: metadata.email,
          mgkpublicAddress: metadata.publicAddress,
          confirmedAt: metadata.confirmedAt ? new Date(metadata.confirmedAt) : null,
          lastLoginAt: metadata.lastLoginAt ? new Date(metadata.lastLoginAt) : null,
          mgkIssuer: metadata.issuer,
          metadata: metadata.metadata,
        });

        // If the creation is successful, user will be the created document
        // No need for the previous check as an unsuccessful creation would have thrown an error

        let newSession = { ...metadata, userId: user._id, name: user.name};
        await setLoginSession(res, newSession);
        res.status(200).send({ done: true, newUser: user });
      } catch (error) {
        console.error(error, "Error in user creation or session setting");
        res.status(500).send("Internal Server Error");
      }
    } else {
      // User found in the database
      const session = { ...metadata, userId: user._id };
      await setLoginSession(res, session);
      res.status(200).send({ done: true, session, 'user': user });
    }
  } catch (error) {
    console.error(error);
    res.status(error.status || 500).send(error.message);
  }
}

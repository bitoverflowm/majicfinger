import { magic } from '../../lib/magic'
import { setLoginSession } from '../../lib/auth'
import dbConnect from '../../lib/dbConnect'
import User from '../../models/Users'

export default async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).end();
    await dbConnect()

    const didToken = req.headers.authorization.slice(7)
    const metadata = await magic.users.getMetadataByToken(didToken)
    let user = await User.findOne({ email: metadata.email })

    if (!user) {
      // User not found in the database, create a new user
      const userUrl = process.env.NODE_ENV === 'development' 
                      ? 'http://localhost:3000/api/users/' 
                      : 'https://www.lych3e.com/api/users/';
      try {
        const createUserRes = await fetch(userUrl, {
          method: 'POST',
          headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
          },
          body: JSON.stringify({
              "name": req.body.name,
              "email": metadata.email,
              "mgkpublicAddress": metadata.publicAddress,
              "confirmedAt": metadata.confirmedAt ? new Date(metadata.confirmedAt) : null,
              "lastLoginAt": metadata.lastLoginAt ? new Date(metadata.lastLoginAt) : null,
              "mgkIssuer": metadata.issuer,
              "metadata": metadata.metadata,
          }),
        });

        if(!createUserRes.ok) {
          throw new Error('Failed to add user to db');
        }

        user = await createUserRes.json();
        if (!user || !user.data || !user.data._id) {
          throw new Error('Invalid user data received from user creation API');
        }
        let newUser = await User.findOne({ email: metadata.email })
        let newSession = { ...metadata, userId: newUser._id, name: newUser.name};
        await setLoginSession(res, newSession);
        res.status(200).send({ done: true, newUser });
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

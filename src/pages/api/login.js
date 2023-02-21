import { magic } from '@/lib/magic'
import { setLoginSession } from '@/lib/auth'

export default async (req, res) => {
  try {
    if (req.method !=='POST') return res.status(405).end();
    
    const didToken = req.headers.authorization.slice(7)
    const metadata = await magic.users.getMetadataByToken(didToken)
    const session = { ...metadata }

    await setLoginSession(res, session)

    res.status(200).send({ done: true })
  } catch (error) {
    res.status(error.status || 500).send(error.message)
  }
}
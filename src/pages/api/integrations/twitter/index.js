import { fetchTwitterUserByHandle } from './twitter_helper';

export default async (req, res) => {
    try {
        if (req.method !== 'GET') return res.status(405).end();
      
        //await dbConnect()
        //let user = await User.findOne({ email: metadata.email })

        // Extract the "handle" from the URL query parameters
        const { handle } = req.query;

        if (!handle) {
            return res.status(400).send('Missing handle parameter');
        }

        let user_data = await fetchTwitterUserByHandle(handle);
        res.status(200).send({ done: true, userData: user_data });
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).send(error.message);
    }
  }
  
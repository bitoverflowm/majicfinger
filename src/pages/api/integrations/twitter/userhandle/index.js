import { fetch_twitter_user_by_handle } from '../twitter_helper';

export default async (req, res) => {
    try {
        if (req.method !== 'POST') return res.status(405).end();
        //TODO: add a counter to track number of requests made by everyeon
        //await dbConnect()
        //let user = await User.findOne({ email: metadata.email })

        // Extract the "handle" from the URL query parameters
        // Extract data from the request body
        const { handle } = req.query;
        const { userFields, tweetFields, expansions } = req.body;

        if (!handle) {
            return res.status(400).send('Missing handle parameter');
        }

        let user_data = await fetch_twitter_user_by_handle(handle, userFields.join(','), tweetFields.join(','), expansions.join(','));
        // Destructure and restructure the user_data object
        const { public_metrics, ...rest } = user_data.data;
        const userData = { ...rest, ...public_metrics };

        res.status(200).send({ done: true, userData: userData });
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).send(error.message);
    }
  }
  
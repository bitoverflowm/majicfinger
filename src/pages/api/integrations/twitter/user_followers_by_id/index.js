import { fetch_twitter_followers_by_id } from '../twitter_helper';

export default async (req, res) => {
    try {
        if (req.method !== 'POST') return res.status(405).end();
        //TODO: add a counter to track number of requests made by everyeon
        //await dbConnect()
        //let user = await User.findOne({ email: metadata.email })

        // Extract the "handle" from the URL query parameters
        // Extract data from the request body
        const { handleId } = req.query;
        const { userFields, thirdParam, expansions } = req.body;

        if (!handleId) {
            return res.status(400).send('Missing handle parameter');
        }

        let user_data = await fetch_twitter_followers_by_id(handleId, userFields.join(','), thirdParam.join(','), expansions.join(','));
        // Destructure and restructure the user_data object
        // Map over the data array and restructure each item
        console.log(user_data)
        const modifiedData = user_data['_realData'].data.map(item => {
            const { public_metrics, ...rest } = item;
            return { ...rest, ...public_metrics };
        });

        const rateLimit = user_data['_rateLimit']
        const resultCount = user_data['_realData'].meta

        console.log('new: ', modifiedData)

        res.status(200).send({ done: true, userData: modifiedData, rateLimit: rateLimit, resultCount: resultCount});
    } catch (error) {
      console.error(error);
      res.status(error.status || 500).send(error.message);
    }
  }
  
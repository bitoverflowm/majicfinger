
export default async (req, res) => {
    const { date } = req.query;
    const url = date ? `https://tradestie.com/api/v1/apps/reddit?date=${date}` : 'https://tradestie.com/api/v1/apps/reddit';
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json();
            res.status(200).json(data);
        } else {
            res.status(response.status).json({ message: 'WallStreetBets User Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
  }
  
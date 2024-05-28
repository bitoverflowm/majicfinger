export default async (req, res) => {
    console.log("starting scrape");
    const { target } = req.query;
    const url = 'https://api.microlink.io';
    const params = new URLSearchParams({
        url: target,
        'screenshot.fullPage': 'true'
    });
    console.log('url: ', `${url}?${params}`);
    
    try {
        const response = await fetch(`${url}?${params}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.ok) {
            const data = await response.json();
            res.status(200).json(data);
        } else {
            res.status(response.status).json({ message: 'Screenshot capture failed' });
        }
    } catch (error) {
        console.log("error: ", error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}
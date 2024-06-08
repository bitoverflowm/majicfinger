export default async (req, res) => {
    const { date } = req.query;
    const apiKey = process.env.GECKO_KEY;
    const url = `https://api.coingecko.com/api/v3/search/trending?x_cg_demo_api_key=${apiKey}`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { coins } = await response.json();

            const flattenedData = coins.map(({ item }) => {
                const {
                    id,
                    coin_id,
                    name,
                    symbol,
                    market_cap_rank,
                    thumb,
                    small,
                    large,
                    slug,
                    data: {
                        price,
                        price_btc,
                        market_cap,
                        market_cap_btc,
                        total_volume,
                        total_volume_btc,
                        sparkline,
                    }
                } = item;

                return {
                    id,
                    coin_id,
                    name,
                    symbol,
                    market_cap_rank,
                    thumb,
                    small,
                    large,
                    slug,
                    price,
                    price_btc,
                    market_cap,
                    market_cap_btc,
                    total_volume,
                    total_volume_btc,
                    sparkline,
                };
            });

            res.status(200).json(flattenedData);
        } else {
            res.status(response.status).json({ message: 'Trending CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

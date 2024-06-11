
export default async (req, res) => {
    const { query } = req.query
    const apiKey = process.env.GECKO_KEY
    let url

    switch(query){
        case 'trendingCoins':
            url = `https://api.coingecko.com/api/v3/search/trending?x_cg_demo_api_key=${apiKey}`
            return await trendingCoins(url, res)
        case 'trendingNFTs':
            url = `https://api.coingecko.com/api/v3/search/trending?x_cg_demo_api_key=${apiKey}`
            return await trendingNFTs(url, res)
        case 'trendingCategories':
            url = `https://api.coingecko.com/api/v3/search/trending?x_cg_demo_api_key=${apiKey}`
            return await trendingCategories(url, res)
        case 'supportedCurrenciesList':
            url = `https://api.coingecko.com/api/v3/simple/supported_vs_currencies?x_cg_demo_api_key=${apiKey}`
            return await supportedCurrenciesList(url, res)
        case 'coinListId':
            url = `https://api.coingecko.com/api/v3/coins/list?x_cg_demo_api_key=${apiKey}`
            return await coinListId(url, res)
        case 'coinMarketData':
            url = `https://api.coingecko.com/api/v3/coins/markets?x_cg_demo_api_key=${apiKey}`
            return await coinMarketData(url, res)
        case 'coinCategoriesMarketData':
            url = `https://api.coingecko.com/api/v3/coins/categories?x_cg_demo_api_key=${apiKey}`
            return await coinCategoriesMarketData(url, res)
        case 'exchangesData':
            url = `https://api.coingecko.com/api/v3/exchanges?x_cg_demo_api_key=${apiKey}`
            return await exchangesData(url, res)
        default:
            return res.status(400).json({ message: 'Invalid query' });
            break;
    }
};


const trendingCoins = async (url, res) => {
    try{
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

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

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Trending CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }


}

const trendingNFTs = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { nfts } = await response.json();

            const flattenedData = nfts.map(({ item }) => {
                const {
                    id,
                    name,
                    symbol,
                    thumb,
                    nft_contract_id,
                    native_currency_symbol,
                    floor_price_in_native_currency,
                    floor_price_24h_percentage_change,
                    data: {
                        floor_price,
                        floor_price_in_usd_24h_percentage_change,
                        h24_volume,
                        h24_average_sale_price,
                        sparkline,
                        content,
                    } = {},
                } = item;

                return {
                    id,
                    name,
                    symbol,
                    thumb,
                    nft_contract_id,
                    native_currency_symbol,
                    floor_price_in_native_currency,
                    floor_price_24h_percentage_change,
                    floor_price,
                    floor_price_in_usd_24h_percentage_change,
                    h24_volume,
                    h24_average_sale_price,
                    sparkline,
                    content,
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Trending NFT data pull failed' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const trendingCategories = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { categories } = await response.json();

            const flattenedData = categories.map(({ item }) => {
                const {
                    id,
                    name,
                    market_cap_1h_change,
                    slug,
                    coins_count,
                    data: {
                        market_cap,
                        market_cap_btc,
                        total_volume,
                        total_volume_btc,
                        market_cap_change_percentage_24h,
                        sparkline,
                    } = {},
                } = item;

                return {
                    id,
                    name,
                    market_cap_1h_change,
                    slug,
                    coins_count,
                    market_cap,
                    market_cap_btc,
                    total_volume,
                    total_volume_btc,
                    market_cap_change_percentage_24h,
                    sparkline,
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Trending categories data pull failed' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const supportedCurrenciesList = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const coins = await response.json();
            const formattedData = coins.map(coin => ({
                coin_name: coin // Assuming the array contains just coin names as strings
            }));
            
            return res.status(200).json(formattedData);
        } else {
            return res.status(response.status).json({ message: 'Supported currencies data pull failed' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const coinListId = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const coins = await response.json();

            const flattenedData = coins.map((coin) => {
                const {
                    id,
                    symbol,
                    name,
                    platforms = {},
                } = coin;

                // Flattening the platforms object into individual key-value pairs
                const platformEntries = Object.entries(platforms).reduce((acc, [platform, address]) => {
                    acc[`platform_${platform}`] = address;
                    return acc;
                }, {});

                return {
                    id,
                    symbol,
                    name,
                    ...platformEntries,
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Coin list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const coinMarketData = async (url, res) => {
    try {
        console.log("hello")
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        console.log("response: ", response)

        if (response.status === 200) {
            console.log("success")
            const coins = await response.json()
            console.log("coins: ", coins)
            return res.status(200).json(coins);
        } else {
            return res.status(response.status).json({ message: 'Coin list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const coinCategoriesMarketData = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const categories = await response.json();

            const flattenedData = categories.map((category) => {
                const {
                    id,
                    name,
                    market_cap,
                    market_cap_change_24h,
                    content,
                    top_3_coins,
                    volume_24h,
                    updated_at,
                } = category;

                return {
                    id,
                    name,
                    market_cap,
                    market_cap_change_24h,
                    content,
                    top_coin_1: top_3_coins[0] || null,
                    top_coin_2: top_3_coins[1] || null,
                    top_coin_3: top_3_coins[2] || null,
                    volume_24h,
                    updated_at,
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Coin categories market data pull failed' });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const exchangesData = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const exchanges = await response.json()
            return res.status(200).json(exchanges);
        } else {
            return res.status(response.status).json({ message: 'Coin list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};
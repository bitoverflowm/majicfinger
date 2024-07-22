
export default async (req, res) => {
    const { query, search, network, addresses } = req.query
    let url
    switch(query){        
        case 'networks':
            url = `https://api.geckoterminal.com/api/v2/networks`
            return await networks(url, res)
        case 'trendingPools':
            url = `https://api.geckoterminal.com/api/v2/networks/trending_pools`;
            return await trendingPools(url, res);
        case 'newPools':
            url = `https://api.geckoterminal.com/api/v2/networks/new_pools`;
            return await newPools(url, res);
        case 'recentlyUpdatedTokens':
            url = `https://api.geckoterminal.com/api/v2/tokens/info_recently_updates`;
            return await recentlyUpdatedTokens(url, res);
        case 'searchPools':
            if (!search) {
                return res.status(400).json({ message: 'Missing search parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/search/pools?query=${search}`;
            return await searchPools(url, res);        
        case 'tokenPriceUSD':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/simple/networks/${network}/token_price/${addresses}`;
            return await tokenPriceUSD(url, res);
        default:
            return res.status(400).json({ message: 'Invalid query parameter' });
    }
};


const networks = async (url, res) => {
    try{
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        })

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map(( val) => {
                const {
                    id,
                    type,
                    attributes: {
                        name,
                        coingecko_asset_platform_id
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                    coingecko_asset_platform_id
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Supported Networks CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const trendingPools = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map((val) => {
                const {
                    id,
                    type,
                    attributes: {
                        name,
                        address,
                        base_token_price_usd,
                        quote_token_price_usd,
                        base_token_price_native_currency,
                        quote_token_price_native_currency,
                        base_token_price_quote_token,
                        quote_token_price_base_token,
                        pool_created_at,
                        reserve_in_usd,
                        fdv_usd,
                        market_cap_usd,
                        price_change_percentage,
                        transactions,
                        volume_usd
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                    address,
                    base_token_price_usd: roundedTo4Decimals(base_token_price_usd),
                    quote_token_price_usd: roundedTo4Decimals(quote_token_price_usd),
                    base_token_price_native_currency: roundedTo4Decimals(base_token_price_native_currency),
                    quote_token_price_native_currency: roundedTo4Decimals(quote_token_price_native_currency),
                    base_token_price_quote_token: roundedTo4Decimals(base_token_price_quote_token),
                    quote_token_price_base_token: roundedTo4Decimals(quote_token_price_base_token),
                    pool_created_at,
                    reserve_in_usd: roundedTo4Decimals(reserve_in_usd),
                    fdv_usd,
                    market_cap_usd,
                    price_change_percentage_day: price_change_percentage ? {
                        day: price_change_percentage.day,
                        week: price_change_percentage.week,
                        month: price_change_percentage.month
                    } : {},
                    transactions: transactions ? {
                        count: transactions.count,
                        volume: transactions.volume
                    } : {},
                    volume_usd: volume_usd ? {
                        day: volume_usd.day,
                        week: volume_usd.week,
                        month: volume_usd.month
                    } : {}
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Trending Pools CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const newPools = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map((val) => {
                const {
                    id,
                    type,
                    attributes: {
                        name,
                        address,
                        base_token_price_usd,
                        quote_token_price_usd,
                        base_token_price_native_currency,
                        quote_token_price_native_currency,
                        base_token_price_quote_token,
                        quote_token_price_base_token,
                        pool_created_at,
                        reserve_in_usd,
                        fdv_usd,
                        market_cap_usd,
                        price_change_percentage,
                        transactions,
                        volume_usd
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                    address,
                    base_token_price_usd: roundedTo4Decimals(base_token_price_usd),
                    quote_token_price_usd: roundedTo4Decimals(quote_token_price_usd),
                    base_token_price_native_currency: roundedTo4Decimals(base_token_price_native_currency),
                    quote_token_price_native_currency: roundedTo4Decimals(quote_token_price_native_currency),
                    base_token_price_quote_token: roundedTo4Decimals(base_token_price_quote_token),
                    quote_token_price_base_token: roundedTo4Decimals(quote_token_price_base_token),
                    pool_created_at,
                    reserve_in_usd: roundedTo4Decimals(reserve_in_usd),
                    fdv_usd,
                    market_cap_usd,
                    price_change_percentage_day: price_change_percentage ? {
                        day: price_change_percentage.day,
                        week: price_change_percentage.week,
                        month: price_change_percentage.month
                    } : {},
                    transactions: transactions ? {
                        count: transactions.count,
                        volume: transactions.volume
                    } : {},
                    volume_usd: volume_usd ? {
                        day: volume_usd.day,
                        week: volume_usd.week,
                        month: volume_usd.month
                    } : {}
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'New Pools CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const recentlyUpdatedTokens = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map((val) => {
                const {
                    id,
                    type,
                    attributes: {
                        name,
                        address,
                        base_token_price_usd,
                        quote_token_price_usd,
                        base_token_price_native_currency,
                        quote_token_price_native_currency,
                        base_token_price_quote_token,
                        quote_token_price_base_token,
                        pool_created_at,
                        reserve_in_usd,
                        fdv_usd,
                        market_cap_usd,
                        price_change_percentage,
                        transactions,
                        volume_usd
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                    address,
                    base_token_price_usd: roundedTo4Decimals(base_token_price_usd),
                    quote_token_price_usd: roundedTo4Decimals(quote_token_price_usd),
                    base_token_price_native_currency: roundedTo4Decimals(base_token_price_native_currency),
                    quote_token_price_native_currency: roundedTo4Decimals(quote_token_price_native_currency),
                    base_token_price_quote_token: roundedTo4Decimals(base_token_price_quote_token),
                    quote_token_price_base_token: roundedTo4Decimals(quote_token_price_base_token),
                    pool_created_at,
                    reserve_in_usd: roundedTo4Decimals(reserve_in_usd),
                    fdv_usd,
                    market_cap_usd,
                    price_change_percentage_day: price_change_percentage ? {
                        day: price_change_percentage.day,
                        week: price_change_percentage.week,
                        month: price_change_percentage.month
                    } : {},
                    transactions: transactions ? {
                        count: transactions.count,
                        volume: transactions.volume
                    } : {},
                    volume_usd: volume_usd ? {
                        day: volume_usd.day,
                        week: volume_usd.week,
                        month: volume_usd.month
                    } : {}
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'New Pools CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const searchPools = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map((val) => {
                const {
                    id,
                    type,
                    attributes: {
                        name,
                        address,
                        base_token_price_usd,
                        quote_token_price_usd,
                        base_token_price_native_currency,
                        quote_token_price_native_currency,
                        base_token_price_quote_token,
                        quote_token_price_base_token,
                        pool_created_at,
                        reserve_in_usd,
                        fdv_usd,
                        market_cap_usd,
                        price_change_percentage,
                        transactions,
                        volume_usd
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                    address,
                    base_token_price_usd: roundedTo4Decimals(base_token_price_usd),
                    quote_token_price_usd: roundedTo4Decimals(quote_token_price_usd),
                    base_token_price_native_currency: roundedTo4Decimals(base_token_price_native_currency),
                    quote_token_price_native_currency: roundedTo4Decimals(quote_token_price_native_currency),
                    base_token_price_quote_token: roundedTo4Decimals(base_token_price_quote_token),
                    quote_token_price_base_token: roundedTo4Decimals(quote_token_price_base_token),
                    pool_created_at,
                    reserve_in_usd: roundedTo4Decimals(reserve_in_usd),
                    fdv_usd,
                    market_cap_usd,
                    price_change_percentage: price_change_percentage ? {
                        day: price_change_percentage.day,
                        week: price_change_percentage.week,
                        month: price_change_percentage.month
                    } : {},
                    transactions: transactions ? {
                        count: transactions.count,
                        volume: transactions.volume
                    } : {},
                    volume_usd: volume_usd ? {
                        day: volume_usd.day,
                        week: volume_usd.week,
                        month: volume_usd.month
                    } : {}
                };
            });
            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Search Pools CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const tokenPriceUSD = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const { token_prices } = data.attributes;

            const tokenPricesArray = Object.keys(token_prices).map(key => ({
                address: key,
                "Token Price (USD)": Number(parseFloat(token_prices[key]).toFixed(4))
            }));

            return res.status(200).json(tokenPricesArray);
        } else {
            return res.status(response.status).json({ message: 'Token Price USD CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};




const roundedTo4Decimals = (value) => {
    return Number(parseFloat(value).toFixed(4));
};

export default async (req, res) => {
    const { query, search, network, addresses, dex, timeframe, minVolume } = req.query
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
        case 'dexes':
            if (!network) {
                return res.status(400).json({ message: 'Missing network parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/dexes`;
            return await dexes(url, res);
        case 'networkTrendingPools':
            if (!network) {
                return res.status(400).json({ message: 'Missing network parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools`;
            return await genericPools(url, res);
        case 'specificPool':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${addresses}`;
            return await specificPool(url, res);
        case 'multiplePools':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/multi/${addresses}`;
            return await multiplePools(url, res);
        case 'topPools':
            if (!network) {
                return res.status(400).json({ message: 'Missing network parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools`;
            return await multiplePools(url, res);
        case 'dexTopPools':
            if (!dex) {
                return res.status(400).json({ message: 'Missing dex parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/dexes/${dex}/pools`;
            return await multiplePools(url, res);        
        case 'newPoolsNetwork':
            if (!network) {
                return res.status(400).json({ message: 'Missing network parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/new_pools`;
            return await multiplePools(url, res);        
        case 'topPoolsByToken':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${addresses}/pools`;
            return await multiplePools(url, res);
        case 'specificToken':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${addresses}`;
            return await specificPool(url, res);
        case 'multipleTokens':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/multi/${addresses}`;
            return await multiplePools(url, res);
        case 'singleTokenInfo':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/tokens/${addresses}/info`;
            return await singleTokenInfo(url, res);
        case 'poolsTokenInfo':
            if (!network || !addresses) {
                return res.status(400).json({ message: 'Missing network or addresses parameter' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${addresses}/info`;
            return await poolTokenInfo(url, res);
        case 'ohlcvs':
            if(!network || !addresses || !timeframe) {
                return res.status(400).json({ message: 'Missing network, addresses, or timeframe paramete' });
            }
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${addresses}/ohlcv/${timeframe}`;
            return await ohlcvs(url, res);
        case 'trades':
            if(!network || !addresses) {
                return res.status(400).json({ message: 'Missing network, addresses, or timeframe paramete' });
            }
            let minVolumeParam = minVolume ? `trade_volume_in_usd_greater_than=${minVolume}` : 'trade_volume_in_usd_greater_than=0';
            url = `https://api.geckoterminal.com/api/v2/networks/${network}/pools/${addresses}/trades?${minVolumeParam}`;
            return await trades(url, res);
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

const dexes = async (url, res) => {
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
                    }
                } = val;

                return {
                    id,
                    type,
                    name,
                };
            });
            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Supported Dexes CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


//pools

const genericPools = async (url, res) => {
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

const specificPool = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();
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
                },
                relationships: {
                    base_token,
                    quote_token,
                    dex
                }
            } = data;

            const flattenedData = {
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
                price_change_percentage_m5: price_change_percentage ? price_change_percentage.m5 : null,
                price_change_percentage_h1: price_change_percentage ? price_change_percentage.h1 : null,
                price_change_percentage_h6: price_change_percentage ? price_change_percentage.h6 : null,
                price_change_percentage_h24: price_change_percentage ? price_change_percentage.h24 : null,
                transactions_m5_buys: transactions ? transactions.m5.buys : null,
                transactions_m5_sells: transactions ? transactions.m5.sells : null,
                transactions_m5_buyers: transactions ? transactions.m5.buyers : null,
                transactions_m5_sellers: transactions ? transactions.m5.sellers : null,
                transactions_m15_buys: transactions ? transactions.m15.buys : null,
                transactions_m15_sells: transactions ? transactions.m15.sells : null,
                transactions_m15_buyers: transactions ? transactions.m15.buyers : null,
                transactions_m15_sellers: transactions ? transactions.m15.sellers : null,
                transactions_m30_buys: transactions ? transactions.m30.buys : null,
                transactions_m30_sells: transactions ? transactions.m30.sells : null,
                transactions_m30_buyers: transactions ? transactions.m30.buyers : null,
                transactions_m30_sellers: transactions ? transactions.m30.sellers : null,
                transactions_h1_buys: transactions ? transactions.h1.buys : null,
                transactions_h1_sells: transactions ? transactions.h1.sells : null,
                transactions_h1_buyers: transactions ? transactions.h1.buyers : null,
                transactions_h1_sellers: transactions ? transactions.h1.sellers : null,
                transactions_h24_buys: transactions ? transactions.h24.buys : null,
                transactions_h24_sells: transactions ? transactions.h24.sells : null,
                transactions_h24_buyers: transactions ? transactions.h24.buyers : null,
                transactions_h24_sellers: transactions ? transactions.h24.sellers : null,
                volume_usd_m5: volume_usd ? volume_usd.m5 : null,
                volume_usd_h1: volume_usd ? volume_usd.h1 : null,
                volume_usd_h6: volume_usd ? volume_usd.h6 : null,
                volume_usd_h24: volume_usd ? volume_usd.h24 : null,
                base_token_id: base_token ? base_token.data.id : null,
                quote_token_id: quote_token ? quote_token.data.id : null,
                dex_id: dex ? dex.data.id : null
            };

            return res.status(200).json([flattenedData]);
        } else {
            return res.status(response.status).json({ message: 'Specific Pool CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const multiplePools = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();
            const flattenedData = data.map((pool) => {
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
                    },
                    relationships: {
                        base_token,
                        quote_token,
                        dex
                    }
                } = pool;

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
                    price_change_percentage_m5: price_change_percentage ? price_change_percentage.m5 : null,
                    price_change_percentage_h1: price_change_percentage ? price_change_percentage.h1 : null,
                    price_change_percentage_h6: price_change_percentage ? price_change_percentage.h6 : null,
                    price_change_percentage_h24: price_change_percentage ? price_change_percentage.h24 : null,
                    transactions_m5_buys: transactions ? transactions.m5.buys : null,
                    transactions_m5_sells: transactions ? transactions.m5.sells : null,
                    transactions_m5_buyers: transactions ? transactions.m5.buyers : null,
                    transactions_m5_sellers: transactions ? transactions.m5.sellers : null,
                    transactions_m15_buys: transactions ? transactions.m15.buys : null,
                    transactions_m15_sells: transactions ? transactions.m15.sells : null,
                    transactions_m15_buyers: transactions ? transactions.m15.buyers : null,
                    transactions_m15_sellers: transactions ? transactions.m15.sellers : null,
                    transactions_m30_buys: transactions ? transactions.m30.buys : null,
                    transactions_m30_sells: transactions ? transactions.m30.sells : null,
                    transactions_m30_buyers: transactions ? transactions.m30.buyers : null,
                    transactions_m30_sellers: transactions ? transactions.m30.sellers : null,
                    transactions_h1_buys: transactions ? transactions.h1.buys : null,
                    transactions_h1_sells: transactions ? transactions.h1.sells : null,
                    transactions_h1_buyers: transactions ? transactions.h1.buyers : null,
                    transactions_h1_sellers: transactions ? transactions.h1.sellers : null,
                    transactions_h24_buys: transactions ? transactions.h24.buys : null,
                    transactions_h24_sells: transactions ? transactions.h24.sells : null,
                    transactions_h24_buyers: transactions ? transactions.h24.buyers : null,
                    transactions_h24_sellers: transactions ? transactions.h24.sellers : null,
                    volume_usd_m5: volume_usd ? volume_usd.m5 : null,
                    volume_usd_h1: volume_usd ? volume_usd.h1 : null,
                    volume_usd_h6: volume_usd ? volume_usd.h6 : null,
                    volume_usd_h24: volume_usd ? volume_usd.h24 : null,
                    base_token_id: base_token ? base_token.data.id : null,
                    quote_token_id: quote_token ? quote_token.data.id : null,
                    dex_id: dex ? dex.data.id : null
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Multi Pool CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

//tokenIngo

const singleTokenInfo = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();
            const {
                id,
                type,
                attributes: {
                    address,
                    name,
                    symbol,
                    decimals,
                    image_url,
                    coingecko_coin_id,
                    websites,
                    description,
                    gt_score,
                    discord_url,
                    telegram_handle,
                    twitter_handle
                }
            } = data;

            const flattenedData = {
                id,
                type,
                address,
                name,
                symbol,
                decimals,
                image_url,
                coingecko_coin_id,
                websites,
                description,
                gt_score,
                discord_url,
                telegram_handle,
                twitter_handle
            };

            return res.status(200).json([flattenedData]);
        } else {
            return res.status(response.status).json({ message: 'Single Token Info CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

const poolTokenInfo = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map(token => {
                const {
                    id,
                    type,
                    attributes: {
                        address,
                        name,
                        symbol,
                        decimals,
                        image_url,
                        coingecko_coin_id,
                        websites,
                        description,
                        gt_score,
                        discord_url,
                        telegram_handle,
                        twitter_handle
                    }
                } = token;

                return {
                    id,
                    type,
                    address,
                    name,
                    symbol,
                    decimals,
                    image_url,
                    coingecko_coin_id,
                    websites,
                    description,
                    gt_score,
                    discord_url,
                    telegram_handle,
                    twitter_handle
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Single Token Info CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

//ohlcv

const ohlcvs = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data, meta } = await response.json();

            const { ohlcv_list } = data.attributes;
            const { base, quote } = meta;

            const flattenedData = ohlcv_list.map(ohlcv => ({
                id: data.id,
                datetime: ohlcv[0],
                open: ohlcv[1],
                high: ohlcv[2],
                low: ohlcv[3],
                close: ohlcv[4],
                volume: ohlcv[5],
                base_symbol: base.symbol,
                base_coingecko_id: base.coingecko_coin_id,
                quote_symbol: quote.symbol,
                quote_coingecko_id: quote.coingecko_coin_id
            }));

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Pool Token Info CoinGecko Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}


const trades = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = data.map(trade => {
                const {
                    id,
                    attributes: {
                        block_number,
                        tx_hash,
                        tx_from_address,
                        from_token_amount,
                        to_token_amount,
                        price_from_in_currency_token,
                        price_to_in_currency_token,
                        price_from_in_usd,
                        price_to_in_usd,
                        block_timestamp,
                        kind,
                        volume_in_usd,
                        from_token_address,
                        to_token_address
                    }
                } = trade;

                return {
                    id,
                    block_number,
                    tx_hash,
                    tx_from_address,
                    from_token_amount: parseFloat(from_token_amount),
                    to_token_amount: parseFloat(to_token_amount),
                    price_from_in_currency_token: parseFloat(price_from_in_currency_token),
                    price_to_in_currency_token: parseFloat(price_to_in_currency_token),
                    price_from_in_usd: parseFloat(price_from_in_usd),
                    price_to_in_usd: parseFloat(price_to_in_usd),
                    block_timestamp,
                    kind,
                    volume_in_usd: parseFloat(volume_in_usd),
                    from_token_address,
                    to_token_address
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Trades data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}




const roundedTo4Decimals = (value) => {
    return Number(parseFloat(value).toFixed(4));
};
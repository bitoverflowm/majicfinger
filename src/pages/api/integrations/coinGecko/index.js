
export default async (req, res) => {
    const { query, vs_currency, coin, date } = req.query
    const apiKey = process.env.GECKO_KEY
    let url

    switch(query){
        case 'coinListMarketData':
            if (!vs_currency) {
                return res.status(400).json({ message: 'Missing vs_currency parameter' });
            }
            url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${vs_currency}&x_cg_demo_api_key=${apiKey}`;
            return await flatFormat(url, res);
        case 'coinDataById':
            if (!coin) {
                return res.status(400).json({ message: 'Missing coin id parameter' });
            }
            url = `https://api.coingecko.com/api/v3/coins/${coin}?x_cg_demo_api_key=${apiKey}`;
            return await singleResponse(url, res);
        case 'coinTickersById':
            if (!coin) {
                return res.status(400).json({ message: 'Missing coin id parameter' });
            }
            url = `https://api.coingecko.com/api/v3/coins/${coin}/tickers?x_cg_demo_api_key=${apiKey}`;
            return await coinTickersFormat(url, res);
        case 'coinHistoricalDataById':
            if (!coin || !date) {
                return res.status(400).json({ message: 'Missing coin id parameter' });
            }
            url = `https://api.coingecko.com/api/v3/coins/${coin}/history?date=${date}&localization=false&x_cg_demo_api_key=${apiKey}`;
            return await singleCoinHistoryFormat(url, res);


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
        case 'globalMarketData':
            url = `https://api.coingecko.com/api/v3/global?x_cg_demo_api_key=${apiKey}`
            return await globalMarketData(url, res)
        case 'globalDefiMarketData':
            url = `https://api.coingecko.com/api/v3/global/decentralized_finance_defi?x_cg_demo_api_key=${apiKey}`
            return await globalDefiMarketData(url, res)
        case 'exchangesData':
            url = `https://api.coingecko.com/api/v3/exchanges?x_cg_demo_api_key=${apiKey}`
            return await exchangesData(url, res)
        case 'derivativesTickers':
            url = `https://api.coingecko.com/api/v3/derivatives?x_cg_demo_api_key=${apiKey}`
            return await derivativesTickers(url, res)
        case 'derivativesExchanges':
            url = ` https://api.coingecko.com/api/v3/derivatives/exchanges?x_cg_demo_api_key=${apiKey}`
            return await derivativesExchanges(url, res)
        case 'derivativesExchangesList':
            url = `https://api.coingecko.com/api/v3/derivatives/exchanges/list?x_cg_demo_api_key=${apiKey}`
            return await derivativesExchangesList(url, res)
        case 'nftsList':
            url = `https://api.coingecko.com/api/v3/nfts/list?x_cg_demo_api_key=${apiKey}`
            return await nftsList(url, res)
        case 'exchangeRateBTC':
            url = `https://api.coingecko.com/api/v3/exchange_rates?x_cg_demo_api_key=${apiKey}`
            return await exchangeRateBTC(url, res)
        default:
            return res.status(400).json({ message: 'Invalid query' });
            break;
    }
};

//v2
const flatFormat = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data  = await response.json();
            return res.status(200).json(data);
        } else {
            return res.status(response.status).json({ message: 'Trades data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const singleResponse = async (url, res) => {
    console.log(url)
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data  = await response.json();

            console.log(data)

            return res.status(200).json([data]);
        } else {
            return res.status(response.status).json({ message: 'Trades data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const coinTickersFormat = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { tickers } = await response.json();

            const flattenedData = tickers.map(ticker => {
                const {
                    base,
                    target,
                    market: { name, identifier, has_trading_incentive },
                    last,
                    volume,
                    converted_last: { btc, eth, usd },
                    converted_volume: { btc: vol_btc, eth: vol_eth, usd: vol_usd },
                    trust_score,
                    bid_ask_spread_percentage,
                    timestamp,
                    last_traded_at,
                    last_fetch_at,
                    is_anomaly,
                    is_stale,
                    trade_url,
                    token_info_url,
                    coin_id,
                    target_coin_id
                } = ticker;

                return {
                    base,
                    target,
                    market_name: name,
                    market_identifier: identifier,
                    market_has_trading_incentive: has_trading_incentive,
                    last: parseFloat(last),
                    volume: parseFloat(volume),
                    converted_last_btc: parseFloat(btc),
                    converted_last_eth: parseFloat(eth),
                    converted_last_usd: parseFloat(usd),
                    converted_volume_btc: parseFloat(vol_btc),
                    converted_volume_eth: parseFloat(vol_eth),
                    converted_volume_usd: parseFloat(vol_usd),
                    trust_score,
                    bid_ask_spread_percentage: parseFloat(bid_ask_spread_percentage),
                    timestamp,
                    last_traded_at,
                    last_fetch_at,
                    is_anomaly,
                    is_stale,
                    trade_url,
                    token_info_url,
                    coin_id,
                    target_coin_id
                };
            });

            return res.status(200).json(flattenedData);
        } else {
            return res.status(response.status).json({ message: 'Tickers data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}

const singleCoinHistoryFormat = async (url, res) => {
    console.log(url)
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json();
            
            const flattenedData = {
                id: data.id,
                symbol: data.symbol,
                name: data.name,
                thumb_image: data.image.thumb,
                small_image: data.image.small,
                ...Object.fromEntries(Object.entries(data.market_data.current_price).map(([key, value]) => [`current_price_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.market_data.market_cap).map(([key, value]) => [`market_cap_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.market_data.total_volume).map(([key, value]) => [`total_volume_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.community_data || {}).map(([key, value]) => [`community_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.developer_data || {}).map(([key, value]) => [`developer_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.developer_data.code_additions_deletions_4_weeks || {}).map(([key, value]) => [`code_additions_deletions_4_weeks_${key}`, value])),
                ...Object.fromEntries(Object.entries(data.public_interest_stats || {}).map(([key, value]) => [`public_interest_${key}`, value])),
            };

            console.log(flattenedData);

            return res.status(200).json([flattenedData]);
        } else {
            return res.status(response.status).json({ message: 'Data pull failed' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Internal Server Error' });
    }
}




//v1


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

const globalMarketData = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            // Flattening the total_market_cap and total_volume
            const totalMarketCap = Object.entries(data.total_market_cap).map(([key, value]) => ({
                [`total_market_cap_${key}`]: value,
            }));

            const totalVolume = Object.entries(data.total_volume).map(([key, value]) => ({
                [`total_volume_${key}`]: value,
            }));

            // Combine totalMarketCap and totalVolume into single objects
            const flattenedTotalMarketCap = Object.assign({}, ...totalMarketCap);
            const flattenedTotalVolume = Object.assign({}, ...totalVolume);

            // Flattening the market_cap_percentage
            const marketCapPercentage = Object.entries(data.market_cap_percentage).map(([key, value]) => ({
                [`market_cap_percentage_${key}`]: value,
            }));
            const flattenedMarketCapPercentage = Object.assign({}, ...marketCapPercentage);

            // Combining all flattened data
            const flattenedData = {
                active_cryptocurrencies: data.active_cryptocurrencies,
                upcoming_icos: data.upcoming_icos,
                ongoing_icos: data.ongoing_icos,
                ended_icos: data.ended_icos,
                markets: data.markets,
                ...flattenedTotalMarketCap,
                ...flattenedTotalVolume,
                ...flattenedMarketCapPercentage,
                market_cap_change_percentage_24h_usd: data.market_cap_change_percentage_24h_usd,
                updated_at: data.updated_at,
            };

            return res.status(200).json([flattenedData]);
        } else {
            return res.status(response.status).json({ message: 'Global market data pull failed' });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


const globalDefiMarketData = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const { data } = await response.json();

            const flattenedData = {
                defi_market_cap: data.defi_market_cap,
                eth_market_cap: data.eth_market_cap,
                defi_to_eth_ratio: data.defi_to_eth_ratio,
                trading_volume_24h: data.trading_volume_24h,
                defi_dominance: data.defi_dominance,
                top_coin_name: data.top_coin_name,
                top_coin_defi_dominance: data.top_coin_defi_dominance,
            };

            return res.status(200).json([flattenedData]);
        } else {
            return res.status(response.status).json({ message: 'Global DeFi market data pull failed' });
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
            return res.status(response.status).json({ message: 'Exchanges list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


const derivativesTickers = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const derivatives = await response.json()
            return res.status(200).json(derivatives);
        } else {
            return res.status(response.status).json({ message: 'Derivatives list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};


const derivativesExchanges = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json()
            return res.status(200).json(data);
        } else {
            return res.status(response.status).json({ message: 'derivatives Exchanges list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const derivativesExchangesList = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json()
            return res.status(200).json(data);
        } else {
            return res.status(response.status).json({ message: 'derivatives Exchanges list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

//nftsList
const nftsList = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json()
            return res.status(200).json(data);
        } else {
            return res.status(response.status).json({ message: 'nfts list data pull failed' });
        }
    } catch (error) {
        console.log(error.message)
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

const exchangeRateBTC = async (url, res) => {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (response.status === 200) {
            const data = await response.json();
            const rates = data.rates;

            const formattedData = Object.entries(rates).map(([key, value]) => ({
                id: key,
                name: value.name,
                unit: value.unit,
                value: value.value,
                type: value.type,
            }));

            return res.status(200).json(formattedData);
        } else {
            return res.status(response.status).json({ message: 'Exchange rate list data pull failed' });
        }
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
};

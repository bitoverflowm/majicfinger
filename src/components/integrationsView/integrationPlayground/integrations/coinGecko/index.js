import {useState} from "react"


const CoinGecko = ({setConnectedData}) => {
    
    const fetchHandler = async (query) => {
        let res = await fetch(`/api/integrations/coinGecko?query=${query}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (res.status === 200) {
            let data = await res.json();
            setConnectedData(data);
        } else {
            console.error(res.error);
        }        
    }

    const trendingActions = [
        { query: 'trendingCoins', name: 'Trending Coins', description: 'Get the trending coins' },
        { query: 'trendingNFTs', name: 'Trending NFTs', description: 'Get the trending NFTs' },
        { query: 'trendingCategories', name: 'Trending Categories', description: 'Get the trending categories' }
    ];

    const adminActions = [
        { query: 'supportedCurrenciesList', name: 'Supported Currencies List', description: 'Get a list of all supported currencies on CoinGecko'},
        { query: 'coinListId', name: 'Coins ID List', description: 'List of all supported coins on CoinGecko with Ethereum, polygon-pos address and symbol'},
    ]

    const marketData = [
        { query: 'coinMarketData', name: 'Coin Market Data', description: 'All the supported coins with price, market cap, volume and market related data', broken: true},
        { query: 'coinCategoriesMarketData', name: 'Coin Categories Market Data', description: "All the coins categories with market data (market cap, volume, etc.) on CoinGecko"},
        { query: 'globalMarketData', name: 'Global Market Data', description: "Global data including active cryptocurrencies, markets, total crypto market cap and etc"},
        { query: 'globalDefiMarketData', name: 'Global De-Fi Market Data', description: "Top 100 cryptocurrency global decentralized finance (defi) data including defi market cap, trading volume"},
    ]

    const exchangeData = [
        { query: 'exchangesData', name: 'Exchanges Data', description: 'All the supported exchanges with exchanges’ data (id, name, country, .... etc) that have active trading volumes on CoinGecko'},
    ]

    const derivativesData = [
        { query: 'derivativesTickers', name: 'Derivatives Tickers', description: 'all the tickers from derivatives exchanges on CoinGecko'},
        { query: 'derivativesExchanges', name: 'Derivatives Exchangess', description: 'all the derivatives exchanges with related data (id, name, open interest, .... etc) on CoinGecko'},
        { query: 'derivativesExchangesList', name: 'Derivatives Exchanges List', description: 'all the derivatives exchanges with id and name on CoinGecko.'},
    ]

    const nftsData = [
        { query: 'nftsList', name: 'NFTs', description: 'query all supported NFTs with id, contract address, name, asset platform id and symbol on CoinGecko'},
    ]

    const exchangeRatesData = [
        { query: 'exchangeRateBTC', name: 'BTC Exchange Rates', description: 'BTC exchange rates with other currencies.'},
    ]



    return (
        <div>  
            <div className="py-2 text-xs">Trending</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {trendingActions.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">CoinGecko Admin</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {adminActions.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">Market Data</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {marketData.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">Exchange Data</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {exchangeData.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">Derivatives Data</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {derivativesData.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">NFT Data</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {nftsData.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
            <div className="py-2 text-xs">Exchange Rate Data</div>
            <div className='flex flex-wrap gap-1 text-xs'>
                {exchangeRatesData.map(action => (
                    <div
                        key={action.query}
                        className={`px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-200' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                        onClick={() => !action.broken && fetchHandler(action.query)}
                        title={action.description}
                    >
                        {action.name}
                    </div>
                ))}
            </div>
        </div>
    )
}


export default CoinGecko
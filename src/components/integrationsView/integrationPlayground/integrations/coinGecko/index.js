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
    ]

    const exchangeData = [
        { query: 'exchangesData', name: 'Exchanges Data', description: 'All the supported exchanges with exchanges’ data (id, name, country, .... etc) that have active trading volumes on CoinGecko'},
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
        </div>
    )
}


export default CoinGecko
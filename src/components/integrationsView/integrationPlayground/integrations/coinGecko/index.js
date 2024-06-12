import { Alert } from "@/components/ui/alert"
import { FlaskConical } from "lucide-react"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"


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
        { query: 'ping', name: 'CoinGecko Server Status', description: 'Check the API server status', broken: true},
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
        { query: 'nftsCollectionByID', name: 'NFTs Collection Data by ID', description: 'query all the NFT data (name, floor price, 24 hr volume....) based on the nft collection id', broken: true},
        { query: 'nftsCollectionByAddy', name: 'NFTs Collection Data by Addy', description: 'query all the NFT data (name, floor price, 24 hr volume....) based on the nft collection addy', broken: true},
    ]

    const exchangeRatesData = [
        { query: 'exchangeRateBTC', name: 'BTC Exchange Rates', description: 'BTC exchange rates with other currencies.'},
    ]

    const coinData = [
        { query: 'coinPriceById', name: 'Coin By CoinID', description: 'query the prices of one or more coins by using their unique Coin API IDs', broken: true},
        { query: 'coinPriceByTokenAddy', name: 'Coin By Token Address', description: 'query a token price by using token contract address', broken: true},
        { query: 'coinDataById', name: 'Coin Data By CoinID', description: 'query all the coin data of a coin (name, price, market .... including exchange tickers) on CoinGecko coin page based on a particular coin id', broken: true},
        { query: 'coinTickersById', name: 'Coin Tickers By ID', description: 'query the coin tickers on both centralized exchange (cex) and decentralized exchange (dex) based on a particular coin id', broken: true},
        { query: 'coinHistoricalChartDataById', name: 'Coin Historical Chart Data by ID', description: ' get the historical chart data of a coin including time in UNIX, price, market cap and 24hrs volume based on particular coin id', broken: true},
        { query: 'coinHistoricalChartDataByAddy', name: 'Coin Historical Chart Data by Token Addy', description: '  all the coin data (name, price, market .... including exchange tickers) on CoinGecko coin page based on asset platform and particular token contract address.', broken: true},
        { query: 'coinHistoricalDataById', name: 'Coin Historical Data by ID', description: 'query the historical data (price, market cap, 24hrs volume, etc) at a given date for a coin based on a particular coin id', broken: true},
        { query: 'coinHistoricalChartDataWithinTimeRangeById', name: 'Coin Historical Chart Data within Time Range by ID', description: 'get the historical chart data of a coin within certain time range in UNIX along with price, market cap and 24hrs volume based on particular coin id', broken: true},
        { query: 'coinOHLCById', name: 'Coin OHLC Chart by ID', description: 'get the OHLC chart (Open, High, Low, Close) of a coin based on particular coin id.', broken: true},
    ]



    return (
        <div className="text-[12px]">
            <Accordion defaultValue="marketData" type="single" collapsible className="w-full">
                <AccordionItem value="trending">
                    <AccordionTrigger className="pt-1 sm:pt-3">Trending</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {trendingActions.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="admin">
                    <AccordionTrigger>CoinGecko Admin</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {adminActions.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="marketData">
                    <AccordionTrigger>Market Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                        {marketData.map(action => (
                            <div
                                key={action.query}
                                className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                onClick={() => !action.broken && fetchHandler(action.query)}
                                title={action.description}
                            >
                                {action.name}
                            </div>
                        ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="exchangeData">
                    <AccordionTrigger>Exchange Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {exchangeData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="derivativesData">
                    <AccordionTrigger>Derivatives Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {derivativesData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="nftData">
                    <AccordionTrigger>NFT Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {nftsData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="exchangeRateData">
                    <AccordionTrigger>Exchange Rate Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {exchangeRatesData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="coinData">
                    <AccordionTrigger>Coin Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {coinData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => !action.broken && fetchHandler(action.query)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
            <Alert className="mt-4">
                <div className="flex gap-2 place-items-center"><FlaskConical className="w-8 h-8"/><div className="">You will soon be able to search by contractID, Token Name or any freeform search</div></div>
            </Alert>            
        </div>
    )
}


export default CoinGecko
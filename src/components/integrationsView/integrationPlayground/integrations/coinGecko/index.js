import { Alert } from "@/components/ui/alert"
import { FlaskConical } from "lucide-react"

import { useState } from "react";

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

import { format, getTime } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { DateRange } from "react-day-picker"

const CoinGecko = ({setConnectedData}) => {
    
    const [args, setArgs] = useState()
    const [query, setQuery] = useState()
    const [inputValues, setInputValues] = useState({});
    const [date, setDate] = useState()
    const [dateRange, setDateRange] = useState({ from: undefined, to: undefined });


    const fetchHandler = async (query, args) => {
        let queryString = `query=${query}`;
        if (args) {
            args.forEach((arg) => {
                const key = Object.keys(arg)[0];
                if (key === 'date') {
                    queryString += `&${key}=${encodeURIComponent(format(date, 'dd-MM-yyyy'))}`;
                } else if (key === 'date_from' && dateRange.from) {
                    queryString += `&${key}=${Math.floor(getTime(dateRange.from) / 1000)}`;
                } else if (key === 'date_to' && dateRange.to) {
                    queryString += `&${key}=${Math.floor(getTime(dateRange.to) / 1000)}`;
                } else {
                    queryString += `&${key}=${encodeURIComponent(inputValues[key] || "")}`;
                }
            });
        }

        let res = await fetch(`/api/integrations/coinGecko?${queryString}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (res.status === 200) {
            setArgs()
            setQuery()
            setInputValues({})
            let data = await res.json();
            setConnectedData(data);
        } else {
            setArgs()
            setQuery()
            setInputValues({})
            console.error(res.error);
        }        
    }

    const handleInputChange = (key, value) => {
        setInputValues((prevValues) => ({
          ...prevValues,
          [key]: value,
        }));
    };

    const coinData = [
        { query: 'coinListId', name: 'Coins ID List', description: 'Query all the supported coins on CoinGecko with coins id, name and symbol.'},
        { query: 'coinListMarketData', name: 'Coin List with Market Data', description: 'Query all the supported coins with price, market cap, volume and market related data.', requires : [{'vs_currency': 'target currency of coins and market dat eg: usd'}] },
        { query: 'coinDataById', name: 'Coin Data By CoinID', description: 'query all the coin data of a coin (name, price, market .... including exchange tickers) on CoinGecko coin page based on a particular coin id', requires : [{'coin': 'user Coin ID List to see supported Coin Ids (example: bitcoin)'}]},
        { query: 'coinTickersById', name: 'Coin Tickers By ID', description: 'query the coin tickers on both centralized exchange (cex) and decentralized exchange (dex) based on a particular coin id',  requires : [{'coin': 'user Coin ID List to see supported Coin Ids (example: bitcoin)'}]},
        { query: 'coinHistoricalDataById', name: 'Coin Historical Chart Data by ID', description: 'query the historical data (price, market cap, 24hrs volume, etc) at a given date for a coin based on a particular coin id ', requires : [{'coin': 'user Coin ID List to see supported Coin Ids (example: bitcoin)'}, {'date': 'the date of data snapshot'}]},      

        { query: 'coinHistoricalTimeRange', name: 'Coin Chart Data Within Time Range', description: 'historical chart data of a coin within certain time range in UNIX along with price, market cap and 24hrs volume based on particular coin id ', requires : [{'coin': 'user Coin ID List to see supported Coin Ids (example: bitcoin)'}, {'vs_currency': 'target currency of coins and market dat eg: usd'}, {'date_from': 'the date of data snapshot'}, {'date_to': 'the date of data snapshot'} ]},   



        { query: 'coinOHLCById', name: 'Coin OHLC Chart by ID', description: 'get the OHLC chart (Open, High, Low, Close) of a coin based on particular coin id.', broken: true},
    ]

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

    

    const clickHandler = (query, requirements, broken) => {
        if(broken){
            alert('Action coming soon, please try another one for now.')
            return
        }else if(requirements && requirements.length > 0){
            setArgs(requirements)
            setQuery(query)
        }else{
            fetchHandler(query)
        }
    }

    const cancelHandler = () => {
        setArgs()
        setQuery()
    }



    return (
        <div className="text-[12px]">
            {args && (
                <div className="bg-black/90 px-6 py-4 rounded-md">
                    {args.map((arg, index) => {
                        const key = Object.keys(arg)[0];
                        const description = arg[key];
                        return (
                            <div key={index}>
                                {key === "date" ? (
                                    <div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[280px] justify-start text-left font-normal",
                                                        !date && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, "dd-MM-yyyy") : <span>Pick a date</span>}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0">
                                                <Calendar
                                                    mode="single"
                                                    selected={date}
                                                    onSelect={(selectedDate) => {
                                                        setDate(selectedDate);
                                                        handleInputChange(key, format(selectedDate, "dd-MM-yyyy"));
                                                    }}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="pt-2 pb-3 text-xs text-slate-400">{description}</p>
                                    </div>
                                ) : key === "date_from" ? (
                                    <div>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    id="date-range"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-[300px] justify-start text-left font-normal",
                                                        !dateRange.from && !dateRange.to && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {dateRange.from ? (
                                                        dateRange.to ? (
                                                            <>
                                                                {format(dateRange.from, "dd-MM-yyyy")} -{" "}
                                                                {format(dateRange.to, "dd-MM-yyyy")}
                                                            </>
                                                        ) : (
                                                            format(dateRange.from, "dd-MM-yyyy")
                                                        )
                                                    ) : (
                                                        <span>Pick a date range</span>
                                                    )}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    initialFocus
                                                    mode="range"
                                                    defaultMonth={dateRange.from}
                                                    selected={dateRange}
                                                    onSelect={(range) => {
                                                        setDateRange(range);
                                                        handleInputChange('date_from', range.from);
                                                        handleInputChange('date_to', range.to);
                                                    }}
                                                    numberOfMonths={2}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <p className="pt-2 pb-3 text-xs text-slate-400">{description}</p>
                                    </div>
                                ) :  key !== "date_from" && key !== "date_to" ? (
                                    <div>
                                        <Input
                                            type="text"
                                            placeholder={`Enter ${key}`}
                                            className="text-xs"
                                            value={inputValues[key] || ""}
                                            onChange={(e) => handleInputChange(key, e.target.value)}
                                        />
                                        <p className="pt-2 pb-3 text-xs text-slate-400">{description}</p>
                                    </div>
                                ) : null }
                            </div>
                        );
                    })}
                    <div className="flex gap-2">
                        <div
                            onClick={() => cancelHandler()}
                            className="text-xs border-slate-500 border border-1 text-white mt-2 w-32 py-2 rounded-md text-center cursor-pointer hover:bg-slate-800"
                        >  cancel </div>
                        <div
                            onClick={() => fetchHandler(query, args)}
                            className="text-xs bg-purple-400/80 hover:bg-purple-400 font-bold mt-2 w-32 py-2 rounded-md text-center cursor-pointer"
                        >  Search </div>
                    </div>
                </div>
            )}
            <Accordion defaultValue="coins" type="single" collapsible className="w-full">
                <AccordionItem value="coinData">
                    <AccordionTrigger>Coin Data</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {coinData.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem value="trending">
                    <AccordionTrigger className="pt-1 sm:pt-3">Trending</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {trendingActions.map(action => (
                                <div
                                    key={action.query}
                                    className={`text-[10px] px-3 py-1 border rounded-md ${action.broken ? 'disabled bg-slate-100' : 'hover:bg-lychee_red hover:text-white cursor-pointer' }`}
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
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
                                    onClick={() => clickHandler(action.query, action.requires, action.broken)}
                                    title={action.description}
                                >
                                    {action.name}
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>        
        </div>
    )
}


export default CoinGecko
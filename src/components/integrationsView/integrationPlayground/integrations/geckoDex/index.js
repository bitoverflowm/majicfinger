import { Alert } from "@/components/ui/alert"
import { FlaskConical } from "lucide-react"

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { useState } from "react"

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";


const GeckoDex = ({setConnectedData}) => {

    const [args, setArgs] = useState()
    const [query, setQuery] = useState()
    const [inputValues, setInputValues] = useState({});
    
    const fetchHandler = async (query, args) => {
        let queryString = `query=${query}`;
        if (args) {
          args.forEach((arg) => {
            const key = Object.keys(arg)[0];
            queryString += `&${key}=${encodeURIComponent(inputValues[key] || "")}`;
          });
        }
    
        let res = await fetch(`/api/integrations/geckoDex?${queryString}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
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
      };
    
      const handleInputChange = (key, value) => {
        setInputValues((prevValues) => ({
          ...prevValues,
          [key]: value,
        }));
      };

    const exploratory = [
        { query: 'networks', name: 'Supported Networks', description: 'Get list of supported networks', columns: ['network name'], requires : [] },
        { query: 'trendingPools', name: 'Trending Pools', description: 'Get trending pools across all networks', columns: ['name', 'address',  "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [] },
        { query: 'newPools', name: 'Latest Pools', description: 'Get latest pools across all networks', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [] },
        { query: 'searchPools', name: 'Search Pools', description: 'Search for pools on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [{'search': 'can be pool address, token address, or token symbol eg: ETH'}] },
        { query: 'recentlyUpdatedTokens', name: 'Recently Updated Tokens', description: 'Get most recently updated 100 tokens info across all networks', columns: ['token_name', 'token_symbol', 'decimals', 'total_supply', 'circulating_supply', 'market_cap', 'price_usd'], requires : [] },
    ]

    const simple = [
        { query: 'tokenPriceUSD', name: 'Token Price (USD)', description: 'Get current USD prices of multiple tokens on a network', columns: ['token_prices'], requires : [{'network': 'network id eg: eth. Use *Supported Networks* action to find newtworks'},{ 'addresses': 'Comma-Separated list of token addresses (up to 30 addresses)'}] },
    ]

    const network = [
        { query: 'networks', name: 'Supported Networks', description: 'Get list of supported networks', columns: ['network name'], requires : [] },
    ]

    const dexes = [
        { query: 'dexes', name: 'Supported Dexes', description: 'Get list of supported dexes on a network', columns: ['name'], requires : ['network'] },
    ]

    const pools = [
        { query: 'trendingPools', name: 'Trending Pools', description: 'Get trending pools across all networks', columns: ['name', 'address',  "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [] },
        { query: 'specificPool', name: 'Specific Pool', description: 'Get specific pool on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : ['network', 'address'] },
        { query: 'multiplePools', name: 'Multiple Pools', description: 'Get multiple pools on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : ['network', 'addresses'] },
        { query: 'topPools', name: 'Top Pools', description: 'Get top pools on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : ['network'] },
        { query: 'dexTopPools', name: 'Dex Top Pools', description: 'Get top pools on a network\'s dex', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : ['network', 'dex'] },
        { query: 'newPoolsNetwork', name: 'Latest Pools on Network', description: 'Get latest pools on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [] },
        { query: 'searchPools', name: 'Search Pools', description: 'Search for pools on a network', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : [] },
    ];

    const tokens = [
        { query: 'tokenPools', name: 'Token Pools', description: 'Get top pools for a token', columns: ['name', 'address', "base_token_price_usd", "quote_token_price_usd", "base_token_price_native_currency", "quote_token_price_native_currency", "base_token_price_quote_token", "quote_token_price_base_token", "pool_created_at", "reserve_in_usd", "fdv_usd", "market_cap_usd", "price_change_percentage", "transactions", "volume_usd"], requires : ['network', 'token_address'] },
        { query: 'specificToken', name: 'Specific Token', description: 'Get specific token on a network', columns: ['token_name', 'token_symbol', 'decimals', 'total_supply', 'circulating_supply', 'market_cap', 'price_usd'], requires : ['network', 'address'] },
        { query: 'multipleTokens', name: 'Multiple Tokens', description: 'Get multiple tokens on a network', columns: ['token_name', 'token_symbol', 'decimals', 'total_supply', 'circulating_supply', 'market_cap', 'price_usd'], requires : ['network', 'addresses'] },
        { query: 'tokenInfo', name: 'Token Info', description: 'Get specific token info on a network', columns: ['token_name', 'token_symbol', 'decimals', 'total_supply', 'circulating_supply', 'market_cap', 'price_usd'], requires : ['network', 'address'] },
        { query: 'recentlyUpdatedTokens', name: 'Recently Updated Tokens', description: 'Get most recently updated 100 tokens info across all networks', columns: ['token_name', 'token_symbol', 'decimals', 'total_supply', 'circulating_supply', 'market_cap', 'price_usd'], requires : [] },
    ];


    const ohlcvs = [
        { query: 'poolOHLCV', name: 'Pool OHLCV Data', description: 'Get OHLCV (open, high, low, close, volume) data of a pool, up to 6 months ago. Empty response if there is no earlier data available.', columns: ['open', 'high', 'low', 'close', 'volume'], requires : ['network', 'pool_address', 'timeframe'] },
    ];

    const trades = [
        { query: 'poolTrades', name: 'Pool Trades', description: 'Get last 300 trades in past 24 hours from a pool', columns: [
            "block_number",
            "block_timestamp",
            "tx_hash",
            "tx_from_address",
            "from_token_amount",
            "to_token_amount",
            "price_from_in_currency_token",
            "price_to_in_currency_token",
            "price_from_in_usd",
            "price_to_in_usd",
            "kind",
            "volume_in_usd",
            "from_token_address",
            "to_token_address"
        ], requires : ['network', 'pool_address'] },
    ];

    const clickHandler = (query, requirements, broken) => {
        if(broken){
            alert('Action coming soon, please try another one for now.')
            return
        }else if(requirements.length > 0){
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
                            <Input
                            type="text"
                            placeholder={`Enter ${key}`}
                            className="text-xs"
                            value={inputValues[key] || ""}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            />
                            <p className="pt-2 pb-3 text-xs text-slate-400">{description}</p>
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
            <Accordion defaultValue="marketData" type="single" collapsible className="w-full">
                <AccordionItem value="exploratory">
                    <AccordionTrigger className="pt-1 sm:pt-3">Exploratory</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {exploratory.map(action => (
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
                <AccordionItem value="simple">
                    <AccordionTrigger className="pt-1 sm:pt-3">Simple Query</AccordionTrigger>
                    <AccordionContent>
                        <div className='flex flex-wrap gap-1'>
                            {simple.map(action => (
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

            <Alert className="mt-4">
                <div className="flex gap-2 place-items-center"><FlaskConical className="w-8 h-8"/><div className="">You will soon be able to search by contractID, Token Name or any freeform search</div></div>
            </Alert>            
        </div>
    )
}


export default GeckoDex
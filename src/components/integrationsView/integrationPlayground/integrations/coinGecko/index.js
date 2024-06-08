import {useState} from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
 
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const CoinGecko = ({setConnectedData}) => {
    const [date, setDate] = useState()
    const [trendingCache, setTrendingCache ] = useState()
    
    const fetchHandler = async () => {
        let res = await fetch('/api/integrations/coinGecko', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        if (res.status === 200) {
            let data = await res.json();
            setConnectedData(data);
        } else {
            console.error("WallStreetBets User Data pull failed");
        }        
    }

    return (
        <>  
            <div>What do you want to pull?</div>
            <div className="bg-black p-2 rounded-lg text-white" onClick={()=>fetchHandler()}>Trending</div>

            <div className='flex place-content-end gap-4 text-xs'>
                <div className='px-3 py-1 bg-white text-lychee-red border border-lychee-red cursor-pointer hover:bg-lychee-red hover:text-white rounded-md' onClick={()=>clearHandler()}>Clear</div>
                <div className='shadow-sm px-3 py-1 bg-lychee-go text-lychee-black border border-lychee-go cursor-pointer hover:bg-lychee-green hover:text-white hover:border-lychee-green rounded-md hover:shadow-lychee-green hover:shadow-2xl' onClick={()=>fetchHandler(date)}>Connect</div>
            </div>

        </>
    )
}


export default CoinGecko
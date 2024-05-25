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

const WallStreetBets = ({setConnectedData}) => {
    const [date, setDate] = useState()
    
    const fetchHandler = async (date) => {
        if(date){
            let res = await fetch(`https://tradestie.com/api/v1/apps/reddit?date=${date}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                let data = await res.json();
                console.log(data);
                setConnectedData(data);
            } else {
                console.error("WallStreetBets User Data pull failed");
            }           
        }
        else{
            let res = await fetch('/api/integrations/wallStBets/sentiment', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            if (res.status === 200) {
                let data = await res.json();
                console.log(data);
                setConnectedData(data);
            } else {
                console.error("WallStreetBets User Data pull failed");
            }
        }
    }

    return (
        <>            
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
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    />
                </PopoverContent>
            </Popover>

            <div className='flex place-content-end gap-4 text-xs'>
                <div className='px-3 py-1 bg-white text-lychee-red border border-lychee-red cursor-pointer hover:bg-lychee-red hover:text-white rounded-md' onClick={()=>clearHandler()}>Clear</div>
                <div className='shadow-sm px-3 py-1 bg-lychee-go text-lychee-black border border-lychee-go cursor-pointer hover:bg-lychee-green hover:text-white hover:border-lychee-green rounded-md hover:shadow-lychee-green hover:shadow-2xl' onClick={()=>fetchHandler(date)}>Connect</div>
            </div>

        </>
    )
}


export default WallStreetBets
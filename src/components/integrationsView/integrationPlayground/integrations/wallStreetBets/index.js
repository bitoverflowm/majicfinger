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
import { useMyStateV2 } from "@/context/stateContextV2";

const WallStreetBets = ({ setConnectedData, requestSheetDestination }) => {
    const contextStateV2 = useMyStateV2();
    const addNewSheetAndActivate = contextStateV2?.addNewSheetAndActivate;
    const setSheetData = contextStateV2?.setSheetData;
    const [date, setDate] = useState()
    
    const clearHandler = () => {
        setDate(undefined)
        // Clear the connected dataset so the sheet/table resets.
        try {
            setConnectedData?.([])
        } catch {
            // ignore
        }
    }
    
    const fetchHandler = async (date) => {
        const destination = await requestSheetDestination?.();
        if (!destination) return;
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
                const rows = Array.isArray(data) ? data : [data];
                if (destination === "append") {
                    setConnectedData?.((prev) => [...(Array.isArray(prev) ? prev : []), ...rows]);
                } else if (destination === "new_sheet") {
                    addNewSheetAndActivate?.((newId) => setSheetData?.(newId, rows));
                } else {
                    setConnectedData(data);
                }
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
                const rows = Array.isArray(data) ? data : [data];
                if (destination === "append") {
                    setConnectedData?.((prev) => [...(Array.isArray(prev) ? prev : []), ...rows]);
                } else if (destination === "new_sheet") {
                    addNewSheetAndActivate?.((newId) => setSheetData?.(newId, rows));
                } else {
                    setConnectedData(data);
                }
            } else {
                console.error("WallStreetBets User Data pull failed");
            }
        }
    }

    return (
        <>
            <div>Get top 50 stocks discussed on Reddit subeddit </div>
            <div>To find stocks discussed by date, speficy data below. Otherwise, leave empty to get Todays data.</div>      
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                    variant={"outline"}
                    className={cn(
                        "w-[280px] justify-start text-left text-xs font-normal",
                        !date && "text-muted-foreground"
                    )}
                    >
                    <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                    {date ? format(date, "PPP") : <span className="text-[11px] leading-snug">Pick a date</span>}
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
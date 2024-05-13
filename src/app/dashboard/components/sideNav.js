import Image from "next/image"
import Link from "next/link"
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  Database,
  File,
  HardDriveUpload,
  Home,
  LayoutDashboard,
  LineChart,
  ListFilter,
  MoreVertical,
  Package,
  Package2,
  PanelLeft,
  Search,
  Settings,
  ShoppingCart,
  Truck,
  Users2,
  BadgePlus,
  Shovel,
  Cable,
  BarChart3,
  Gem,
  Bot,
  Camera,
  Zap
} from "lucide-react"

import { useMyStateV2  } from '@/context/stateContextV2'

const SideNav = () => {
  
  const contextStateV2 = useMyStateV2()

  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing

  return (
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Image src={"/fruit.png"} width={15} height={6} alt={'logo'}/>
          <span className="sr-only">Lychee</span>
        </Link>
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'dashboard' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`} onClick={()=>setViewing('dashboard')}
            >
              <LayoutDashboard className="h-5 w-5" />
            </div>
          </div>
        </div>
        {/* If there is data, then show grid of data
              else show modal to :
              - upload user's data in csv, excel etc
              - integrate with an app (twitter, kaggle, etc) -> goes to integrations
              - scrape a website using AI -> goes to Momo
              - generate data with AI -> Athena
                */}
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'dataStart' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('dataStart')}
            >
              
              <Database className="h-5 w-5" />
              <span className="sr-only">Data</span>
            </div>
          </div>
        </div>
        {/* upload a csv, excel file, etc. If user has their own data and they want ot work with it this would be the place. 
                */}
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'upload' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('upload')}
            >
              
              <HardDriveUpload className="h-5 w-5" />
              <span className="sr-only">Upload</span>
            </div>
          </div>
        </div>
        {
          /* this is the integrations. Connect to twitter, strava, quickbooks, stripe, etc */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'integrations' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('integrations')}
            >
              
              <Cable className="h-5 w-5" />
              <span className="sr-only">Integrations</span>
            </div>
          </div>
        </div>
        {
          /* Automatically scrape a website of your choosing. We will call this Momo. Using Lychee AI */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'scrape' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('scrape')}
            >
              
              <Shovel className="h-5 w-5" />
              <span className="sr-only">Scrape</span>
            </div>
          </div>
        </div>
        {
          /* Generate some random data using Athena Lychee AI*/
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'generate' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('generate')}
            >
              
              <BadgePlus className="h-5 w-5" />
              <span className="sr-only">Generate Data</span>
            </div>
          </div>
        </div>      
        {/* Charts*/}
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'charts' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('charts')}
            >                
              <BarChart3 className="h-5 w-5" />
              <span className="sr-only">Charts</span>
            </div>
          </div>
        </div>       
        {
          /* Gallery */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'gallery' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('gallery')}
            >                
              <Gem className="h-5 w-5" />
              <span className="sr-only">Gallery</span>
            </div>
          </div>
        </div>
        {
          /* AI  */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'ai' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('ai')}
            >                
              <Bot className="h-5 w-5" />
              <span className="sr-only">AI</span>
            </div>
          </div>
        </div>
        {
          /* Presentations  */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'presentation' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('presentation')}
            >                
              <Camera className="h-5 w-5" />
              <span className="sr-only">Presentation</span>
            </div>
          </div>
        </div>
        {
          /* Get Pro  */
        }
        <div>
          <div aschild>
            <div
              href="#"
              className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'subscribe' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
              onClick={()=>setViewing('subscribe')}
            >                
              <Zap className="h-5 w-5" />
              <span className="sr-only">Subscribe</span>
            </div>
          </div>
        </div>

        
      </nav>
      
  )
}

export default SideNav
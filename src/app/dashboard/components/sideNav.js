import Image from "next/image"
import Link from "next/link"
import {
  Database,
  HardDriveUpload,
  LayoutDashboard,
  PanelLeft,
  BadgePlus,
  Shovel,
  Cable,
  BarChart3,
  Gem,
  Bot,
  Camera,
  Zap,
  PanelLeftOpenIcon
} from "lucide-react"

import { useMyStateV2  } from '@/context/stateContextV2'

import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const SideNav = () => {
  
  const contextStateV2 = useMyStateV2()

  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing

  return (
    <>
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-5">
        <Link
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <Image src={"/fruit.png"} width={15} height={6} alt={'logo'}/>
          <span className="sr-only">Lychee</span>
        </Link>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'dashboard' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`} onClick={()=>setViewing('dashboard')}
                >
                  <LayoutDashboard className="h-5 w-5" />
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Dashboard</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {/* If there is data, then show grid of data
              else show modal to :
              - upload user's data in csv, excel etc
              - integrate with an app (twitter, kaggle, etc) -> goes to integrations
              - scrape a website using AI -> goes to Momo
              - generate data with AI -> Athena
                */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'dataStart' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('dataStart')}
                >
                  
                  <Database className="h-5 w-5" />
                  <span className="sr-only">Data</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Data </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {/* upload a csv, excel file, etc. If user has their own data and they want ot work with it this would be the place. 
                */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'upload' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('upload')}
                >
                  
                  <HardDriveUpload className="h-5 w-5" />
                  <span className="sr-only">Upload</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Upload Data </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {
          /* this is the integrations. Connect to twitter, strava, quickbooks, stripe, etc */
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                href="#"
                className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'integrations' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                onClick={()=>setViewing('integrations')}
              >
                
                <Cable className="h-5 w-5" />
                <span className="sr-only">Integrations</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">Data directly from your favorite data sources</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {
          /* Automatically scrape a website of your choosing. We will call this Momo. Using Lychee AI */
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'scrape' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('scrape')}
                >
                  
                  <Shovel className="h-5 w-5" />
                  <span className="sr-only">Scrape</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Scrape a website</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {
          /* Generate some random data using Athena Lychee AI*/
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'generate' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('generate')}
                >
                  
                  <BadgePlus className="h-5 w-5" />
                  <span className="sr-only">Generate Data</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Generate Data</TooltipContent>
          </Tooltip>
        </TooltipProvider>  
        {/* Charts*/}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'charts' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('charts')}
                >                
                  <BarChart3 className="h-5 w-5" />
                  <span className="sr-only">Charts</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Charts</TooltipContent>
          </Tooltip>
        </TooltipProvider>  
        {
          /* Gallery */
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div

                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'gallery' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('gallery')}
                >                
                  <Gem className="h-5 w-5" />
                  <span className="sr-only">Gallery</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Charts</TooltipContent>
          </Tooltip>
        </TooltipProvider>  
        {
          /* AI  */
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'ai' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('ai')}
                >                
                  <Bot className="h-5 w-5" />
                  <span className="sr-only">AI</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">AI</TooltipContent>
          </Tooltip>
        </TooltipProvider> 
        {
          /* Presentations  */
        }
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
                <div
                  href="#"
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'presentation' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('presentation')}
                >                
                  <Camera className="h-5 w-5" />
                  <span className="sr-only">Presentation</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Presentation</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="outline" className="">
                <PanelLeftOpenIcon className="h-5 w-5" />
                <span className="sr-only">Toggle Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="">
              <nav className="grid gap-6 text-lg font-medium">
                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'dashboard' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'} `}
                  onClick={() => setViewing('dashboard')}
                >
                  <LayoutDashboard className="h-5 w-5" />
                  Dashboard
                </div>
                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'dataStart' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('dataStart')}
                >
                  <Database className="h-5 w-5" />
                  Data
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'upload' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('upload')}
                >
                  <HardDriveUpload className="h-5 w-5" />
                  Upload
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'integrations' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('integrations')}
                >
                  <Cable className="h-5 w-5" />
                  Integrations
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'scrape' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('scrape')}
                >
                  <Shovel className="h-5 w-5" />
                  Scrape
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'generate' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('generate')}
                >
                  <BadgePlus className="h-5 w-5" />
                  Generate Data
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'charts' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('charts')}
                >
                  <BarChart3 className="h-5 w-5" />
                  Charts
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'gallery' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('gallery')}
                >
                  <Gem className="h-5 w-5" />
                  Gallery
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'ai' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('ai')}
                >
                  <Bot className="h-5 w-5" />
                  AI
                </div>

                <div
                  className={`flex items-center gap-4 px-2.5 ${viewing === 'presentation' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('presentation')}
                >
                  <Camera className="h-5 w-5" />
                  Presentation
                </div>
              </nav>
              <nav className="absolute mt-auto bottom-20 pr-8">
                <Card>
                  <CardHeader className="p-2 pt-0 md:p-4">
                    <CardTitle>Upgrade to Pro</CardTitle>
                    <CardDescription>
                      $69.99 One time payment for Life Time access
                      (other options also available)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-2 pt-0 md:p-4 md:pt-0">
                    <Button size="sm" className="w-full">
                      Upgrade
                    </Button>
                  </CardContent>
                </Card>
              </nav>
            </SheetContent>
          </Sheet>        
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              {
                /* Get Pro  */
              }
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-lg  hover:text-foreground md:h-8 md:w-8 ${viewing === 'subscribe' ?  'bg-accent text-accent-foreground': 'text-muted-foreground transition-colors cursor-pointer'}`}
                  onClick={()=>setViewing('subscribe')}
                >                
                  <Zap className="h-5 w-5" />
                  <span className="sr-only">Subscribe</span>
                </div>
            </TooltipTrigger>
            <TooltipContent side="right">Go Pro</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </>
      
  )
}

export default SideNav
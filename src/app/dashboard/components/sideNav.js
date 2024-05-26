import Image from "next/image"
import Link from "next/link"
import {
  Database,
  HardDriveUpload,
  LayoutDashboard,
  BadgePlus,
  Shovel,
  Cable,
  BarChart3,
  Gem,
  Bot,
  Camera,
  FilePlus2,
} from "lucide-react"

import { useMyStateV2  } from '@/context/stateContextV2'

import { Button } from "@/components/ui/button"

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { FaCircle } from "react-icons/fa"

const SideNav = () => {
  
  const contextStateV2 = useMyStateV2()

  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing

  return (
            <div className="px-2 min-h-screen flex flex-col">
              <nav className="grid gap-6 text-xs font-medium">
                <div className="flex place-content-center pt-8">
                  <Link
                    href="/dashboard"
                    className="group flex h-9 w-9 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
                  >
                    <Image src={"/fruit.png"} width={15} height={6} alt={'logo'}/>
                  </Link>
                </div>                
                <div
                  className={`cursor-pointer flex items-center gap-4 px-2.5 ${viewing === 'dashboard' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'} `}
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
                  Data Sheet
                </div>

                <div
                  className={`flex items-center gap-4 pl-6 px-2.5 ${viewing === 'upload' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('upload')}
                >
                  <HardDriveUpload className="h-5 w-5" />
                  Upload
                </div>

                <div
                  className={`flex items-center gap-4 pl-6 px-2.5 ${viewing === 'integrations' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('integrations')}
                >
                  <Cable className="h-5 w-5" />
                  Integrations
                </div>

                <div
                  className={`flex items-center gap-4 pl-6 px-2.5 ${viewing === 'scrape' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('scrape')}
                >
                  <Shovel className="h-5 w-5" />
                  Scrape
                </div>

                <div
                  className={`flex items-center gap-4 pl-6 px-2.5 ${viewing === 'generate' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('generate')}
                >
                  <BadgePlus className="h-5 w-5" />
                  Generate Data
                </div>
                <div
                  className={`flex items-center gap-4 pl-6 px-2.5 ${viewing === 'generate' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground cursor-pointer'} `}
                  onClick={() => setViewing('generate')}
                >
                  <FilePlus2 className="h-5 w-5" />
                  New Sheet
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
              <div className="mt-auto mb-10 w-40">
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-xl text-green-500 text-center">50% off</CardTitle>
                    <CardDescription>
                      <div className="text-sm text-center">$69.99</div>
                      <div className="pb-1 text-xs text-center">One Time Payment <br /> Life Time Access</div>
                      <div className="line-through text-xs text-center">$150</div>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="w-full text-xs">
                    <div className="p-3 bg-slate-100/80 rounded-md">Bonus: $100/month of Free AI credits, for life, on the house</div>
                    <div className="flex py-2 place-content-center">
                      <Button size="sm" className="text-xs">
                        See Pricing
                      </Button>
                    </div>
                    <div className="text-[10px] flex gap-2 place-items-center"><FaCircle className="text-green-400 animate-pulse" /> 39 seats remaining before price increase</div>
                  </CardContent>
                </Card>
              </div>
            </div>   
        )
      }

export default SideNav
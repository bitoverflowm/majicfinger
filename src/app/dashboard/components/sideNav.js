import Image from "next/image"
import Link from "next/link"

import { useState } from 'react';

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
  PowerIcon,
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
import { BiLeftArrow, BiRightArrow } from "react-icons/bi";

const SideNav = () => {
  
  const contextStateV2 = useMyStateV2()

  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing

  const [minimized, setMinimized] = useState(false);

  const viewHandler = e => {
    setViewing(e)
    setMinimized(true)
  }

  return (
    <div className={`px-2 h-screen flex flex-col transition-all duration-300 ${minimized ? 'w-16' : 'w-48'}`}>
    <nav className="text-xs font-medium">
      <div className="flex place-content-center pt-8">
        <div className="flex mb-6 h-9 w-9 items-center justify-center rounded-full bg-primary md:h-8 md:w-8">
          <Image src="/fruit.png" width={15} height={6} alt="logo" />
        </div>
      </div>
      <div onClick={() => setMinimized(!minimized)} className="top-4 right-4 p-2 bg-gray-100 rounded z-20 text-black cursor-pointer">
        {minimized ? <div className="flex place-items-center gap-4 pl-2"><BiRightArrow /> </div> : <div className="flex place-items-center gap-4 pl-2"><BiLeftArrow />Collapse</div>}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'dashboard' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('dashboard')}
      >
        <LayoutDashboard className="h-5 w-5" />
        {!minimized && 'Dashboard'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'dataStart' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('dataStart')}
      >
        <Database className="h-5 w-5" />
        {!minimized && 'Data Sheet'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'upload' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('upload')}
      >
        <HardDriveUpload className="h-5 w-5" />
        {!minimized && 'Upload'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'integrations' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('integrations')}
      >
        <Cable className="h-5 w-5" />
        {!minimized && 'Integrations'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'scrape' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('scrape')}
      >
        <Shovel className="h-5 w-5" />
        {!minimized && 'Scrape'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'generate' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('generate')}
      >
        <BadgePlus className="h-5 w-5" />
        {!minimized && 'Generate Data'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'newSheet' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('newSheet')}
      >
        <FilePlus2 className="h-5 w-5" />
        {!minimized && 'New Sheet'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'charts' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('charts')}
      >
        <BarChart3 className="h-5 w-5" />
        {!minimized && 'Charts'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'gallery' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('gallery')}
      >
        <Gem className="h-5 w-5" />
        {!minimized && 'Gallery'}
      </div>
      <div
        className={`cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'ai' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('ai')}
      >
        <Bot className="h-5 w-5" />
        {!minimized && 'AI'}
      </div>
      <div
        className={`hidden cursor-pointer flex items-center gap-4 px-2.5 py-2 ${viewing === 'presentation' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'}`}
        onClick={() => viewHandler('presentation')}
      >
        <Camera className="h-5 w-5" />
        {!minimized && 'Presentation'}
      </div>
    </nav>
    <div className="mt-auto mb-5 w-full">
      {
        minimized ? <div className="bg-purple-600 flex place-items-center place-content-center p-2 rounded-sm text-white hover:bg-yellow-400 cursor-pointer hover:text-purple-600" onClick={()=>setViewing('pricing')}><PowerIcon /> </div>
                : <Card onClick={() => viewHandler('pricing')}>
                    <CardHeader className="pt-2 pb-1 bg-green-100">
                      <CardTitle className="text-md text-green-600 font-black text-center">85% off lifetime access</CardTitle>
                    </CardHeader>
                    <CardContent className="w-full text-[10px] pt-2">
                      <div className="text-sm text-center flex place-items-center place-content-center gap-1">
                        $29.99 <div className="line-through text-[10px] text-center">$199.99</div>
                      </div>
                      <div className="pb-1 text-[10px] text-center">One Time Payment </div>
                      <div className="pt-1">Bonus: 100 tokens/month for life, on the house</div>
                      <div className="flex py-2 place-content-center">
                        <Button size="xs" className="text-[10px]">See Pricing</Button>
                      </div>
                      <div className="text-[10px] flex gap-2 place-items-center">
                        <FaCircle className="text-green-400 animate-pulse" /> 27 seats remaining before price increase
                      </div>
                    </CardContent>
                  </Card>
      }
    </div>
  </div>
        )
      }

export default SideNav
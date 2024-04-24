
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { HandIcon, UpdateIcon, PaperPlaneIcon, CheckIcon, OpenInNewWindowIcon } from "@radix-ui/react-icons"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarTrigger,
} from "@/components/ui/menubar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button";

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"

import { toast } from 'sonner'

import { useMyState  } from '@/context/stateContext'

import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import RetroGrid from "@/components/magicui/retro-grid";
import DotPattern from "@/components/magicui/dot-pattern";
import AnimatedGradientText from "@/components/magicui/animated-gradient-text";


import KatsuColors from '@/components/panels/katsu_colors';
import Backgrounds from '@/components/panels/backgrounds';
import IconSelector from '@/components/icons/iconSelector';

import { colorPalettes } from '@/components/chartView/panels/colorPalette';
import { SaveHeaader } from "./saveHeader";
import { KatsuPay } from "./katsuPay";
import { TagMe } from "./tagMe";

export function BentoBase({data, demo}) {
  const contextState = useMyState()

  const [drawerOpen, setDrawerOpen] = useState()
  const [option, setOption] = useState()
  const [saving, setSaving] = useState(false)

  const bentoContainer = contextState?.bentoContainer
  const setBentoContainer = contextState?.setBentoContainer
  const setData = contextState?.setData

  const editBentoContainer = (field, val) => {
    setBentoContainer(prevState => ({
      ...prevState,
      [field] : val
    }))
    toast('Success', {
      description: `${field} updated to ${val}`,
      closeButton: true,
      duration: 9000
    });
    setDrawerOpen(false)
  }

  const drawerOpenHandler = (option) => {
    setDrawerOpen(true)
    setOption(option)
  }

  const ramdomColorHandler = (demo) => {
    const randomIndex = Math.floor(Math.random() * colorPalettes.length); // Random index from 0 to length-1
    const selectedPalette = colorPalettes[randomIndex];
    setBentoContainer(prevState => ({
      ...prevState,
      background_color: selectedPalette[0] // Randomly selects one of the colors for the background
    }));
    // Update each Bento card with colors from the palette
    setData(prevData => {
      return prevData.map((item, index) => ({
          ...item,
          background_color: selectedPalette[index % selectedPalette.length], // Cycles through the palette
          icon_style: {
              ...item.icon_style,
              color: selectedPalette[(index + 1) % selectedPalette.length] // Ensures different color for icon
          },
          heading_style: {
              ...item.heading_style,
              color: selectedPalette[(index + 1) % selectedPalette.length]
          },
          description_style: {
              ...item.description_style,
              color: selectedPalette[(index + 1) % selectedPalette.length]
          }
      }));
    });
    !(demo) && toast('❤️', {
      description: `We randomized your colors`,
      closeButton: true,
      duration: 9000
    });
  }

  useEffect(() => {
    let intervalId;

    if (demo) {
      intervalId = setInterval(() => {
        ramdomColorHandler(demo);
      }, 3000); // Runs every 3 seconds
    }

    // Cleanup function to clear the interval when the component unmounts or the `demo` prop changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [demo]); 

  const lycheeList = [
    "Chart your data in <0.32 seconds",
    "Connect directly to any data set no more downloading CSVs",
    "Plug directly into Twitter, Instagram, Youtube, Stripe data, etc",
    "Use Lychee AI to draw unparalleled insights from your data",
    "Present your data in beautiful Bento formats using Katsu",
    "You vote on it I build it",
  ]
  
  return (
    <div className="bg-white">
      {
        !(demo) && 
          <div>
            <div className="w-fit mb-4 flex place-items-center gap-4 ">
              <Label htmlFor="">Container Options</Label>
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>Background</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem onClick={()=>editBentoContainer('background', '')}>
                      Clear
                    </MenubarItem>
                    {/*<MenubarItem onClick={()=>editBentoContainer('background', 'retroGrid')}>
                      Retro Grid
                    </MenubarItem>*/}
                    <MenubarItem onClick={()=>editBentoContainer('background', 'dotPattern')}>
                      Dot Pattern
                    </MenubarItem>
                    <MenubarItem onClick={()=>editBentoContainer('background', 'dotPattern2')}>
                      Dot Pattern 2
                    </MenubarItem>                    
                  </MenubarContent>
                </MenubarMenu>
                <MenubarMenu>
                  <MenubarTrigger>
                    <div className="" onClick={()=>drawerOpenHandler('background_color')}>Background Color</div>
                  </MenubarTrigger>
                </MenubarMenu>
              </Menubar>
              <Button onClick={()=>ramdomColorHandler()}>
                  Color Routlette 🎨
              </Button>
              <div>
                <Label htmlFor="font-size" className="text-right pr-1">
                  Save
                </Label>
                <Button variant={"outline"} size="icon" onClick={()=>setSaving(true)}>
                  <PaperPlaneIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
      }
      
      
      { saving ?
        <div>
          <KatsuPay />
          <h1 className="text-center text-4xl">or</h1>
          <div className="grid grid-cols-2">
            <div>
              <SaveHeaader />
            </div>
            <div className="my-auto pl-8">
              {lycheeList && lycheeList.length > 0 && (
                  <ul className="flex flex-col gap-2 font-normal">
                    {lycheeList.map((idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-xs font-medium text-black dark:text-white"
                      >
                        <CheckIcon className="h-5 w-5 shrink-0 rounded-full bg-green-400 p-[2px] text-black dark:text-white" />
                        <span className="flex">{idx}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="my-6"><AnimatedGradientText>
                      <span
                        className={cn(
                          `inline animate-gradient bg-gradient-to-r from-[#ffaa40] via-[#9c40ff] to-[#ffaa40] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
                        )}
                      >
                        Check Lychee Out 
                      </span>
                      <OpenInNewWindowIcon className="ml-1 size-3 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
                    </AnimatedGradientText>
                </div>
            </div>
          </div>
          <h1 className="text-center text-4xl font-bold">How to use Katsu for free?</h1>
          <h3 className="text-center py-2">I understand, life happens, and not all of us can pay for things. If you want to use it for free:</h3>
          <div className="py-4 flex place-items-center place-content-center">
            <TagMe />
          </div>
        </div>
        :<div className={`gradualEffect relative flex h-full w-full items-center justify-center p-10 overflow-hidden rounded-lg border shadow-sm`} style={{ backgroundColor: bentoContainer && bentoContainer.background_color && bentoContainer.background_color}}>  
          <BentoGrid>
            {bentoContainer && bentoContainer.background === 'retroGrid' && <RetroGrid />}
            {bentoContainer && bentoContainer.background === 'dotPattern' && <DotPattern className={cn(
                "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
              )} />}
            {bentoContainer && bentoContainer.background === 'dotPattern2' && <DotPattern width={20}
              height={20}
              cx={1}
              cy={1}
              cr={1}
              className={cn(
                "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] ",
              )} />}   
              {data && data.map((feature, idx) => (
                <BentoCard key={idx} index={idx} setData={setData} {...feature} />
              ))}
          </BentoGrid>
        </div>
      }
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
            <div className="mx-auto w-full">
                <DrawerHeader>
                    <DrawerTitle>Pick a {option} from our library</DrawerTitle>
                    {option === 'SexyBackground' && <DrawerDescription>These are elements that add a little more "je ne sais quoi" to your bento</DrawerDescription>}
                    <DrawerDescription>Just click and you're done</DrawerDescription>
                </DrawerHeader>
                
                { option === 'background_color' && <KatsuColors updateBgColor={editBentoContainer}/> }
                { option === 'SexyBackground' && <Backgrounds updateBackground={editBentoContainer}/> }
                { option === 'Icons' && <IconSelector updateIcon={editBentoContainer}/> }
                
            </div>
            <DrawerFooter>
                <DrawerClose asChild>
                    <Button variant="outline">Close</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
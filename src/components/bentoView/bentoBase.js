
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef } from "react";
import { HandIcon, UpdateIcon } from "@radix-ui/react-icons"

import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
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

import { toast } from "@/components/ui/use-toast";

import { useMyState  } from '@/context/stateContext'

import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import RetroGrid from "@/components/magicui/retro-grid";
import DotPattern from "@/components/magicui/dot-pattern";

import KatsuColors from '@/components/panels/katsu_colors';
import Backgrounds from '@/components/panels/backgrounds';
import IconSelector from '@/components/icons/iconSelector';

import { colorPalettes } from '@/components/chartView/panels/colorPalette';

export function BentoBase({data, demo=true}) {
  const contextState = useMyState()

  const [drawerOpen, setDrawerOpen] = useState()
  const [option, setOption] = useState()

  const bentoContainer = contextState?.bentoContainer
  const setBentoContainer = contextState?.setBentoContainer
  const setData = contextState?.setData

  const editBentoContainer = (field, val) => {
    setBentoContainer(prevState => ({
      ...prevState,
      [field] : val
    }))
    toast({
      description: `${field} updated to ${val}`,
    });
    setDrawerOpen(false)
  }

  const drawerOpenHandler = (option) => {
    setDrawerOpen(true)
    setOption(option)
  }

  const ramdomColorHandler = () => {
    const randomIndex = Math.floor(Math.random() * colorPalettes.length); // Random index from 0 to length-1
    const selectedPalette = colorPalettes[randomIndex];
    console.log(selectedPalette)
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
    toast({
      description: "We randomized your colors with ❤️!",
    });
  }
  
  return (
    <div className="bg-white">
      {
        !(demo) && 
          <div>
            <Alert className="w-1/3 mx-auto mb-10">
              <HandIcon className="w-4 h-4"/>
              <AlertTitle>Heads up!</AlertTitle>
              <AlertDescription>
                Right click any bento card to edit.
              </AlertDescription>
            </Alert>
            <div className="w-fit mb-4 flex place-items-center gap-4 ">
              <Label htmlFor="">Bento Parent Options</Label>
              <Menubar>
                <MenubarMenu>
                  <MenubarTrigger>Background</MenubarTrigger>
                  <MenubarContent>
                    <MenubarItem onClick={()=>editBentoContainer('background', 'retroGrid')}>
                      Retro Grid
                    </MenubarItem>
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
                <MenubarMenu>
                  <MenubarTrigger>
                    <div className="" onClick={()=>ramdomColorHandler()}>Random Colors</div>
                  </MenubarTrigger>
                </MenubarMenu>
              </Menubar>
              <div>
                <Label htmlFor="font-size" className="text-right pr-1">
                  Save
                </Label>
                <Button variant={"outline"} size="icon">
                  <UpdateIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
      }
      
      <div className={`relative flex h-full w-full items-center justify-center p-10 overflow-hidden rounded-lg border shadow-sm`} style={{ backgroundColor: bentoContainer && bentoContainer.background_color && bentoContainer.background_color}}>  
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
import { useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon } from "@radix-ui/react-icons";
import { iconMap } from "../icons/iconMap";

import { useMyState  } from '@/context/stateContext'

import Globe from "./globe";

import { toast } from "@/components/ui/use-toast";

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuLabel,
} from "@/components/ui/context-menu"

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

import KatsuColors from '@/components/panels/katsu_colors';
import Backgrounds from '@/components/panels/backgrounds';

const BentoGrid = ({ children, className }) => {
  return (
    <div
      className={cn(
        "grid w-full auto-rows-[22rem] grid-cols-3 gap-4",
        className,
      )}
    >
      {children}
    </div>
  );
};

const BentoCard = ({
  index,
  heading,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  background_color
}) => {
  const contextState = useMyState()
  const setData = contextState?.setData;
  const data = contextState?.data;

  const IconComponent = iconMap[Icon]

  const [bgColorOpen, setBgColorOpen] = useState(false)

    
  const clickHandler = () => {
    toast({
      description: `Feature clicked!`,
    });
  };

  const updateCellData = (field, newValue, closer) => {
    console.log('updating: ', index, field, newValue)
    setData(prevData => {
      // Create a new array with updated data
      const newData = prevData.map((item, id) => {
        if (id === index) {
          return { ...item, [field]: newValue }; // Update the specific field value
        }
        return item;
      });
      return newData;
    });
    toast({
      description: `${field} updated to ${newValue}`,
    });
    closer(false)
  };

  return(
    <div
      key={heading}
      className={cn(
        "group relative rounded-xl col-span-3 overflow-hidden flex flex-col justify-end",
        // light styles
        `bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]`,
        // dark styles
        "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
      style={{ backgroundColor: background_color ? background_color: '' }}
    >
      <ContextMenu>
        <ContextMenuTrigger className={`flex flex-col h-full place-content-end`}>
            <div>{background && background === "globe" && <Globe className="top-0 h-[600px] w-[600px] transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)] group-hover:scale-105 sm:left-40" />}</div>
            <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
              {IconComponent && <IconComponent className="h-12 w-12 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />}
              <div className="text-8xl font-black text-neutral-700 dark:text-neutral-300">
                {heading}
              </div>
              <p className="max-w-lg text-neutral-400">{description}</p>
            </div>

            { href && href !=="/" && href !=="" ?
              <div
              className={cn(
                "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
              )}
              >
                <Button variant="ghost" asChild size="sm" className="pointer-events-auto">
                  <Link href={href}>
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              : <div
              className={cn(
                "pointer-events-none absolute bottom-0 flex w-full translate-y-10 transform-gpu flex-row items-center p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100",
              )}
              >
                <Button variant="ghost" asChild size="sm" className="pointer-events-auto">
                  <>
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                </Button>
              </div>
            }
            <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Options:</ContextMenuLabel>
          <ContextMenuItem > <div onClick={()=>setBgColorOpen(true)} className="flex gap-3 place-items-center">Background Color: <Button variant="outline" className='h-6 w-6' disabled style={{ backgroundColor: background_color ? background_color: '' }} /> </div>
          </ContextMenuItem>
          <ContextMenuItem>Text</ContextMenuItem>
          <ContextMenuItem>Team</ContextMenuItem>
          <ContextMenuItem>Subscription</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Drawer open={bgColorOpen} onOpenChange={setBgColorOpen}>
        <DrawerContent>
            <div className="mx-auto w-full">
                <DrawerHeader>
                    <DrawerTitle>Here are the colors</DrawerTitle>
                    <DrawerDescription>Click to copy the color and paste it into background_color column to set the background color of that specific bento card</DrawerDescription>
                    <KatsuColors updateBgColor={updateCellData} setBgColorOpen={setBgColorOpen}/>
                </DrawerHeader>                            
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

export { BentoCard, BentoGrid };

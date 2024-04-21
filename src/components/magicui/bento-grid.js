import { useState } from "react";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRightIcon, FontBoldIcon, FontItalicIcon, TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon, DoubleArrowUpIcon, DoubleArrowDownIcon } from "@radix-ui/react-icons";


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

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"

import KatsuColors from '@/components/panels/katsu_colors';
import Backgrounds from '@/components/panels/backgrounds';
import IconSelector from '@/components/icons/iconSelector';

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
  setData,
  heading,
  heading_style,
  className,
  background,
  Icon,
  description,
  href,
  cta,
  background_color
}) => {
  //const contextState = useMyState()
  //const setData = contextState?.setData;
  //const data = contextState?.data;

  const IconComponent = iconMap[Icon]

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [option, setOption] = useState()
  const [textEditOpen, setTextEditOpen] = useState(false)

  const updateCellData = (field, newValue) => {
    //console.log('updating: ', index, field, newValue)
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
    if(drawerOpen){
      toast({
        description: `${field} updated to ${newValue}`,
      });
      setDrawerOpen(false)
    }else{

    }    
  };

  const updateTypography = (typeField, newValue) => {
    //eval step
    //console.log(typeField, newValue)
    if(typeField === 'fontWeight'){
      newValue = newValue ? 900 : 500
    }else if(typeField === 'fontStyle'){
      newValue = newValue ? 'italic': 'normal'
    }else if(typeField === 'textLeft'){
      typeField = 'textAlign'
      newValue = 'left'
    }else if(typeField === 'textCenter'){
      typeField = 'textAlign'
      newValue = 'center'
    }else if(typeField === 'textRight'){
      typeField = 'textAlign'
      newValue = 'right'
    } else if(typeField === 'fontSizeIncrease'){
      typeField = 'fontSize'
      newValue = String(parseInt(heading_style.fontSize) + 10) +'px' 
    } else if(typeField === 'fontSizeDecrease'){
      typeField = 'fontSize'
      newValue = String(parseInt(heading_style.fontSize) - 10) +'px' 
    } else if(typeField === 'headingColor'){
      typeField = 'color'
      setDrawerOpen(false)
    }
    setData( prevData => {
        const newData = prevData.map((item, id) => {
          if(id === index){
            return {
                    ...item, 
                    heading_style: {
                      ...item.heading_style,
                      [typeField] : newValue 
                    }
                };
          }
          return item;
        });
        return newData;
      });
  }

  const drawerOpenHandler = (option) => {
    setDrawerOpen(true)
    setOption(option)
  }

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
              <div className={`text-8xl text-neutral-700 dark:text-neutral-300`} style={heading_style && heading_style}>
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
          <ContextMenuItem > 
            <div onClick={()=>drawerOpenHandler('BackgroundColor')} className="flex gap-3 place-items-center">Background Color: <Button variant="outline" className='h-6 w-6' disabled style={{ backgroundColor: background_color ? background_color: '' }} /> </div>
          </ContextMenuItem>
          <ContextMenuItem> <div onClick={()=>drawerOpenHandler('SexyBackground')} className="flex gap-3 place-items-center">😻 Sexy Backgrounds: {background ? background : 'none selected'} </div></ContextMenuItem>
          <ContextMenuItem> <div onClick={()=>drawerOpenHandler('Icons')} className="flex gap-3 place-items-center">Icon: {IconComponent && <IconComponent className="h-4 w-4 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />} </div></ContextMenuItem>
          <ContextMenuItem><div onClick={()=>setTextEditOpen(true)} className="flex w-full">Text</div></ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
            <div className="mx-auto w-full">
                <DrawerHeader>
                    <DrawerTitle>Pick a {option} from our library</DrawerTitle>
                    {option === 'SexyBackground' && <DrawerDescription>These are elements that add a little more "je ne sais quoi" to your bento</DrawerDescription>}
                    <DrawerDescription>Just click and you're done</DrawerDescription>
                </DrawerHeader>
                
                { option === 'BackgroundColor' && <KatsuColors updateBgColor={updateCellData}/> }
                { option === 'SexyBackground' && <Backgrounds updateBackground={updateCellData}/> }
                { option === 'Icons' && <IconSelector updateIcon={updateCellData}/> }
                { option === 'HeadingColor' && <KatsuColors updateBgColor={updateTypography} mod={'headingColor'}/> }
                
            </div>
            <DrawerFooter>
                <DrawerClose asChild>
                    <Button variant="outline">Close</Button>
                </DrawerClose>
            </DrawerFooter>
        </DrawerContent>
      </Drawer>

      { textEditOpen &&
            <div className="absolute right-0 z-10 h-full w-5/6 pl-4 flex flex-col place-items-center place-content-center bg-slate-200/30 backdrop-blur-md">
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-10 items-center gap-1">
                      <Label htmlFor="heading" className="text-right">
                        Main
                      </Label>
                      <Input
                        id="heading"
                        defaultValue={heading}
                        className="col-span-4"
                        onChange={(e)=>updateCellData('heading', e.target.value)}
                      />
                      <Button variant={heading_style && heading_style.fontWeight === 900 ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontWeight', heading_style.fontWeight === 900 ? false: true )}>
                        <FontBoldIcon className="h-4 w-4"/>
                      </Button>
                      <Button variant={heading_style && heading_style.fontStyle === 'italic' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontStyle', heading_style.fontStyle === 'italic' ? false: true )}>
                        <FontItalicIcon className="h-4 w-4" />
                      </Button>
                      <div className="flex col-span-3 px-2 gap-1">
                        <Button variant={heading_style && heading_style.textAlign === 'left' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textLeft', heading_style.fontStyle === 'left' ? false: true )}>
                          <TextAlignLeftIcon className="h-4 w-4" />
                        </Button>
                        <Button variant={heading_style && heading_style.textAlign === 'center' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textCenter', heading_style.fontStyle === 'center' ? false: true )}>
                          <TextAlignCenterIcon className="h-4 w-4" />
                        </Button>
                        <Button variant={heading_style && heading_style.textAlign === 'right' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textRight', heading_style.fontStyle === 'right' ? false: true )}>
                          <TextAlignRightIcon className="h-4 w-4" />
                        </Button>                      
                      </div>
                    </div>
                    <div className="grid grid-cols-10 items-center gap-1">
                      <div className="col-span-4 flex px-2 gap-1 place-items-center">
                        <Label htmlFor="font-size" className="text-right pr-1">
                          Font Size
                        </Label>
                        <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeIncrease')}>
                          <DoubleArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeDecrease')}>
                          <DoubleArrowDownIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-4 flex px-2 gap-1 place-items-center">
                        <Label htmlFor="font-size" className="text-right pr-1">
                          Color
                        </Label>
                        <div onClick={()=>drawerOpenHandler('HeadingColor')} className="flex gap-3 place-items-center"><Button variant="outline" className='h-6 w-6' disabled style={{ backgroundColor: heading_style && heading_style.color ? heading_style.color: '' }} /> </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                      <Label htmlFor="username" className="text-right">
                        Sub
                      </Label>
                      <Input
                        id="description"
                        defaultValue={description}
                        className="col-span-3"
                        onChange={(e)=>updateCellData('description', e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="cursor-pointer mt-10 p-3 rounded-full hover:text-lychee-red hover:bg-white" onClick={()=>setTextEditOpen(false)}>Close</div>
            </div>
        }
    </div>
  );
}

export { BentoCard, BentoGrid };

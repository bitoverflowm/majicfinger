import { useEffect, useState } from "react";

import Link from "next/link";
import { ArrowRightIcon, FontBoldIcon, FontItalicIcon, TextAlignLeftIcon, TextAlignCenterIcon, TextAlignRightIcon, DoubleArrowUpIcon, DoubleArrowDownIcon, ExitIcon } from "@radix-ui/react-icons";
import CountUp from 'react-countup';

import Globe from "./globe";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { iconMap } from "../icons/iconMap";
import { toast } from "sonner"

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  demo,
  dashView,
  heading,
  heading_style,
  className,
  background,
  Icon,
  icon_style,
  description,
  description_style,
  refType,
  href,
  cta,
  background_color,
  viewing,
  setViewing,
  navTo,
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
      toast('Success', {
        description: `${field} updated to ${newValue}`,
        closeButton: true,
        duration: 9000
      });
      setDrawerOpen(false)
    }else{

    }    
  };

  const parseNumberFromString = (value) => {
    const numberPattern = /\d+/g;  // Regex to extract digits
    let result = value.match(numberPattern);
    return result ? parseInt(result.join(''), 10) : 0;
  }

  const updateTypography = (typeField, newValue, source) => {
    //eval step
    //console.log(typeField, newValue)
    if(typeField === 'fontWeight'){
      if(source === 'heading_style'){
        newValue = newValue ? 900 : 500
      }else{
        newValue = newValue ? 500 : 100
      }
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
      if(source === 'heading_style'){
        newValue = String(parseInt(heading_style.fontSize) + 10) +'px' 
      }else{
        newValue = String(parseInt(description_style.fontSize) + 10) +'px' 
      }      
    } else if(typeField === 'fontSizeDecrease'){
      typeField = 'fontSize'
      if(source === 'heading_style'){
        newValue = String(parseInt(heading_style.fontSize) - 10) +'px' 
      }else{
        newValue = String(parseInt(description_style.fontSize) - 10) +'px' 
      }
    } else if(typeField === 'headingColor'){
      typeField = 'color'
      source = 'heading_style'
      setDrawerOpen(false)
    } else if(typeField === 'descriptionColor'){
      typeField = 'color'
      source = 'description_style'
      setDrawerOpen(false)
    } else if(typeField ==='iconColor'){
      typeField = 'color'
      source = 'icon_style'
      setDrawerOpen(false)
    }
    setData( prevData => {
        const newData = prevData.map((item, id) => {
          if(id === index){
            if(source === 'heading_style'){
              return {
                ...item, 
                heading_style: {
                  ...item.heading_style,
                  [typeField] : newValue 
                }
              };
            } else if(source === 'description_style') {
              return {
                ...item, 
                description_style: {
                  ...item.description_style,
                  [typeField] : newValue 
                }
            };
            } else {
              return {
                ...item, 
                icon_style: {
                  ...item.icon_style,
                  [typeField] : newValue 
                }
              }
            }            
          }
          return item;
        });
        return newData;
      });
  }

  const updateAnimation = (target, animation) => {
    console.log(target, animation);
    setData( prevData => {
      const newData = prevData.map((item, id) => {
        if(id === index){
          return {
                  ...item, 
                  heading_style: {
                    ...item.heading_style,
                    "animation" : animation
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

  useEffect(()=> {
    if(['countUp', 'countDown'].includes(heading_style.animation) && !demo){
      parseInt(heading) ? '' :  toast('Headsup ', {
          description: `${heading} : You can't add countup or countdown animation to text only`,
          closeButton: true,
          duration: 90000
        });
      }
  }, [heading, heading_style, demo ])

  return(
    <div
      key={index}
      className={cn(
        "internalGradualEffect group relative rounded-xl col-span-3 overflow-hidden flex flex-col justify-end cursor-pointer",
        // light styles
        `bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]`,
        // dark styles
        "transform-gpu dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
        className,
      )}
      style={{ backgroundColor: background_color ? background_color: '' }}
      onClick={()=>setViewing(navTo)}
    >
      <ContextMenu>
        <ContextMenuTrigger  className={`flex flex-col h-full place-content-end`}>
            <div>{background && background === "globe" && <Globe className="top-0 h-[600px] w-[600px] transition-all duration-300 ease-out [mask-image:linear-gradient(to_top,transparent_30%,#000_100%)] group-hover:scale-105 sm:left-40" />}</div>
            <div className="pointer-events-none z-10 flex transform-gpu flex-col gap-1 p-6 transition-all duration-300 group-hover:-translate-y-10">
              {IconComponent && <IconComponent className="origin-left transform-gpu transition-all duration-300 ease-in-out group-hover:scale-75" style={icon_style && icon_style} />}
              <div className={`text-8xl text-neutral-700 dark:text-neutral-300`} style={heading_style && heading_style}>
                {heading_style && ['countUp', 'countDown'].includes(heading_style.animation) && parseInt(heading) ? <CountUp
                        start={heading_style.animation === 'countUp' ? 0: parseFloat(heading.replace(/[^0-9-.]/g, ''))} 
                        end={heading_style.animation === 'countUp' ? parseFloat(heading.replace(/[^0-9-.]/g, '')) : 0} // removes any non-numeric characters except minus and decimal
                        prefix={heading.includes('$') ? '$' : ''}
                        suffix={heading.includes('%') ? '%' : ''}
                        separator=","
                        decimals={heading.includes('.') ? 2 : 0}
                        decimal="."
                        duration={2.75}
                        useEasing={true}
                        useGrouping={true}
                        startOnMount={true}  // Starts count up when the component mounts
                        redraw={true}
                      /> : heading }
              </div>
              <p className="max-w-lg text-neutral-400" style={description_style && description_style}>{description}</p>
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
                <div variant="ghost" asChild size="sm" className="flex place-items-center cursor-pointer pointer-events-auto" >
                  <>
                    {cta}
                    <ArrowRightIcon className="ml-2 h-4 w-4" />
                  </>
                </div>
              </div>
            }
            <div className="pointer-events-none absolute inset-0 transform-gpu transition-all duration-300 group-hover:bg-black/[.03] group-hover:dark:bg-neutral-800/10" />
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuLabel>Options:</ContextMenuLabel>
          <ContextMenuItem><div onClick={()=>setTextEditOpen(true)} className="flex w-full">Text</div></ContextMenuItem>
          <ContextMenuItem> <div onClick={()=>drawerOpenHandler('SexyBackground')} className="flex gap-3 place-items-center">Special Effect {background ? background : 'none'} </div></ContextMenuItem>
          <ContextMenuItem > 
            <div onClick={()=>drawerOpenHandler('BackgroundColor')} className="flex gap-3 place-items-center">Background Color: <Button variant="outline" className='h-6 w-6' disabled style={{ backgroundColor: background_color ? background_color: '' }} /> </div>
          </ContextMenuItem>          
          <ContextMenuItem> <div onClick={()=>drawerOpenHandler('Icons')} className="flex gap-3 place-items-center">Icon: {IconComponent && <IconComponent className="h-4 w-4 origin-left transform-gpu text-neutral-700 transition-all duration-300 ease-in-out group-hover:scale-75" />} </div></ContextMenuItem>
          <ContextMenuItem>
            <div onClick={()=>drawerOpenHandler('IconColor')} className="flex gap-3 place-items-center">Icon Color:  <Button variant="outline" className='h-6 w-6' disabled style={{ backgroundColor: icon_style && icon_style.color ? icon_style.color: '' }} /></div>
          </ContextMenuItem>          
        </ContextMenuContent>
      </ContextMenu>
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent>
            <div className="mx-auto w-full">
                <DrawerHeader>
                    <DrawerTitle>Pick a {option} from our library</DrawerTitle>
                    {option === 'SexyBackground' && <DrawerDescription>These are elements that add a little more "je ne sais quoi" to your bento</DrawerDescription>}
                </DrawerHeader>
                
                { option === 'BackgroundColor' && <KatsuColors updateBgColor={updateCellData}/> }
                { option === 'SexyBackground' && <Backgrounds updateBackground={updateCellData}/> }
                { option === 'Icons' && <IconSelector updateIcon={updateCellData}/> }
                { option === 'HeadingColor' && <KatsuColors updateBgColor={updateTypography} mod={'headingColor'}/> }
                { option === 'DescriptionColor' && <KatsuColors updateBgColor={updateTypography} mod={'descriptionColor'}/> }
                { option === 'IconColor' && <KatsuColors updateBgColor={updateTypography} mod={'iconColor'}/> }
                
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
                  <div className="grid gap-1">
                    <div className="p-1">
                      <Label htmlFor="heading" className="">
                        Main
                      </Label>
                      <div className="grid grid-cols-10 items-center gap-1">  
                        <Input
                          key="heading-input"
                          id="heading"
                          value={heading ? heading : ''}
                          className="col-span-4"
                          onChange={(e)=>updateCellData('heading', e.target.value)}
                        />
                        <Button variant={heading_style && heading_style.fontWeight === 900 ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontWeight', heading_style.fontWeight === 900 ? false: true, 'heading_style' )}>
                          <FontBoldIcon className="h-4 w-4"/>
                        </Button>
                        <Button variant={heading_style && heading_style.fontStyle === 'italic' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontStyle', heading_style.fontStyle === 'italic' ? false: true, 'heading_style' )}>
                          <FontItalicIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex col-span-3 px-2 gap-1">
                          <Button variant={heading_style && heading_style.textAlign === 'left' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textLeft', heading_style.fontStyle === 'left' ? false: true, 'heading_style' )}>
                            <TextAlignLeftIcon className="h-4 w-4" />
                          </Button>
                          <Button variant={heading_style && heading_style.textAlign === 'center' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textCenter', heading_style.fontStyle === 'center' ? false: true, 'heading_style' )}>
                            <TextAlignCenterIcon className="h-4 w-4" />
                          </Button>
                          <Button variant={heading_style && heading_style.textAlign === 'right' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textRight', heading_style.fontStyle === 'right' ? false: true, 'heading_style' )}>
                            <TextAlignRightIcon className="h-4 w-4" />
                          </Button>                      
                        </div>
                      </div>
                      <div className="grid grid-cols-10 items-center gap-1">
                        <div className="col-span-2 gap-1 place-items-center">
                            <Label htmlFor="font-size" className="text-right pr-1">
                              Font Size
                            </Label>
                          <div>
                          <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeIncrease', 'val','heading_style')}>
                            <DoubleArrowUpIcon className="h-4 w-4" />
                          </Button>
                          <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeDecrease', 'val', 'heading_style')}>
                            <DoubleArrowDownIcon className="h-4 w-4" />
                          </Button>
                          </div>
                        </div>
                        <div className="col-span-1 px-2 place-items-center">
                          <Label htmlFor="font-size" className="">
                            Color
                          </Label>
                          <Button onClick={()=>drawerOpenHandler('HeadingColor')} size="icon" variant="outline" style={{ backgroundColor: heading_style && heading_style.color ? heading_style.color: '' }} />
                        </div>
                        <div className="px-6 -mt-1">
                          <Label htmlFor="animation" className="text-right pr-1">
                            Animate
                          </Label>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" className="py-1">{heading_style.animation}</Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56">
                              <DropdownMenuLabel> Pick An Animation </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuRadioGroup value={heading_style.animation} onValueChange={(value)=>updateAnimation('heading_style', value)}>
                                <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="countUp">Count Up</DropdownMenuRadioItem>
                                <DropdownMenuRadioItem value="countDown">Count Down</DropdownMenuRadioItem>
                              </DropdownMenuRadioGroup>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                    <div className="p-1">
                      <Label htmlFor="description">
                        Description
                      </Label>
                      <div className="grid grid-cols-10 items-center gap-1">
                        <Input
                          key="description-input"
                          id="description"
                          value={description ? description : ''}
                          className="col-span-4"
                          onChange={(e)=>updateCellData('description', e.target.value)}
                        />
                        <Button variant={description_style && description_style.fontWeight === 500 ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontWeight', description_style.fontWeight === 500 ? false: true, 'description_style' )}>
                          <FontBoldIcon className="h-4 w-4"/>
                        </Button>
                        <Button variant={description_style && description_style.fontStyle === 'italic' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('fontStyle', description_style.fontStyle === 'italic' ? false: true, 'description_style' )}>
                          <FontItalicIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex col-span-3 px-2 gap-1">
                          <Button variant={description_style && description_style.textAlign === 'left' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textLeft', description_style.fontStyle === 'left' ? false: true, 'description_style' )}>
                            <TextAlignLeftIcon className="h-4 w-4" />
                          </Button>
                          <Button variant={description_style && description_style.textAlign === 'center' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textCenter', description_style.fontStyle === 'center' ? false: true , 'description_style')}>
                            <TextAlignCenterIcon className="h-4 w-4" />
                          </Button>
                          <Button variant={description_style && description_style.textAlign === 'right' ? "outlineSelected": "outline"} size="icon" onClick={()=> updateTypography('textRight', description_style.fontStyle === 'right' ? false: true, 'description_style' )}>
                            <TextAlignRightIcon className="h-4 w-4" />
                          </Button>                      
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-10 items-center gap-1">
                      <div className="col-span-4 flex px-2 gap-1 place-items-center">
                        <Label htmlFor="font-size" className="text-right pr-1">
                          Font Size
                        </Label>
                        <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeIncrease', 'val', 'description_style')}>
                          <DoubleArrowUpIcon className="h-4 w-4" />
                        </Button>
                        <Button variant={"outline"} size="icon" onClick={()=> updateTypography('fontSizeDecrease','val' ,'description_style')}>
                          <DoubleArrowDownIcon className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="col-span-2 flex px-2 gap-1 place-items-center">
                        <Label htmlFor="font-size" className="text-right pr-1">
                          Font Color
                        </Label>
                        <div  className="flex gap-3 place-items-center"><Button variant="outline" size={'icon'} style={{ backgroundColor: description_style && description_style.color ? description_style.color: '' }} onClick={()=>drawerOpenHandler('DescriptionColor')}/> </div>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" size='icon' className="absolute top-2 right-2 cursor-pointer" onClick={()=>setTextEditOpen(false)}><ExitIcon /></Button>
            </div>
        }
    </div>
  );
}

export { BentoCard, BentoGrid };

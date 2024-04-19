import { Calendar } from "@/components/ui/calendar";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import Marquee from "@/components/magicui/marquee";

import { useState, useEffect } from "react";

import { HandIcon } from "@radix-ui/react-icons"

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


import RetroGrid from "@/components/magicui/retro-grid";
import DotPattern from "@/components/magicui/dot-pattern";

export function BentoDemo({data, demo=true}) {

  const [mainBg, setMainBg] = useState()
  
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
          <div className="w-fit mb-4">
            <Menubar>
              <MenubarMenu>
                <MenubarTrigger>Background</MenubarTrigger>
                <MenubarContent>
                  <MenubarItem onClick={()=>setMainBg('retroGrid')}>
                    Retro Grid
                  </MenubarItem>
                  <MenubarItem onClick={()=>setMainBg('dotPattern')}>
                    Dot Pattern
                  </MenubarItem>
                  <MenubarItem onClick={()=>setMainBg('dotPattern2')}>
                    Dot Pattern 2
                  </MenubarItem>
                  
                </MenubarContent>
              </MenubarMenu>
              <MenubarMenu>
                <MenubarTrigger>
                  Randomize Colors
                </MenubarTrigger>
              </MenubarMenu>         
            </Menubar>
          </div>
        </div>
      }
      
      <div className="relative flex h-full w-full items-center justify-center p-10 overflow-hidden rounded-lg border bg-background shadow-sm">  
        <BentoGrid>
          {mainBg === 'retroGrid' && <RetroGrid />}
          {mainBg === 'dotPattern' && <DotPattern className={cn(
              "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
            )} />}
          {mainBg === 'dotPattern2' && <DotPattern width={20}
            height={20}
            cx={1}
            cy={1}
            cr={1}
            className={cn(
              "[mask-image:linear-gradient(to_bottom_right,white,transparent,transparent)] ",
            )} />}   
            {data && data.map((feature, idx) => (
              <BentoCard key={idx} index={idx} {...feature} />
            ))}
        </BentoGrid>
      </div>
    </div>
  );
}












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


import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarShortcut,
  MenubarTrigger,
} from "@/components/ui/menubar"

import RetroGrid from "@/components/magicui/retro-grid";
import DotPattern from "@/components/magicui/dot-pattern";

export function BentoDemo({data}) {

  const [mainBg, setMainBg] = useState()
  
  return (
    <div className="relative flex flex-col h-full w-full items-center justify-center overflow-hidden rounded-lg border bg-background p-20 shadow-sm">
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
      <div className="w-1/2 pt-3 pb-12 z-40">
        <Menubar>
          <MenubarMenu>
            <MenubarTrigger>Change Bento Background</MenubarTrigger>
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
              Right Each Box For Granular Edits
            </MenubarTrigger>
          </MenubarMenu>         
        </Menubar>
      </div>

      

      
      <BentoGrid>
          {data && data.map((feature, idx) => (
            <BentoCard key={idx} {...feature} />
          ))}
      </BentoGrid>
    </div>    
  );
}












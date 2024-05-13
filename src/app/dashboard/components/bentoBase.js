
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

//shdcn
import { toast } from 'sonner'
import { Button } from "@/components/ui/button";


import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import DotPattern from "@/components/magicui/dot-pattern";

import { colorPalettes } from '@/components/chartView/panels/colorPalette';

export function BentoBase({data, dashView, demo, bentoContainer, setDashData, setBentoContainer, viewing, setViewing}) { 

    const [pause, setPause] = useState()

  const ramdomColorHandler = () => {
    const randomIndex = Math.floor(Math.random() * colorPalettes.length); // Random index from 0 to length-1
    const selectedPalette = colorPalettes[randomIndex];
    // Update each Bento card with colors from the palette
    setBentoContainer(prevState => ({
        ...prevState,
        background_color: selectedPalette[0] // Randomly selects one of the colors for the background
      }));
    setDashData(prevData => {
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
  }

  useEffect(() => {
    let intervalId;

    if (!pause) {
      intervalId = setInterval(() => {
        ramdomColorHandler();
      }, 2000); //2000 // Runs every 3 seconds
    }

    // Cleanup function to clear the interval when the component unmounts or the `demo` prop changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [pause]); 

  
  return (
    <>
        <Button onClick={()=>setPause(!pause)}>{pause ? 'Start' : 'Pause'}</Button>
        <div className={`gradualEffect relative flex w-full items-center justify-center p-10 overflow-hidden rounded-lg border shadow-sm`} style={{ backgroundColor: bentoContainer && bentoContainer.background_color && bentoContainer.background_color}}>  
            <BentoGrid>
                <DotPattern className={cn(
                "[mask-image:radial-gradient(400px_circle_at_center,white,transparent)]",
                )} />
                {data && data.map((feature, idx) => (
                    <BentoCard key={idx} index={idx} setData={setDashData} demo={demo} dashView={dashView} viewing={viewing} setViewing={setViewing} {...feature} />
                ))}
            </BentoGrid>
        </div>
    </>
  );
}
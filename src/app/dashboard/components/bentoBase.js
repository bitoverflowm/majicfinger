
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

//shdcn
import { toast } from 'sonner'
import { Button } from "@/components/ui/button";


import { BentoCard, BentoGrid } from "@/components/magicui/bento-grid";
import DotPattern from "@/components/magicui/dot-pattern";

import { colorPalettes } from '@/components/chartView/panels/colorPalette';
import { Label } from "@/components/ui/label";
import { Pause, Play, RotateCw, Shuffle } from "lucide-react";

export function BentoBase({data, dashView, demo, bentoContainer, setDashData, setBentoContainer, viewing, setViewing}) { 

  const [pause, setPause] = useState()
  const [selectedPalette, setSelectedPalette] = useState()
  const [loading, setLoading] = useState()

  const ramdomColorHandler = () => {
    const randomIndex = Math.floor(Math.random() * colorPalettes.length);
    const newPalette = colorPalettes[randomIndex];
    
    setSelectedPalette(newPalette)
    // Update each Bento card with colors from the palette
    setBentoContainer(prevState => ({
        ...prevState,
        background_color: newPalette[getRandomIndex(newPalette)] // Randomly selects one of the colors for the background
      }));
    setDashData(prevData => {
      return prevData.map((item, index) => ({
          ...item,
          background_color: newPalette[getRandomIndex(newPalette)], // Cycles through the palette
          icon_style: {
              ...item.icon_style,
              color: newPalette[getRandomIndex(newPalette)] // Ensures different color for icon
          },
          heading_style: {
              ...item.heading_style,
              color: newPalette[getRandomIndex(newPalette)]
          },
          description_style: {
              ...item.description_style,
              color: newPalette[getRandomIndex(newPalette)]
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

  const shufflePalette = () => {
    setLoading(true)  
    if (!selectedPalette) {
        console.error("Selected palette is not defined. Please run randomColorHandler first.");
        return;
    }

    setBentoContainer(prevState => ({
      ...prevState,
      background_color: selectedPalette[getRandomIndex(selectedPalette)] // Randomly selects one of the colors for the background
    }));
    setDashData(prevData => {
      return prevData.map((item, index) => ({
          ...item,
          background_color: selectedPalette[getRandomIndex(selectedPalette)], // Cycles through the palette
          icon_style: {
              ...item.icon_style,
              color: selectedPalette[getRandomIndex(selectedPalette)] // Ensures different color for icon
          },
          heading_style: {
              ...item.heading_style,
              color: selectedPalette[getRandomIndex(selectedPalette)]
          },
          description_style: {
              ...item.description_style,
              color: selectedPalette[getRandomIndex(selectedPalette)]
          }
      }));
    });
  }

  //helper to get random index in color pallate
    const getRandomIndex = (array) => {
      return Math.floor(Math.random() * array.length);
    }

  
  return (
    <>
        <div className="flex gap-2 place-items-center py-2 place-content-end w-full">
          <Label htmlFor="color_wheel" className="text-xs">Color Wheel</Label>
          <Button onClick={()=>setPause(!pause)} variant="outline" id="color_wheel" size="icon">
            {pause ? <Play className="h-4 w-4"/> : <Pause className="h-4 w-4" />}</Button>
          <Button onClick={()=>ramdomColorHandler()} disable={!pause} variant="outline" id="color_wheel" size="icon">
            <RotateCw className="h-4 w-4"/></Button> 
          <Button onClick={()=>shufflePalette()} disable={!pause} variant="outline" id="color_wheel" size="icon">
            <Shuffle className="h-4 w-4"/></Button> 
        </div>
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

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
      }, 3000); //2000 // Runs every 3 seconds
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

  useEffect(()=>{
    selectedPalette && console.log(selectedPalette)
  }, [data])

  const copyPaletteToClipboard = () => {
    if (selectedPalette) {
      const paletteString = selectedPalette.join(", ");
      navigator.clipboard.writeText(paletteString)
        .then(() => {
          toast.success("Palette copied to clipboard!");
        })
        .catch(err => {
          toast.error("Failed to copy palette to clipboard.");
          console.error(err);
        });
    }
  };

  
  return (
    <>
        <div className="gap-2 place-items-center py-2 w-full">
          <blockquote className="mx-auto text-center text-[10px] w-1/2">
            <span className="font-bold">Welcome to your dashboard</span> <br/> 
            Soon to be fully customizable.<br/>
            Play around with our world class color wheel!
          </blockquote>
          <div className="flex gap-1 place-items-center place-content-center pt-2">
            <Button onClick={()=>setPause(!pause)} variant="outline" id="color_wheel" size="xs">
              {pause ? <Play className="h-3 w-3"/> : <Pause className="h-3 w-3" />}</Button>
            <Button onClick={()=>ramdomColorHandler()} disable={!pause} variant="outline" id="color_wheel" size="xs">
              <RotateCw className="h-3 w-3"/></Button> 
            <Button onClick={()=>shufflePalette()} disable={!pause} variant="outline" id="color_wheel" size="xs">
              <Shuffle className="h-3 w-3"/></Button>
          </div>
          <div className="flex flex-col w-full place-items-center place-content-center pt-2 cursor-pointer">
              <div className="flex gap-1 place-items-center p-1 bg-slate-200/30 rounded-md" onClick={()=>copyPaletteToClipboard()}>
                {
                  selectedPalette && selectedPalette.map((color)=>
                    <div className="p-2 rounded" style={{ backgroundColor: color}}> </div>
                  )
                }
              </div>
              <p className="text-[8px] text-muted-foreground">click to copy</p>
            </div>
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
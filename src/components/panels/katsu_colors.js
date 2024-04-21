import React from 'react';

import { colorPalettes } from '@/components/chartView/panels/colorPalette';
import { bgPalette } from '@/components/chartView/panels/bgPalette';

import { toast } from "@/components/ui/use-toast";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const KatsuColors = ({updateBgColor, mod}) => {
    // Your component logic here
    
    // Function to copy icon name to clipboard
    const copyToClipboard = async (iconName) => {
        try {
            await navigator.clipboard.writeText(iconName);
            toast({
                description: `${iconName} copied to clipboard!`,
            });
            
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div>
            <Tabs defaultValue="solids" className="w-full flex flex-col place-items-center place-content-center">
                <TabsList>
                    <TabsTrigger value="solids">Solids</TabsTrigger>
                    <TabsTrigger value="pallates">Pallates</TabsTrigger>
                </TabsList>
                <TabsContent value="solids" className="w-full place-items-center place-content-center">
                    <div className="grid grid-cols-8 gap-2 pr-2 pb-4 pl-2 py-6">
                    {
                        bgPalette && bgPalette.solids.map((solid, key) => (
                            <div
                                key={key}
                                className={'flex rounded-md h-6 cursor-pointer hover:border hover:border-black'}
                                onClick={()=>updateBgColor(mod ? mod : 'background_color', solid)}
                                style={{background: solid}}/>
                        ))
                    }
                    </div>
                </TabsContent>
                <TabsContent value="pallates" className="w-full place-items-center place-content-center">
                    <div className="grid grid-cols-2 gap-2 pr-2 pb-4 pl-2 py-2">
                    {
                        colorPalettes && colorPalettes.map((colors, key) => (
                            <div
                                key={key}
                                className={'flex rounded-md overflow-hidden h-6 cursor-pointer hover:border hover:border-black'}
                                onClick={() => copyToClipboard(colors)}
                            >
                                <div className={`w-1/6`} style={{background: colors[0]}}/>
                                <div className={`w-1/6`} style={{background: colors[1]}}/>
                                <div className={`w-1/6`} style={{background: colors[2]}}/>
                                <div className={`w-1/6`} style={{background: colors[3]}}/>
                                <div className={`w-1/6`} style={{background: colors[4]}}/>
                            </div>
                        ))
                    }
                    </div>
                </TabsContent>   
            </Tabs>         
        </div>
    );
};

export default KatsuColors;
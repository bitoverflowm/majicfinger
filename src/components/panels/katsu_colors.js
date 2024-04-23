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
            <Tabs defaultValue="solids" className=" flex flex-col place-items-center place-content-center">
                <TabsContent value="solids" className="w-1/3 place-items-center place-content-center">
                    <div className="flex flex-wrap gap-2 pr-2 pb-4 pl-2 py-6">
                    {
                        bgPalette && bgPalette.solids.map((solid, key) => (
                            <div
                                key={key}
                                className={'flex rounded-md h-6 w-6 cursor-pointer hover:border hover:border-black'}
                                onClick={()=>updateBgColor(mod ? mod : 'background_color', solid)}
                                style={{background: solid}}/>
                        ))
                    }
                    </div>
                </TabsContent>
            </Tabs>         
        </div>
    );
};

export default KatsuColors;
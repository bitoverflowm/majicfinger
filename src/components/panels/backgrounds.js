import React from 'react';

import { toast } from "@/components/ui/use-toast";
import Globe from '@/components/magicui/globe';

const Background = ({updateBackground}) => {
    // Function to copy icon name to clipboard
    const copyToClipboard = async (background) => {
        try {
            await navigator.clipboard.writeText(background);
            toast({
                description: `${background} copied to clipboard!`,
            });
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    return (
        <div className='grid grid-cols-3 gap-2 p-4'>
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg border bg-background px-40 pb-40 pt-8 md:pb-60 md:shadow-2xl" onClick={()=>updateBackground('background','globe')}>
                <span className="pointer-events-none whitespace-pre-wrap bg-gradient-to-b from-black to-gray-300/80 bg-clip-text text-center text-8xl font-semibold leading-none text-transparent dark:from-white dark:to-slate-900/10">
                    Globe
                </span>
                <Globe className="top-28" />
                <div className="pointer-events-none absolute inset-0 h-full bg-[radial-gradient(circle_at_50%_200%,rgba(0,0,0,0.2),rgba(255,255,255,0))]" />
            </div>
            <div className="relative flex h-full items-center justify-center overflow-hidden rounded-lg border bg-background px-40 pb-40 pt-8 md:pb-60 md:shadow-2xl" onClick={()=>updateBackground('background','')}>
                Clear Background Effect
            </div>
        </div>
    );
};

export default Background;
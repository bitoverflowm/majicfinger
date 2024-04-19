import React from 'react';
import { iconMap } from './iconMap';
import { toast } from "@/components/ui/use-toast";

const IconSelector = ({updateIcon}) => {
    //const toast = useToast(); // Assuming useToast is a hook that returns a function to show toasts

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
            {Object.entries(iconMap).map(([iconName, IconComponent]) => (
                <div key={iconName} onClick={() => updateIcon('Icon', iconName)} style={{ cursor: 'pointer', display: 'inline-block', margin: 10 }}>
                    <IconComponent className="h-6 w-6" />
                </div>
            ))}
        </div>
    );
};

export default IconSelector;

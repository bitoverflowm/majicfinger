import React, { useState } from 'react';
import { useUser } from '@/lib/hooks';

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

import { useMyState } from '@/context/stateContext';

/* Saving process for Bentos */

const Saves = () => {
    // Your component logic here
    const user = useUser();
    const [projectName, setProjectName] = useState('');
    const data = useMyState()

    // Handle input change
    const handleInputChange = (event) => {
        setProjectName(event.target.value);
    };

    // Handle save button click
    const handleSave = () => {
        console.log('Saving project:', projectName);
        console.log("data to save: ", data)
        // Here you can add code to save the projectName to a database or state management
        fetch('/api/bentos', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                project_name: projectName,
                project_data: data,
                created_date: new Date(),
                last_edited_date: new Date(),
                user_id: user.userId,                
             }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('Bento saved:', data);
                toast("Your Bento has been saved as: " + projectName)
                // Handle the response data here
            })
            .catch(error => {
                console.error('Error saving Bento:', error);
                // Handle the error here
            });
    };

    

    return (
        // Your component JSX here
        <div className="mx-auto grid w-full max-w-sm items-center items-center gap-1.5">
            <Label htmlFor="nane">Name your project</Label>
            <Input 
                type="text" 
                placeholder="Project name" 
                value={projectName} // Set the input value to our state
                onChange={handleInputChange} />
            <Button type="submit" onClick={handleSave}>Save</Button>
        </div>
    );
};

export default Saves;
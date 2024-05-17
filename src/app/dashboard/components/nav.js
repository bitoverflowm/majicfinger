import Link from "next/link"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { CircleUser, Menu, Package2  } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useUser } from '@/lib/hooks';
import { useMyStateV2  } from '@/context/stateContextV2'

const Nav = () => {
  const user = useUser()
  const router = useRouter();
  const contextStateV2 = useMyStateV2()

  const setViewing = contextStateV2?.setViewing
  const connectedData = contextStateV2?.connectedData
  const dataSetName = contextStateV2?.dataSetName
  const setDataSetName = contextStateV2?.setDataSetName


  const handleLogout = async () => {
    //e.preventDefault(); // Prevent the default link behavior

    try {
      const response = await fetch('/api/logout', {
        method: 'POST', // Make sure to use POST if your logout API expects it
      });

      // If the logout was successful, redirect to the homepage
      if (response.ok) {
        router.push('/');
      } else {
        // Handle errors or unsuccessful logout attempts here
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('An error occurred during logout', error);
    }
  };

  const handleSave = async () => {
    console.log('Saving project:', 'testName');
        //console.log("data to save: ", data)
        // Here you can add code to save the projectName to a database or state management
        fetch('/api/dataSets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                data_set_name: 'testname',
                data: connectedData,
                created_date: new Date(),
                last_saved_date: new Date(),
                labels: ['test'],
                source: 'userUpload',
                user_id: user.userId,                
             }),
        })
            .then(response => response.json())
            .then(data => {
                console.log('DataSet saved:', data);
                toast("Your Data has been saved as: " + 'projectName')
                // Handle the response data here
            })
            .catch(error => {
                console.error('Error saving Data:', error);
                // Handle the error here
            });
  }

  return (
    <div className="absolute top-0 flex w-full items-center gap-4 border-b bg-background py-2 px-5">
          { user ?
              <div className="flex items-center gap-4 ml-auto md:gap-2 lg:gap-4">
                {connectedData && !(dataSetName) && <div className="flex"><div>You have unsaved data </div> <Button onClick={()=>handleSave()}>Save</Button></div>}
                {connectedData && dataSetName && <div className="flex"><div>You have unsaved data </div> <Button>Save</Button></div>}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="rounded-full shadow-2xl shadow-inner flex bg-white">
                        <Image className="" src={'/avatar.png'} height={40} width={40} />
                        <Menu/>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>handleLogout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
              </div>
            : <div className="flex ml-auto" >
                {connectedData && <div className="flex">You have unsaved data register to save your progress</div>}
                <div className="bg-black text-white px-3 py-2 rounded-md text-xs cursor-pointer" onClick={()=>setViewing('register')}> Log in/Register </div>
              </div>
          }
    </div>
  )
}

export default Nav;
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CircleUser, Package2  } from "lucide-react"

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

  return (
    <div className="absolute top-0 flex w-full items-center gap-4 border-b bg-background py-2 px-5">
        <div className="flex items-center gap-4 ml-auto md:gap-2 lg:gap-4">
          { user ?
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                      <CircleUser className="h-5 w-5" />
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
            : <div className="flex" >
                <div className="bg-black text-white px-3 py-2 rounded-md text-xs cursor-pointer" onClick={()=>setViewing('register')}> Log in/Register </div>
            </div>

          }
        </div>
    </div>
  )
}

export default Nav;
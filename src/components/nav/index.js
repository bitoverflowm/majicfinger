'use client'

import { useMyState  } from '@/context/stateContext'
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'
import Image from 'next/image';

import { useRouter } from 'next/navigation'
import { Menu } from "lucide-react"


import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TwitterLogoIcon } from '@radix-ui/react-icons';


const Nav = () => {
    const { setWorking } = useMyState()
    const user = useUser()

    const router = useRouter();

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
      <header className="top-0 flex h-16 items-center gap-4 bg-lychee_black text-lychee_white px-4 md:px-6">
            <nav className="hidden flex-col md:text-xs md:ml-auto md:flex md:flex-row md:items-center md:gap-12">
              <div className='cursor-pointer'><Link href="https://x.com/misterrpink1"  rel="noopener noreferrer" target="_blank"><TwitterLogoIcon /></Link></div>
              <div className='cursor-pointer'><Link href="https://misterrpink.beehiiv.com/"  rel="noopener noreferrer" target="_blank">Newsletter</Link></div>
              <div className='cursor-pointer'><Link href="https://lychee.featurebase.app/"  rel="noopener noreferrer" target="_blank">Feature Request</Link></div>
              <div className='cursor-pointer'><Link href="/affiliates">Affiliates</Link></div>
              <div className='cursor-pointer'><Link href="/dataUse">Data Use</Link></div>
              <div className='cursor-pointer'><Link href="/help">Contact</Link></div>
              {
                !(user) ?
                  <>
                      <div className="bg-white text-lychee_black rounded-lg py-2 px-2">
                        <Link href="/login">Sign Up/Log In</Link>
                      </div>
                  </>
                  :<>
                    <div>
                      <Link href="/dashboard">Dashboard</Link>
                    </div>
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
                  </>
              }
            </nav>
        </header>
    )
  }

export default Nav;

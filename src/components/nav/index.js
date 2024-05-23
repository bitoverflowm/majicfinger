'use client'

import { useMyState  } from '@/context/stateContext'
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'
import Image from 'next/image';

import { useRouter } from 'next/navigation'
import { IoWarningOutline } from "react-icons/io5";
import { Menu } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Button } from "@/components/ui/button"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
              <div className='cursor-pointer'><Link href="https://lychee.featurebase.app/"  rel="noopener noreferrer" target="_blank">Request Feature</Link></div>
              <div className='cursor-pointer'><Link href="https://lychee.featurebase.app/roadmap"  rel="noopener noreferrer" target="_blank">Vote</Link></div>
              <div className='cursor-pointer'><Link href="/affiliates">Affiliates</Link></div>
              <div className='cursor-pointer'><Link href="/dataUse">Data Use</Link></div>
              {/*<div className='cursor-pointer hover:text-lychee-green'><Link href="/roadmap">Roadmap</Link></div>*/}
              <div className='cursor-pointer'><Link href="/help">Contact</Link></div>
              {
                !(user) ?
                  <>
                      <div variant="">
                        Sign Up
                      </div>
                      <div variant="secondary">
                        <Link href="/login">Log In</Link>
                      </div>
                  </>
                  :<>
                    <div>
                      <Link href="/dashboard">Log In</Link>
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
            <Sheet>
                <SheetTrigger asChild>
                    <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0 md:hidden"
                    >
                      <Link href="/"> <img src={"./fruit.png"} className='w-5 h-6 mx-auto'/></Link>
                    </Button>
                </SheetTrigger>
                <SheetContent side="left">
                    <nav className="grid gap-6 text-lg font-medium">
                    <Link href="#" className="hover:text-foreground">
                        Settings
                    </Link>
                    </nav>
                </SheetContent>
            </Sheet>
        </header>
    )
  }

export default Nav;

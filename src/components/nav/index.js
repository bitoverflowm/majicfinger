'use client'

import { useMyState  } from '@/context/stateContext'
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'

import { useRouter } from 'next/navigation'
import { IoWarningOutline } from "react-icons/io5";

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
      <header className="top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
            <nav className="hidden flex-col gap-6 text-lg font-medium md:flex md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6">
              <div className="w-28 sm:w-24">
                <Link href="/"> <img src={"./logo.png"}/></Link>
              </div>
              <div className='cursor-pointer hover:text-lychee-green'><Link href="/affiliates">Make $ with Lychee</Link></div>
              <div className='cursor-pointer hover:text-lychee-green'><Link href="/dataUse">Data Use</Link></div>
              {/*<div className='cursor-pointer hover:text-lychee-green'><Link href="/roadmap">Roadmap</Link></div>*/}
              <div className='cursor-pointer hover:text-lychee-green'><Link href="/help">Contact</Link></div>
              <div className='cursor-pointer hover:text-lychee-green'><Link href="/bento">Katsu</Link></div>

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
            <div className="flex place-content-end w-1/2 items-center gap-4 ml-auto md:gap-2 lg:gap-4">
                <DropdownMenu>
                      {
                        !(user) ?
                          <>
                              <Button variant="secondary">
                                <Link href="/login">Log In</Link>
                              </Button>
                              <Button variant="" onClick={()=>setWorking('getLychee')}>
                                Sign Up
                              </Button>
                          </>
                          :<>
                              <DropdownMenuTrigger asChild>
                                <div className='p-2 px-3 rounded-2xl text-white bg-lychee-black capitalize'>
                                    {user.name ? user.name : user.email.split('@')[0]}
                                </div>
                              </DropdownMenuTrigger>
                              <Button variant="secondary" size="icon" className="rounded-full" onClick={()=>handleLogout()}>
                                Log Out
                              </Button>
                          </>
                      }
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>Logout</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
  }

export default Nav;

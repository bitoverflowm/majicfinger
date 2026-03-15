'use client'
import { useState } from 'react';
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'
import Image from 'next/image';

import { useRouter, usePathname } from 'next/navigation'
import { Menu, Citrus } from "lucide-react"


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
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";


const Nav = () => {
    const user = useUser()
    const pathname = usePathname();
    const isLandingPage = pathname === '/';
    const [logoError, setLogoError] = useState(false);

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
      <header className="absolute w-full z-30 top-0 flex h-16 items-center gap-4 px-4 md:px-6">
            {isLandingPage && (
              <div className="flex items-center gap-6 mr-4 shrink-0 text-sm font-semibold">
                <Link href="/" className="flex gap-1.5 items-center pr-3">
                  {!logoError && (
                    <span className="flex shrink-0 items-center justify-center">
                      <Image src="/logo.png" alt="Lychee" width={24} height={24} className="grayscale object-contain block" onError={() => setLogoError(true)} />
                    </span>
                  )}
                  <span className="pt-2 font-black text-xl leading-none">Lychee</span>
                </Link>
                <div className='cursor-pointer pl-6 pt-2'><Link href="https://misterrpink.beehiiv.com/"  rel="noopener noreferrer" target="_blank">Newsletter</Link></div>
                <div className='cursor-pointer hidden'><Link href="https://lychee.featurebase.app/"  rel="noopener noreferrer" target="_blank">Request a Feature</Link></div>
                <div className='cursor-pointer pt-2'><Link href="/affiliates">Affiliates</Link></div>
                <div className='cursor-pointer hidden'><Link href="/dataUse">Data Use</Link></div>
                <div className='cursor-pointer pt-2'><Link href="/help">Questions?</Link></div>
              </div>
            )}
            <nav className="hidden flex-col place-items-center place-content-center md:text-xs md:ml-auto md:flex md:flex-row md:items-center md:gap-4">
              <div className='cursor-pointer'><Link href="https://x.com/misterrpink1"  rel="noopener noreferrer" target="_blank"><TwitterLogoIcon /></Link></div>
              
              {
                !(user) ?
                  <>
                      <Link href="#getIt" className="bg-foreground hover:bg-secondary text-white dark:text-black font-bold hover:text-foreground dark:hover:text-white rounded-md py-2 px-4 transition-colors">
                        Sign Up
                      </Link>
                      <div className="py-2 px-2 rounded-md hover:bg-background hover:text-foreground">
                        <Link href="/login">Log In</Link>
                      </div>
                      <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-white/30 bg-transparent hover:bg-white/10 text-lychee_white inline-flex items-center justify-center" />
                  </>
                  :<>
                    <div>
                      <Link href="/dashboard">Dashboard</Link>
                    </div>
                    <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-white/30 bg-transparent hover:bg-white/10 text-lychee_white inline-flex items-center justify-center" />
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

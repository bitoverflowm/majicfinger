'use client'
//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import { useMyState  } from '@/context/stateContext'
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'

import { useRouter } from 'next/navigation'


const Nav = () => {
    const { working, setWorking } = useMyState()
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
      <div className="flex w-full p-10 sm:p-6 z-40">
        <div className="max-w-48">
          <img src={"./logo.png"}/>
        </div>
        {
          !(user) ?
            <div className="pt-3 w-full text-sm pr-6  flex gap-4 place-content-end place-items-center " >
                <div className='underline cursor-pointer hover:text-lychee-green'><Link href="/login">Already have an account?</Link></div>
                <div className='p-2 px-3 cursor-pointer bg-lychee-green font-bold rounded-xl hover:bg-black hover:text-white shadow-inner' onClick={()=>setWorking('getLychee')}>Get Lychee Now!</div>
            </div>
            :<div className='w-full flex gap-4 place-content-end place-items-center'>
                <div className='rounded-full bg-lychee-peach text-white p-2 px-4 capitalize'>
                    {user.name ? user.name : user.email.split('@')[0]}
                </div>
                <div onClick={()=>handleLogout()} className='cursor-pointer hover:text-slate-300'>Logout</div>
            </div>
        }
      </div>      
    )
  }


export default Nav;

'use client'
//import React, { useState, useEffect } from 'react'

//import { CsvToHtmlTable } from 'react-csv-to-table';
import { useUser  } from '@/lib/hooks';
import Link from 'next/link'


const Nav = () => {
    const user = useUser()

    return (
      <div className="flex w-full p-10 sm:p-6 z-40">
        <div className="max-w-48">
          <img src={"./logo.png"}/>
        </div>
        {
          !(user) &&
            <div className="underline pt-3 w-full text-right text-sm pr-6 cursor-pointer hover:text-lychee-green" ><Link href="/login">Already have an account? Login</Link></div>
        }

      </div>      
    )
  }


export default Nav;

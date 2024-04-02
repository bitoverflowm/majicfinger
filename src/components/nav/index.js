'use client'

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
      <div className="flex w-full px-8 pt-3 pb-2 z-40 bg-white">
        <div className="w-24">
          <Link href="/"> <img src={"./logo.png"}/></Link>
        </div>
        <div className='text-sm w-full flex gap-6 place-content-end place-items-center'>
          <div className='cursor-pointer hover:text-lychee-green'><Link href="/affiliates">Make $ with Lychee</Link></div>
          <div className='cursor-pointer hover:text-lychee-green'><Link href="/dataUse">Data Use</Link></div>
          {/*<div className='cursor-pointer hover:text-lychee-green'><Link href="/roadmap">Roadmap</Link></div>*/}
          <div className='cursor-pointer hover:text-lychee-green'><Link href="/new">What's new?</Link></div>
          <div className='cursor-pointer hover:text-lychee-green'><Link href="/help">Contact</Link></div>
          <div className="flex gap-2">
            {
              !(user) ?
                <>
                    <div className='p-2 px-3 rounded-2xl cursor-pointer text-white bg-lychee-black hover:bg-lychee-white hover:text-lychee-black'><Link href="/login">Log In</Link></div>
                    <div className='p-2 px-3 rounded-2xl cursor-pointer text-white bg-lychee-green hover:bg-lychee-white hover:text-black' onClick={()=>setWorking('getLychee')}>Sign Up</div>
                </>
                :<>
                    <div className='p-2 px-3 rounded-2xl text-white bg-lychee-black capitalize'>
                        {user.name ? user.name : user.email.split('@')[0]}
                    </div>
                    <div onClick={()=>handleLogout()} className='p-2 px-3 rounded-2xl cursor-pointer text-lychee-black bg-lychee-white hover:bg-lychee-red hover:text-white'>Logout</div>
                </>
            }
          </div>
        </div>
      </div>      
    )
  }

export default Nav;

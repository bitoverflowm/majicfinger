
import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IoMdAddCircle } from "react-icons/io";
import { FaCircle } from "react-icons/fa";


//import { useUser } from "@/lib/hooks"

import MagicButton from '@/components/UI/magicButton'
import MainContentParent from '@/components/mainContentParent/mainContentParent';
import ScrollTag from '@/components/UI/scrollTag';

//import bgVideo from '/video/bgVideo.mp4'


export default async function Home() {

  return (
    <div className='w-full bg-white'>
      <div className="h-screen p-3">
        <div className='relative h-full rounded-xl  px-4 py-3 flex flex-col z-10 overflow-hidden'>
            <video autoPlay loop muted style={{ 
                position: "absolute",
                width: "100%",
                left: "50%",
                top: "50%",
                height: "100%",
                objectFit: "cover",
                transform: "translate(-50%, -50%)",
                zIndex: "-1"
            }}>
                <source src={'/video/bgVideo.mp4'} type="video/mp4" />
            </video>
            <div className='flex w-full bg-white px-4 py-3 rounded-lg place-items-end bg-opacity-80 z-10'>
              <div className='w-1/5 text-center text-xl font-bold'>
                Menu
              </div>
              <div className='w-3/5 flex place-items-center place-content-center'>
                <img src={"./logo.png"} className="h-9 w-9" />
              </div>
              <div className='w-1/5 text-center text-xl font-bold text-slate-600 hover-poiner'>
                <Link href="/signup">
                  Join
                </Link>
              </div>
            </div>
            <div className='flex w-full font-medium bg-white px-4 py-2 rounded-lg bg-opacity-80 mt-2 z-10'>
              <div className='text-xs text-slate-600 '>
                Launching Dec 2023,
                <Link href="/signup" className='hover-poiner underline'>
                  join now for early access
                </Link>
              </div>
            </div>
            <div className='my-auto z-10'>
              <div className='text-white font-black text-5xl font-title'>Welcome to TheYouuProject</div>
              <div className='p-2 text-white font-regular text-lg'>
                <div className='font-body'>
                  Unleash Your Inner Beast
                </div>
                <div className='-mt-1 font-body'>
                  Achieve Peak Performance
                </div>
              </div>
              <div className='mt-40 mx-auto w-48 px-4 py-2 rounded-2xl text-center font-body bg-youu-green text-black font-bold hover:bg-white cursor-pointer'>Ready To Start?</div>
            </div>
            <div className='z-10 w-screen -ml-10'>
              <ScrollTag />
            </div>
        </div>      
      </div>
      <div className='px-3 py-1'>
        <div className='flex place-items-center place-content-center h-48 rounded-xl p-1 text-white bg-youu-dark-green'>
          <div className='font-title text-youu-lavender px-4 py-1 rounded-lg font-bold text-3xl'>Your Life Starts Here.</div>
        </div>
      </div>
      {/*
        <div className='px-3 py-1'>
          <div className='flex bg-black h-64 rounded-xl p-8 text-white'>
            <div className='text-white font-bold text-4xl'>Entrepreneurs and Atheletes</div>
            <div className=''>The Pinnacle Project</div>
          </div>
        </div>*/
      }
      <div className='px-3 py-1'>
        <div className='bg-youu-lavender text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 '>
            <div className='text-6xl font-black font-title text-youu-dark-green'>1.</div>
            <div className='font-regular font-body text-xs pt-2 text-youu-dark-green'>Select what you want to work on with guided science backed protocols proposed by Dr Huberman, Dr Rhonda Partick, Dr Attia, etc.   </div>
          </div>
          <div className='flex flex-wrap gap-1 pl-4 pt-4 text-xs font-thin font-body text-youu-lavender'>
            <div className='border-2 border-youu-reseda-green bg-youu-reseda-green py-3 px-3 rounded-xl'>Mental Health</div>
            <div className='border-2 border-youu-reseda-green bg-youu-reseda-green py-3 px-3 rounded-xl'>Focus</div>
            <div className='border-2 border-youu-reseda-green bg-youu-reseda-green py-3 px-3 rounded-xl'>Athletic Performance</div>            
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Energy</div>
            <div className='border-2 border-youu-english-violet bg-youu-english-violet py-3 px-3 rounded-xl'>Optimize Testosterone</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Cultivate Discipline</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Combat ADHD</div>
            <div className='border-2 border-youu-english-violet bg-youu-english-violet py-3 px-3 rounded-xl'>Estrogen & Progesterone</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Language Learning</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Addiction</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Get Stronger</div>
            <div className='border-2 border-youu-english-violet bg-youu-lavender py-3 px-3 text-youu-english-violet rounded-xl'>Sleep Health</div>
            <div className='border-2 border-youu-english-violet bg-youu-english-violet py-3 px-3 rounded-xl text-lg'><IoMdAddCircle /></div>
            <div className='border-2 border-youu-reseda-green bg-youu-reseda-green text-youu-lavender py-1 px-2 rounded-xl text-xxs mt-1'>* Available to use now; click to try the protocol</div>
            <div className='border-2 border-youu-english-violet bg-youu-english-violet text-youu-lavender py-1 px-2 rounded-xl text-xxs mt-1'>* Under Construction</div>
          </div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-black text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 '>
            <div className='text-4xl font-black'>2.</div>
            <div className='font-bold'>Receive personalized protocols, daily actionable steps, for your specific goals. All available at your fingertips</div>
          </div>
          <div className='flex flex-col pl-4 pt-4 text-sm font-bold gap-2'>
            <div className='flex place-items-center'><div className='bg-youu-red py-1 px-2 pr-4 rounded-md'>Mental Health</div><div className='-ml-2 bg-white py-1 px-2 rounded-md text-youu-red'>Toolkit 1</div> <div className='pl-3'> Day 1 </div><div className='ml-2 text-xl flex gap-1'><FaCircle className='text-youu-green'/><FaCircle className='text-white'/></div> </div>
            <div className='flex place-items-center'><div className='bg-youu-red py-1 px-2 pr-4 rounded-md'>Focus</div><div className='-ml-2 bg-white py-1 px-2 rounded-md text-youu-red'>Spotlighting</div> <div className='pl-3'> Day 5 </div><div className='ml-2 text-xl flex gap-1'><FaCircle className='text-youu-green'/><FaCircle className='text-youu-green'/><FaCircle className='text-youu-green'/><FaCircle className='text-youu-green'/><FaCircle className='text-youu-green'/><FaCircle className='text-white'/></div></div>
            <div className='flex place-items-center'><div className='bg-youu-red py-1 px-2 pr-4 rounded-md'>Energy</div><div className='-ml-2 bg-white py-1 px-2 rounded-md text-youu-red'>Dopamine Kit</div> <div className='pl-3'> Day 2 </div><div className='ml-2 text-xl flex gap-1'><FaCircle className='text-youu-green'/><FaCircle className='text-youu-green'/><FaCircle className='text-white'/></div> </div>
            <div className='flex place-items-center'><div className='bg-youu-red py-1 px-2 pr-4 rounded-md'>Sleep</div><div className='-ml-2 bg-white py-1 px-2 rounded-md text-youu-red'>Circadian Reset</div> <div className='pl-3'> Day 1 </div><div className='ml-2 text-xl flex gap-1'><FaCircle className='text-youu-green'/><FaCircle className='text-white'/></div> </div>
            <div className='flex place-items-center'><div className='bg-youu-red py-1 px-2 pr-4 rounded-md'>Combat ADHD</div><div className='-ml-2 bg-white py-1 px-2 rounded-md text-youu-red'>Dopamine Detox</div> <div className='pl-3'> Day 0 </div><div className='ml-2 text-xl flex gap-1'><FaCircle className='text-white'/></div> </div>
          </div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-black text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 place-items-end'>
            <div className='text-4xl font-black'>3.</div>
            <div className='font-bold text-2xl'>Measure Everyting</div>
          </div>
          <div className='font-bold pl-4'>Whether its hormones, memory, athletic performance, age reversal, you can get your focus points measured right here. At the click of a button, at your home, or a testing site near your</div>
          <div className='flex flex-col gap-2 pl-4 pt-4 text-sm font-bold'>
            <div className='bg-youu-green py-1 px-2 rounded-md w-32 text-black'>Hormone Health</div>
            <div className='flex gap-2'>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Testosterone</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Estrogen</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>DHEA</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Cortisol</div>
              <div className='flex place-items-center bg-youu-green text-black py-1 px-2 rounded-md'><IoMdAddCircle /></div>
            </div>
            <div className='bg-youu-green py-1 px-2 rounded-md w-32 text-black'>Nutrient Panel</div>
            <div className='flex gap-2'>
              <div className='bg-white text-black py-1 px-2 rounded-md'>CBC</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Vitamin D</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Vitamin B12</div>
              <div className='bg-white text-black py-1 px-2 rounded-md'>Folate</div>
              <div className='flex place-items-center bg-youu-green text-black py-1 px-2 rounded-md'><IoMdAddCircle /></div>
            </div>
            <div className='flex flex-wrap gap-2 pt-2'>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Biological Age</div>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Advanced Lipid Test</div>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Glycemic Control Test</div>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Liver Function</div>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Kidney Function</div>
              <div className='bg-youu-green py-1 px-2 rounded-md text-black'>Genetics</div>
              <div className='flex place-items-center bg-white text-black py-1 px-2 rounded-md'><IoMdAddCircle /></div>
            </div>
          </div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-black text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 '>
            <div className='text-4xl font-black'>4.</div>
            <div className='font-bold'> Bring all your health tracker data into 1 platform. No need for 20 apps. Zen mode. Everything under 1 app. Right here. </div>
          </div>
          <div className='flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold'>
            <div className='bg-youu-green text-black py-1 px-2 rounded-md'>Apple Watch</div>
            <div className='bg-yellow-200 text-black py-1 px-2 rounded-md'>Fitbit</div>
            <div className='bg-white text-black py-1 px-2 rounded-md'>Garmin</div>
            <div className='bg-orange-500 py-1 px-2 rounded-md'>Strava</div>
            <div className='bg-slate-700 text-white py-1 px-2 rounded-md'>Oura</div>
            <div className='bg-indigo-600 py-1 px-2 rounded-md'>8Sleep</div>
            <div className='text-white py-1 px-2 rounded-md flex place-items-center place-content-center text-xl'><IoMdAddCircle /></div>
          </div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-black text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 '>
            <div className='text-4xl font-black'>5.</div>
            <div className='font-bold'> Join the community of Youu. </div>
          </div>
          <div className='font-bold pl-4'> Everyone trying to get better every day. Learn from the best and become the best version of you.</div>
          <div className='flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold'>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>Dan completed 30 day’s of Dopamine Detox! <div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>👏</div></div>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>Jin launched another company <div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>🚀</div></div>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>Cindy did her first cold plunge! <div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>🥶</div><div className='bg-black rounded-full p-1 px-1.5 flex place-items-center place-content-center'>🧨</div></div>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>Devin won his first Boxing Match <div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>🥊</div><div className='bg-black rounded-full p-1 px-1.5 flex place-items-center place-content-center'>🔥</div></div>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>May managed to sleep for a full 8hrs!<div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>❤️</div></div>
            <div className='bg-white text-black py-1 px-2 rounded-md flex place-items-center'>Andrew raised his t-score by 150 pts! <div className='bg-black rounded-full ml-2 p-1 px-1.5 flex place-items-center place-content-center'>🏋🏿</div></div>
          </div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-youu-red text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='flex gap-2 py-4 px-4 '>
            <div className='text-4xl font-black '>Join Now!</div>            
          </div>
          <div className='text-2xl font-bold pl-4'> Unlock Your Inner Beast.</div>
          <div className='text-2xl font-bold pl-4'> Climb Your Peak.</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Get Early Access</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Get gifts, merch and exclusive releases</div>
        </div>
      </div>
      <div className='px-3 py-1'>
        <div className='bg-black text-white rounded-xl pt-3 pb-8 px-4'>
          <div className='text-4xl font-black pl-4 pr-1 py-4'>Become A Founding Memeber</div>            
          <div className='text-2xl font-bold pl-4'> Support Us and Win:</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Get Early Access</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Lifetime Discount On Product Purchases</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> No monthly membership! </div>
          <div className='text-xl flex gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle className='text-3xl'/><div className=''>
            Vote on protocols, tests, integrations for the dev team to prioritize builds for the first version release</div></div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Get gifts, merch and exclusive releases</div>
          <div className='text-xl flex flex-wrap gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle /> Help us with our coffee purchases 🤗</div>
          <div className='text-xl flex gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle className='text-3xl'/><div className=''>
          Get exclusive event invites for Founding Members only events all around the world</div></div>
          <div className='text-xl flex gap-3 pl-4 pt-4 text-sm font-bold place-items-center'><FaCircle className='text-3xl'/><div className=''>
          You would be helping us build faster, so you will eternally have our appreciation </div>
          </div>
          <div className='flex place-content-center place-items-center text-center gap-6 py-6 '>
            <div className='text-3xl'>Gold <div>$29.99</div></div>
            <div className='text-3xl'>Diamond <div>$59.99</div></div>
          </div>
        </div>
        
      </div>
    </div>
  )
}

/*export async function getServerSideProps(context) {
  try {
    const client = await dbConnect
    // `await clientPromise` will use the default database passed in the MONGODB_URI
    // However you can use another database (e.g. myDatabase) by replacing the `await clientPromise` with the following code:
    //
    // `const client = await clientPromise`
    // `const db = client.db("myDatabase")`
    //
    // Then you can execute queries against your database like so:
    // db.find({}) or any of the MongoDB Node Driver commands

    return {
      props: { isConnected: true },
    }
  } catch (e) {
    console.error(e)
    return {
      props: { isConnected: false },
    }
  }
}


<div className='relative h-screen overflow-hidden'>
          <MainContentParent />
      </div>
*/

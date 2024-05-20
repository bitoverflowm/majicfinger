import Link from 'next/link'

import Nav from "@/components/nav";
import { StateProvider } from '@/context/stateContext'



const Help = () => {

    return (
        <StateProvider>
            <div className="h-screen">
                <Nav/>
                <div className='w-1/2 mx-auto bg-white rounded-lg shadow-2xl px-10 py-10 mt-10 flex flex-col gap-4 text-sm'>
                    <div className="">
                        Hi I am MisterrPink, <div className="py-1"></div> I am the creator of Lychee.
                        And the following projects: <Link href={'https://difunk.com/'} className="underline font-bold">Difunk</Link>, <Link href={'https://app.misterrpink.com/'} className="underline font-bold">Free The Creator</Link>, <Link href={'https://www.overtime.club/' } className="underline font-bold">Overtime</Link>, <Link href={'https://hcked.xyz/'} className="underline font-bold"> Hcked </Link>, <Link href={'https://www.theyouuproject.com/'} className="underline font-bold">theYouuProject</Link> and some others.
                    </div>
                    <div>
                        If you use Twitter/ X  <Link href={'https://twitter.com/misterrpink1'} className='underline'> @misterrpink1 </Link>
                    </div>
                    <div>
                        Instagram: <Link href={'https://www.instagram.com/misterrpink1_builds/'} className='underline'> @misterrpink1_builds </Link>
                    </div>
                    <div>
                        Youtube: <Link href={'https://www.youtube.com/channel/UCoUiZMQF-4BNN6UL1AfHRDw'} className='underline'> @misterrpink1 </Link>
                    </div>
                    <div>Please follow me and DM me. If you don't follow me I probably won't see your DMs. 😊</div>
                    <div>
                        Discord (you will need to intro yourself, before being able to access the channels), but you can chat with me directly! I can even guide you in your entrepreneurship journey: <Link href={'https://discord.gg/TUepM3wA8s'} className='underline'> MisterrPink1's Discord </Link>
                    </div>
                </div>
            </div>
        </StateProvider>
    )
}

export default Help
import Link from 'next/link'

import Nav from "@/components/nav";
import { StateProvider } from '@/context/stateContext'
import { canonicalUrl } from "@/lib/site";

export const metadata = {
  title: "Help | Lychee",
  description: "Contact MisterrPink, creator of Lychee, for support and questions.",
  alternates: {
    canonical: canonicalUrl("/help"),
  },
};

const Help = () => {
    return (
        <StateProvider>
            <div className="h-screen">
                <Nav/>
                <div className='w-1/2 mx-auto bg-white rounded-lg shadow-2xl px-10 py-10 mt-10 flex flex-col gap-4 text-sm'>
                    <div className="">
                        Hi I am Kash, aka MisterrPink, <div className="py-1"></div> I am the creator of Lychee.
                    </div>
                    <div>
                        I presonally respond to every email and DM I receive, so please don't be afraid to reach out!
                    </div>
                    <div>
                        If you use Twitter/ X  <Link href={'https://twitter.com/misterrpink1'} className='underline'> @misterrpink1 </Link>
                    </div>
                    <div>
                        Email: <Link href={'mailto:kash@lycheedata.com'} className='underline'> kash@lycheedata.com </Link>
                    </div>
                    <div>Please follow me and DM me. If you don't follow me I probably won't see your DMs. 😊</div>
                </div>
            </div>
        </StateProvider>
    )
}

export default Help
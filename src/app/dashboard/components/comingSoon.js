
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

import Link from "next/link";

import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"


const ComingSoon = () => {

  return (
            <div className="px-2 flex flex-col w-full">
                    <Alert className="text-xs bg-lychee_white/50 text-lychee_black border-none w-2/5 mx-auto flex place-items-center gap-6">
                        <Link rel="noopener noreferrer" target="_blank" href={'https://twitter.com/misterrpink1'} className="text-center">
                            <Avatar>
                                <AvatarImage src="/avatar1.png" />
                                <AvatarFallback>MP</AvatarFallback>
                            </Avatar> Mr.Pink  
                        </Link>
                        <div>
                            <AlertTitle> 🚧 Lychee V2.0 is coming!</AlertTitle>
                            <AlertDescription >
                                    I am moving some things around. Platform is functional, but things might break... <br />
                                    <Link href={'https://misterrpink.beehiiv.com/'} rel="noopener noreferrer" target="_blank" className="underline">Click Here for Tutorials and Guides (along with a healthy dose of my unhinged thoughts)</Link>
                            </AlertDescription>
                        </div>
                    </Alert>
            </div>   
        )
      }

export default ComingSoon
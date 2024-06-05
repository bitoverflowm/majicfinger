
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
                        <Link rel="noopener noreferrer" target="_blank" href={'https://twitter.com/misterrpink1'}>
                            <Avatar>
                                <AvatarImage src="/avatar1.png" />
                                <AvatarFallback>MP</AvatarFallback>
                            </Avatar> Mr. Pink  
                        </Link>
                        <div>
                            <AlertTitle> 🚧 Heads up! Lychee V2.0 is coming!</AlertTitle>
                            <AlertDescription >
                                    I am moving some things around. Platform is functional, but things might break... <br />
                                    Truth be told, I am actively pushing to production as we speak, so things will most likely break. <br /> Tutorials coming...
                            </AlertDescription>
                        </div>
                    </Alert>
            </div>   
        )
      }

export default ComingSoon

import {
    Alert,
    AlertDescription,
    AlertTitle,
  } from "@/components/ui/alert"


const ComingSoon = () => {

  return (
            <div className="px-2 min-h-screen flex flex-col">
                <div>
                    <AlertTitle> 🚧 Heads up! Lychee V2.0 is coming!</AlertTitle>
                    <AlertDescription >
                            I am moving some things around. Platform is functional, but things might break.
                            This page is currently being worked on
                    </AlertDescription>
                </div>
            </div>   
        )
      }

export default ComingSoon
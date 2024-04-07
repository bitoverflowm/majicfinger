
//import { useEffect } from "react"


import { ThemeProvider } from "@/components/themeProvider";


import { StateProvider } from '@/context/stateContext'

import Katsu from "./katsu";

const Bento = () => {
    //const user = useUser()
  
    return (
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange>
                <StateProvider bento={true}>
                    <Katsu />
                </StateProvider>
        </ThemeProvider>

    )
}

export default Bento
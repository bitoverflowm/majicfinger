import { StateProvider } from '@/context/stateContext'

import Katsu from "./katsu";

const Bento = () => {
    //const user = useUser()
  
    return (
        <StateProvider bento={true}>
            <Katsu />
        </StateProvider>

    )
}

export default Bento
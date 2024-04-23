import { StateProvider } from '@/context/stateContext'

import KatsuBase from "./katsuBase";

const Katsu = () => {
    //const user = useUser()
  
    return (
        <StateProvider bento={true}>
            <KatsuBase />
        </StateProvider>

    )
}

export default Katsu
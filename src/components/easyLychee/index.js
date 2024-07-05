import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react'

import { useUser } from '@/lib/hooks';
import { useMyStateV2 } from '@/context/stateContextV2'

import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
  
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { bgPalette } from '@/components/chartView/panels/bgPalette';
import { masterPalette } from '../chartView/panels/masterPalette';
import { FontBoldIcon, FontSizeIcon, LineHeightIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignMiddleIcon, TextAlignRightIcon } from '@radix-ui/react-icons';

const EasyLychee = () => {
    const user = useUser()
    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta
    

    //handle used for saving and publishing website
    const [handle, setHandle] = useState()
    const [template, setTemplate] = useState('classic')
    
    const [displayMap, setDisplayMap] = useState({})

    // styles will now only be used for color management
    const [styles, setStyles] = useState({
        'page': {
            backgroundColor: 'white'
        },
        'hero': {
            backgroundColor: 'black',
        },
        'name': {
            color: 'white',
        },
        'description': {
            color: 'white',
        },
        'link': {
            backgroundColor: 'blue',
            color: 'white',
        },
    });
    
    //control panel
    const [edit, setEdit] = useState(true)
    const [mainTitle, setMainTitle] = useState('Title Goes Here')
    const [subTitle, setSubTitle] = useState(`Description goes here`)

    const [granularColorsVisible, setGranularColorsVisible] = useState(false)
    const [colorTarget, setColorTarget] = useState(null)


    const [displayNames, setDisplaNames] = useState()

    useEffect(() => {
        if (connectedCols && connectedData) {
            if(template === 'classic'){
                setDisplaNames({name: 'name',
                    description: 'description',
                    link: 'link'})
                setDisplayMap(generateDisplayMap());
            }else{
                setDisplaNames({cardTitle: 'Title',
                    cardSubTitle: 'Sub Title',
                    text0: 'Body Text',
                    cta: 'Call to Action'})
                setDisplayMap(generateDisplayMap());
            }
            
        }
    }, [template]);

    const generateDisplayMap = () => {
        const colLen = connectedCols.length;
        if(template === 'classic'){
            return {
                name: colLen > 0 ? connectedCols[0].field : '',
                description: colLen > 1 ? connectedCols[1].field : '',
                link: colLen > 2 ? connectedCols[2].field : ''
            };
        }else{
            return {
                cardTitle: colLen > 0 ? connectedCols[0].field : '',
                cardSubTitle: colLen > 1 ? connectedCols[1].field : '',
                text0: colLen > 2 ? connectedCols[2].field : '',
                cta: colLen > 3 ? connectedCols[3].field : '',
            };
        }
    };

    //Assign new column to presentation field
    const handleSelectChange = (key, value) => {
        setDisplayMap(prevState => {
            const newState = { ...prevState };
            newState[key] = value;
            return newState;
        });
    };

    useEffect(() => {
        if (connectedCols && connectedData) {
            setDisplayMap(generateDisplayMap());
        }
    }, [connectedCols, connectedData]);


    /* Styles */

    const handleStyleChange = (styleCategory, styleProperty, value) => {
        setStyles(prevStyles => ({
            ...prevStyles,
            [styleCategory]: {
                ...prevStyles[styleCategory],
                [styleProperty]: value
            }
        }))
    }

    /* Color management */

    const [paletteVisible, setPaletteVisible] = useState()
    const [selectedCategory, setSelectedCategory] = useState(null);
    const categories = Object.keys(masterPalette);

    const selectedPaletteHandler = (index) => {
        let newPalette = masterPalette[selectedCategory][index];
        if (!newPalette || !newPalette.length) return; // Ensure newPalette is valid
        // Update styles state with new colors
        setStyles(prevStyles => ({
            ...prevStyles,
            page: {
                ...prevStyles.page,
                backgroundColor: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            headerBox: {
                ...prevStyles.headerBox,
                backgroundColor: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            mainTitle: {
                ...prevStyles.mainTitle,
                color: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            subTitle: {
                ...prevStyles.subTitle,
                color: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            cardHeading: {
                ...prevStyles.cardHeading,
                backgroundColor: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            cardTitle: {
                ...prevStyles.cardTitle,
                color: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            cardBody: {
                ...prevStyles.cardBody,
                bodyColor: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            cardSubTitle: {
                ...prevStyles.cardSubTitle,
                color: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            text0: {
                ...prevStyles.text0,
                color: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            cta: {
                ...prevStyles.cta,
                backgroundColor: newPalette[Math.floor(Math.random() * newPalette.length)]
            },
            // Add more properties as needed
        }));
    };

    const granularColorHandler = (target) => {
        setGranularColorsVisible(true)
        setColorTarget(target)
    }

    const updateGranularColorHandler = (key) => {
        switch (colorTarget) {
            case 'headerBackground':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    headerBox: {
                        ...prevStyles.headerBox,
                        backgroundColor: key
                    }
                }));
                break;
            case 'mainTitleText':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    mainTitle: {
                        ...prevStyles.mainTitle,
                        color: key
                    }
                }));
                break;
            case 'subTitleText':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    subTitle: {
                        ...prevStyles.subTitle,
                        color: key
                    }
                }));
                break;
            case 'cardHeadingBackground':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cardHeading: {
                        ...prevStyles.cardHeading,
                        backgroundColor: key
                    }
                }));
                break;
            case 'cardTitle':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cardTitle: {
                        ...prevStyles.cardTitle,
                        color: key
                    }
                }));
                break;
            case 'cardSubTitle':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cardSubTitle: {
                        ...prevStyles.cardSubTitle,
                        color: key
                    }
                }));
                break;
            case 'text0':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    text0: {
                        ...prevStyles.text0,
                        color: key
                    }
                }));
                break;
            case 'ctaBorder':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cta: {
                        ...prevStyles.cta,
                        borderColor: key
                    }
                }));
                break;
            case 'ctaBackground':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cta: {
                        ...prevStyles.cta,
                        backgroundColor: key
                    }
                }));
                break;
            case 'ctaText':
                setStyles(prevStyles => ({
                    ...prevStyles,
                    cta: {
                        ...prevStyles.cta,
                        color: key
                    }
                }));
                break;
            default:
                break;
        }
        setGranularColorsVisible(false)
        setColorTarget(null)
    }

    /* Deploy */
    const [projectName, setProjectName] = useState(`Wall St Bets and Sentiments`)
    const [presentationName, setPresentationName] = useState(`June 5th Bets`)

    const deployHandler = async () => {
        fetch(`/api/presentations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                project_name: projectName,
                presentation_name: presentationName,
                display_map: displayMap,
                data_meta: loadedDataMeta,
                data_snap_shot: connectedData,
                user_id: user.userId,
            }),
        }).then(response => response.json())
            .then(data => { console.log("presentation saved: ", data) })
    }


    return (
        <div className='px-10 py-2'>
            <div className='flex pb-6 gap-2 text-xs place-items-center'>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={() => setEdit(!edit)}> {edit ? 'Preview' : 'Continue Editing'}</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => deployHandler()}>Deploy</div>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={()=>setPaletteVisible(true)}>Pallate Picker</div>
                <div className='bg-slate-100/80 px-1 h-10'></div>
                <Label className="text-xs text-slate-600">Template</Label><div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={()=>setTemplate('classic')}>Classic</div>
            </div>
            {
            paletteVisible && <div className="">
                                <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1 my-2 float-right" onClick={()=>setPaletteVisible(false)}>close</div>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {categories.map((category, index) => (
                                        <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono cursor-pointer text-xs hover:bg-lychee_green"
                                            key={index}
                                            onClick={() => setSelectedCategory(category)}
                                        >
                                            {category}
                                        </code>
                                    ))}
                                </div>
                                {selectedCategory && (
                                    <div className="flex flex-wrap place-items-center place-content-center gap-3">
                                        {masterPalette[selectedCategory].map((palette, index) => (
                                            <div key={index} className="flex cursor-pointer rounded-full hover:shadow-inner hover:bg-slate-100 p-1" onClick={() => selectedPaletteHandler(index)}>
                                                {palette.map((color, colorIndex) => (
                                                    <div key={colorIndex} className="p-3 rounded-full" style={{ backgroundColor: color }}></div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                </div>
            }
            <div className='text-slate-400 text-sm pb-1'>This is how your pressie will look (make sure to load and save your dataset)</div>
            <div className="flex gap-10">
                <div className={`border border-slate-100 rounded-xl ${edit ? 'w-3/4' : 'w-full'}`}>
                    {
                        template === 'classic' && 
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                                {displayMap && connectedData && connectedData.length > 0 ?
                                        connectedData.map((data, index) => (
                                        <Card key={index} className="flex flex-col h-full">
                                            <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: '#000'}}>
                                                <small className="text-white text-sm font-medium leading-none">{data[displayMap.name] ? data[displayMap.name] : '-'}</small>
                                            </CardHeader>
                                            <CardContent className="py-4 grow">
                                                <p className="text-sm pt-1 text-muted-foreground pb-2">{data[displayMap.description] ? data[displayMap.description] : '-'}</p>
                                            </CardContent>
                                            <CardFooter className="flex place-content-end">
                                            {
                                                <Link rel="noopener noreferrer" target="_blank" href={''}><div className='bg-black px-3 py-1 rounded-md text-white text-xs cursor-pointer hover:bg-lychee_green hover:text-black'>Go</div></Link>
                                            }
                                            </CardFooter>
                                        </Card>
                                    ))
                                    : <Card key={0} className="flex flex-col h-full">
                                            <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: '#000'}}>
                                                <small className="text-white text-sm font-medium leading-none">Connect Data First</small>
                                            </CardHeader>
                                            <CardContent className="py-4 grow">
                                                <p className="text-sm pt-1 text-muted-foreground pb-2">You haven't connected data yet. But this is how a basic card will look</p>
                                            </CardContent>
                                            <CardFooter className="flex place-content-end">
                                            {
                                                <Link rel="noopener noreferrer" target="_blank" href={''}><div className='bg-black px-3 py-1 rounded-md text-white text-xs cursor-pointer hover:bg-lychee_green hover:text-black'>Go</div></Link>
                                            }
                                            </CardFooter>
                                        </Card>
                                }
                            </div>
                    }
                </div>
                {
                    edit &&
                    <div className='w-1/4 border border-slate-200 rounded-xl flex flex-col'>
                        <div className='px-4 pt-8'>
                            <p className="text-xs font-bold text-muted-foreground">Card Management</p>
                            <p className="text-xs text-muted-foreground">How would you like to present your data?</p>
                            <div className=''>
                                {displayMap && Object.keys(displayMap).map((key) => (
                                    <div key={key} className="py-2">
                                        <div className="text-left text-xs">
                                            {displayNames[key]}
                                        </div>
                                        <div className='flex flex-wrap gap-2'>
                                            <div className="w-2/5">
                                                <Select value={displayMap[key]} onValueChange={(value) => handleSelectChange(key, value)}>
                                                    <SelectTrigger >
                                                        <SelectValue placeholder="Select column" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {connectedCols.map((col) => (
                                                            <SelectItem key={col.field} value={col.field}>
                                                                {col.field}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>                                 
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {
                            granularColorsVisible &&
                                <>
                                    <div className="cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1" onClick={()=>setGranularColorsVisible(false)}>close</div>
                                    <div className="flex flex-wrap gap-2 p-2">
                                        {
                                            bgPalette && bgPalette.solids.map((solid, key) => (
                                                <div
                                                    key={key}
                                                    className={'flex rounded-md h-6 w-6 cursor-pointer hover:border hover:border-black'}
                                                    onClick={()=>updateGranularColorHandler(solid)}
                                                    style={{background: solid}}/>
                                            ))
                                        }
                                    </div>
                                </>
                        }
                    </div>
                }
            </div>
        </div>
    )
}

export default EasyLychee

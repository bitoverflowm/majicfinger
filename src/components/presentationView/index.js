import Link from 'next/link';
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

const PresentationView = () => {
    const user = useUser()
    const contextStateV2 = useMyStateV2()
    const [handle, setHandle] = useState()

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta

    const [displayMap, setDisplayMap] = useState({})
    const [styles, setStyles] = useState({
        'page': {
            backgroundColor: 'white'
        },
        'headerBox': {
            paddingTop: '60px',
            paddingBottom: '60px',
            paddingLeft: '44px',
            paddingRight: '44px',
            backgroundColor: 'black',
            display: 'flex',
            flexDirection: 'column',
            textAlign: 'center',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '2px',
        },
        'mainTitle': {
            fontSize: '32px',
            fontWeight: 700, // bold
            color: 'white',
            textAlign: 'center',
        },
        'subTitle': {
            fontSize: '16px',
            fontWeight: 400, // normal
            color: 'white',
            textAlign: 'center',
        },
        'cardHeading': {
            backgroundColor: 'lightgrey',
            padding: '20px',
        },
        'cardTitle': {
            fontSize: '20px',
            fontWeight: 700, // bold
            color: 'black',
            textAlign: 'center',
        },
        'cardBody': {
            backgroundColor: 'white'
        },
        'cardSubTitle': {
            fontSize: '16px',
            fontWeight: 400, // normal
            color: 'grey',
            textAlign: 'center',
        },
        'text0': {
            fontSize: '14px',
            fontWeight: 400, // normal
            color: 'black',
            textAlign: 'left',
        },
        'cta': {
            backgroundColor: 'blue',
            color: 'white',
            borderColor: 'darkblue',
            padding: '10px 20px',
            textAlign: 'center',
            fontSize: '14px',
            fontWeight: 400,
        },
        'cardFooter' : {
            display: 'flex',
            justifyContent: 'right',
            backgroundColor: 'white'
        }
    });
    

    const [projectName, setProjectName] = useState(`Wall St Bets and Sentiments`)
    const [presentationName, setPresentationName] = useState(`June 5th Bets`)

    const [edit, setEdit] = useState(true)
    const [mainTitle, setMainTitle] = useState('Title Goes Here')
    const [subTitle, setSubTitle] = useState(`Description goes here`)

    const [granularColorsVisible, setGranularColorsVisible] = useState(false)
    const [colorTarget, setColorTarget] = useState(null)

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

    const displayNames = {
        cardTitle: 'Title',
        cardSubTitle: 'Sub Title',
        text0: 'Body Text',
        cta: 'Call to Action'
    }

    const handleSelectChange = (key, value) => {
        setDisplayMap(prevState => {
            const newState = { ...prevState };
            newState[key] = value;
            return newState;
        });
    };

    const generateDisplayMap = () => {
        const colLen = connectedCols.length;
        return {
            cardTitle: colLen > 0 ? connectedCols[0].field : '',
            cardSubTitle: colLen > 1 ? connectedCols[1].field : '',
            text0: colLen > 2 ? connectedCols[2].field : '',
            cta: colLen > 3 ? connectedCols[3].field : '',
        };
    };

    useEffect(() => {
        if (connectedCols && connectedData) {
            setDisplayMap(generateDisplayMap());
        }
    }, [connectedCols, connectedData]);


    const handleStyleChange = (styleCategory, styleProperty, value) => {
        setStyles(prevStyles => ({
            ...prevStyles,
            [styleCategory]: {
                ...prevStyles[styleCategory],
                [styleProperty]: value
            }
        }))
    }

    const handleIncrement = (category, property) => {
        setStyles(prevStyles => {
            let newValue;
    
            if (property === 'fontWeight') {
                newValue = Math.min(parseInt(prevStyles[category][property]) + 100, 900);
                return {
                    ...prevStyles,
                    [category]: {
                        ...prevStyles[category],
                        [property]: newValue
                    }
                };
            } else {
                newValue = Math.min(parseInt(prevStyles[category][property]) + 5, 56);
                return {
                    ...prevStyles,
                    [category]: {
                        ...prevStyles[category],
                        [property]: newValue + 'px'
                    }
                };
            }
        });
    };
    
    const handleDecrement = (category, property) => {
        setStyles(prevStyles => {
            let newValue;
    
            if (property === 'fontWeight') {
                newValue = Math.max(parseInt(prevStyles[category][property]) - 100, 100);
                return {
                    ...prevStyles,
                    [category]: {
                        ...prevStyles[category],
                        [property]: newValue
                    }
                };
            } else {
                newValue = Math.max(parseInt(prevStyles[category][property]) - 5, 0);
                return {
                    ...prevStyles,
                    [category]: {
                        ...prevStyles[category],
                        [property]: newValue + 'px'
                    }
                };
            }
        });
    };    


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
    

    return (
        <div className='px-10 py-2'>
            <div className='flex pb-6 gap-2 text-xs'>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={() => setEdit(!edit)}> {edit ? 'Preview' : 'Continue Editing'}</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => deployHandler()}>Deploy</div>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={()=>setPaletteVisible(true)}>Pallate Picker</div>
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
                    <div className='' style={styles.headerBox}>
                        {/* Heading */}
                        <div style={styles.mainTitle}>{mainTitle}</div>
                        <div style={styles.subTitle}>{subTitle}</div>
                        <Avatar>
                            <AvatarImage src="/avatar1.png" />
                            <AvatarFallback>MP</AvatarFallback>
                        </Avatar> by Mr. Pink
                    </div>
                    {displayMap ?
                        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-10' style={styles.page}>
                            {
                                connectedData.length > 0 ?
                                    connectedData.map((row, index) => (
                                        <Card key={index} className="border-0 shadow-xl">
                                            <CardHeader style={styles.cardHeading}>
                                                <CardTitle style={styles.cardTitle}>{row[displayMap.cardTitle] ? row[displayMap.cardTitle] : '-'}</CardTitle>
                                                <CardDescription style={styles.cardSubTitle}>{row[displayMap.cardSubTitle] ? row[displayMap.cardSubTitle] : '-'}</CardDescription>
                                            </CardHeader>
                                            <CardContent className="pt-4" style={styles.cardBody}>
                                                <p style={styles.text0}>{row[displayMap.text0] ? row[displayMap.text0] : '-'}</p>
                                            </CardContent>
                                            <CardFooter style={styles.cardFooter}>
                                                {
                                                    displayMap.cta && <Button style={styles.cta} href={'https://x.com/misterrpink1'}>{row[displayMap.cta]}</Button>
                                                }
                                            </CardFooter>                                            
                                        </Card>
                                    ))
                                    : <div>This dataset you have selected is currently empty. Add some data to create your presentations</div>
                            }
                        </div>
                        : <div>Load a dataset to start generating your presentations</div>
                    }
                </div>
                {
                    edit &&
                    <div className='w-1/4 border border-slate-200 rounded-xl flex flex-col'>
                        <div className='px-4 pt-4'>
                            <p className="text-xs text-muted-foreground">Header</p>                        
                            <div className=''>
                                <Label htmlFor="mainTitle" className="text-xs">Title</Label>
                                <div className='flex gap-2'>
                                    <Input id="mainTitle" type="text" placeholder="Title" onChange={(e)=>setMainTitle(e.target.value)} />
                                    <Button variant="outline" onClick={() => granularColorHandler('mainTitleText')} className="w-10" style={{color : styles.mainTitle.color, backgroundColor: styles.headerBox.backgroundColor}}>A</Button></div>
                            </div>
                            <div className=''>
                                <Label htmlFor="subTitle" className="text-xs">Description</Label>
                                <div className='flex gap-2'>
                                    <Textarea id="subTitle" type="text" placeholder="Description" onChange={(e)=>setSubTitle(e.target.value)} />
                                    <Button variant="outline" onClick={() => granularColorHandler('subTitleText')} className="w-10" style={{color : styles.subTitle.color, backgroundColor: styles.headerBox.backgroundColor}}>A</Button>
                                </div>
                            </div>
                        </div>
                        <div className='px-4 pt-2'>
                            <p className="pb-1 text-xs text-muted-foreground">Header Container Styles</p>
                            <div className='flex flex-wrap gap-5 place-items-center'>
                                <Button variant="outline" size="icon" onClick={() => granularColorHandler('headerBackground')} style={{backgroundColor: styles.headerBox.backgroundColor}}></Button>
                                <ToggleGroup
                                    type="single"
                                    value={styles.headerBox.alignItems}
                                    onValueChange={(value) => handleStyleChange('headerBox', 'alignItems', value)}
                                    aria-label="Align Items"
                                    className=""
                                >
                                    <ToggleGroupItem value="flex-start" aria-label="Flex Start">
                                        <TextAlignLeftIcon />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="center" aria-label="Center">
                                        <TextAlignCenterIcon />
                                    </ToggleGroupItem>
                                    <ToggleGroupItem value="flex-end" aria-label="Flex End">
                                        <TextAlignRightIcon />
                                    </ToggleGroupItem>
                                </ToggleGroup>
                                <div className='flex gap-1'>
                                    <Button  variant="outline" size="icon" className="border-slate-100" onClick={() => handleDecrement('headerBox', 'gap')}><TextAlignMiddleIcon/></Button>
                                    <Button  variant="outline" size="icon" className="border-slate-100" onClick={() => handleIncrement('headerBox', 'gap')}><LineHeightIcon /></Button>
                                </div>
                            </div>
                        </div>

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
                                            {
                                                key === 'cta' ? 
                                                    <div>
                                                        <Button variant="outline" onClick={() => granularColorHandler('ctaBorder')} className="w-10" style={{borderColor : styles.cta.borderColor}}>A</Button>
                                                        <Button variant="outline" onClick={() => granularColorHandler('ctaBackground')} className="w-10" style={{backgroundColor : styles.cta.backgroundColor}}>A</Button>
                                                        <Button variant="outline" onClick={() => granularColorHandler('ctaText')} className="w-10" style={{color : styles.cta.color}}>A</Button>
                                                    </div> : 
                                                    <Button variant="outline" onClick={() => granularColorHandler(key)} className="w-10" style={{color : styles[key].color}}>A</Button>
                                            }
                                            <div className='flex gap-1 text-xs place-items-center'>
                                                <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleDecrement(key, 'fontSize')}>-</Button>
                                                <div className='text-xs px-1'><FontSizeIcon /></div>
                                                <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleIncrement(key, 'fontSize')}>+</Button>
                                            </div>
                                            <div className='flex gap-1 text-xs place-items-center'>
                                                <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleDecrement(key, 'fontWeight')}>-</Button>
                                                <div className='text-xs px-1'><FontBoldIcon /></div>
                                                <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleIncrement(key, 'fontWeight')}>+</Button>
                                            </div>
                                            {
                                                key === 'cta' ? <ToggleGroup
                                                                    type="single"
                                                                    value={styles.cardFooter.justifyContent}
                                                                    onValueChange={(value) => handleStyleChange('cardFooter', 'justifyContent', value)}
                                                                    aria-label="Align Items"
                                                                    className=""
                                                                >
                                                                    <ToggleGroupItem value="left" aria-label="Left">
                                                                        <TextAlignLeftIcon />
                                                                    </ToggleGroupItem>
                                                                    <ToggleGroupItem value="center" aria-label="Center">
                                                                        <TextAlignCenterIcon />
                                                                    </ToggleGroupItem>
                                                                    <ToggleGroupItem value="right" aria-label="Right">
                                                                        <TextAlignRightIcon />
                                                                    </ToggleGroupItem>
                                                                </ToggleGroup>
                                                                : <ToggleGroup
                                                                type="single"
                                                                value={styles[key].textAlign}
                                                                onValueChange={(value) => handleStyleChange(key, 'textAlign', value)}
                                                                aria-label="Align Items"
                                                                className=""
                                                                 >
                                                                    <ToggleGroupItem value="left" aria-label="Left">
                                                                        <TextAlignLeftIcon />
                                                                    </ToggleGroupItem>
                                                                    <ToggleGroupItem value="center" aria-label="Center">
                                                                        <TextAlignCenterIcon />
                                                                    </ToggleGroupItem>
                                                                    <ToggleGroupItem value="right" aria-label="Right">
                                                                        <TextAlignRightIcon />
                                                                    </ToggleGroupItem>
                                                                </ToggleGroup>
                                            }                                            
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className='px-4 py-2'>
                            <p className="pb-1 text-xs text-muted-foreground">Card Header Styles</p>
                            <div className='flex gap-5 place-items-center'>
                                <Button variant="outline" className="p-3 w-5 h-5" onClick={() => granularColorHandler('cardHeadingBackground')} style={{backgroundColor: styles.cardHeading.backgroundColor}}></Button>
                                <div className='flex gap-1 text-xs place-items-center'>
                                    <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleDecrement('cardHeading', 'padding')}>-</Button>
                                    <div className='text-xs px-1'>Padding</div>
                                    <Button  variant="outline" className="p-3 w-1 h-1 rounded-full border-slate-100" onClick={() => handleIncrement('cardHeading', 'padding')}>+</Button>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div>Publishing Meta</div>
                            <div>This is your handle. You can change it here. This will impact all projects, urls, you may have shared</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="handle">Yout Handle</Label>
                                <Input id="handle" type="text" placeholder="Title" onChange={(e)=>setHandle(e.target.value)} />
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

export default PresentationView

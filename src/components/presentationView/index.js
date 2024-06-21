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
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

import { bgPalette } from '@/components/chartView/panels/bgPalette';
import { LineHeightIcon, TextAlignCenterIcon, TextAlignLeftIcon, TextAlignMiddleIcon, TextAlignRightIcon } from '@radix-ui/react-icons';

const PresentationView = () => {
    const user = useUser()
    const contextStateV2 = useMyStateV2()
    const [handle, setHandle] = useState()

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta

    const [displayMap, setDisplayMap] = useState({})
    const [styles, setStyles] = useState({
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
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
        },
        'subTitle': {
            fontSize: '16px',
            fontWeight: 'normal',
            color: 'white',
            textAlign: 'center',
        },
        'cardHeading': {
            backgroundColor: 'lightgrey',
            padding: '20px',
            fontSize: '24px',
        },
        'cardTitle': {
            fontSize: '20px',
            fontWeight: 'bold',
            color: 'black',
            textAlign: 'center',
        },
        'cardSubTitle': {
            fontSize: '16px',
            fontWeight: 'normal',
            color: 'grey',
            textAlign: 'center',
        },
        'text0': {
            fontSize: '14px',
            fontWeight: 'normal',
            color: 'black',
            textAlign: 'left',
        },
        'cta': {
            backgroundColor: 'blue',
            color: 'white',
            borderColor: 'darkblue',
            padding: '10px 20px',
            textAlign: 'center',
        },  
    })

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
            const newValue = Math.min(parseInt(prevStyles[category][property]) + 5, 56);
            return {
                ...prevStyles,
                [category]: {
                    ...prevStyles[category],
                    [property]: newValue + 'px'
                }
            };
        });
    };
    
    const handleDecrement = (category, property) => {
        setStyles(prevStyles => {
            const newValue = Math.max(parseInt(prevStyles[category][property]) - 5, 0);
            return {
                ...prevStyles,
                [category]: {
                    ...prevStyles[category],
                    [property]: newValue + 'px'
                }
            };
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

    return (
        <div className='px-10 py-2'>
            <div className='flex pb-6 gap-2 text-xs'>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={() => setEdit(!edit)}> {edit ? 'Preview' : 'Continue Editing'}</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => deployHandler()}>Deploy</div>
            </div>
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
                        <div className='grid grid-cols-3 gap-4 p-10'>
                            {
                                connectedData.length > 0 ?
                                    connectedData.map((row, index) => (
                                        <Card key={index}>
                                            <CardHeader style={styles.cardHeading}>
                                                <CardTitle style={styles.cardTitle}>{row[displayMap.cardTitle] ? row[displayMap.cardTitle] : '-'}</CardTitle>
                                                <CardDescription style={styles.cardSubTitle}>{row[displayMap.cardSubTitle] ? row[displayMap.cardSubTitle] : '-'}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p style={styles.text0}>{row[displayMap.text0] ? row[displayMap.text0] : '-'}</p>
                                            </CardContent>
                                            <CardFooter>
                                                {
                                                    displayMap.cta && <Button style={styles.cta} href={'https://x.com/misterrpink1'}>Go Now {row[displayMap.cta]}</Button>
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
                            <div className='hidden grid grid-cols-4'>
                                <div className=''>
                                    <Label htmlFor="headerBoxPaddingTop" className="text-xs">Top</Label>
                                    <Input id="headerBoxPaddingTop" type="number" placeholder="Padding Top" onChange={(e) => handleStyleChange('headerBox', 'paddingTop', e.target.value + 'px')} />
                                </div>
                                <div className='flex gap-2'>
                                    <Label htmlFor="headerBoxPaddingBottom">Padding Bottom</Label>
                                    <Input id="headerBoxPaddingBottom" type="number" placeholder="Padding Bottom" onChange={(e) => handleStyleChange('headerBox', 'paddingBottom', e.target.value + 'px')} />
                                </div>
                                <div className='flex gap-2'>
                                    <Label htmlFor="headerBoxPaddingLeft">Padding Left</Label>
                                    <Input id="headerBoxPaddingLeft" type="number" placeholder="Padding Left" onChange={(e) => handleStyleChange('headerBox', 'paddingLeft', e.target.value + 'px')} />
                                </div>
                                <div className='flex gap-2'>
                                    <Label htmlFor="headerBoxPaddingRight">Padding Right</Label>
                                    <Input id="headerBoxPaddingRight" type="number" placeholder="Padding Right" onChange={(e) => handleStyleChange('headerBox', 'paddingRight', e.target.value + 'px')} />
                                </div>
                            </div>
                            <div className='flex gap-5 place-items-center'>
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
                            <div className="w-full overflow-y-auto text-xs pt-2">
                                <table className="w-full">
                                    <tbody>
                                        {displayMap && Object.keys(displayMap).map((key) => (
                                            <tr key={key} className="m-0 border-t p-0 even:bg-muted">
                                            <td className="border pl-2 py-2 text-left">
                                                {displayNames[key]}
                                            </td>
                                            <td className="border px-4 py-2 text-left">
                                                <select
                                                    value={displayMap[key]}
                                                    onChange={(e) => handleSelectChange(key, e.target.value)}
                                                >
                                                {connectedCols.map((col) => (
                                                    <option key={col.field} value={col.field}>
                                                    {col.field}
                                                    </option>
                                                ))}
                                                </select>
                                            </td>
                                            <td className="border px-4 py-2 text-left">
                                                <div className='flex'>Hide</div>
                                            </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
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
                            <div>Title Styles</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardTitleFontSize">Font Size</Label>
                                <Input id="cardTitleFontSize" type="text" placeholder="Font Size" onChange={(e) => handleStyleChange('cardTitle', 'fontSize', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardTitleFontWeight">Font Weight</Label>
                                <Input id="cardTitleFontWeight" type="text" placeholder="Font Weight" onChange={(e) => handleStyleChange('cardTitle', 'fontWeight', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardTitleColor">Color</Label>
                                <Input id="cardTitleColor" type="text" placeholder="Color" onChange={(e) => handleStyleChange('cardTitle', 'color', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardTitleTextAlign">Text Align</Label>
                                <Input id="cardTitleTextAlign" type="text" placeholder="Text Align" onChange={(e) => handleStyleChange('cardTitle', 'textAlign', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div>Subtitle Styles</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardSubTitleFontSize">Font Size</Label>
                                <Input id="cardSubTitleFontSize" type="text" placeholder="Font Size" onChange={(e) => handleStyleChange('cardSubTitle', 'fontSize', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardSubTitleFontWeight">Font Weight</Label>
                                <Input id="cardSubTitleFontWeight" type="text" placeholder="Font Weight" onChange={(e) => handleStyleChange('cardSubTitle', 'fontWeight', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardSubTitleColor">Color</Label>
                                <Input id="cardSubTitleColor" type="text" placeholder="Color" onChange={(e) => handleStyleChange('cardSubTitle', 'color', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardSubTitleTextAlign">Text Align</Label>
                                <Input id="cardSubTitleTextAlign" type="text" placeholder="Text Align" onChange={(e) => handleStyleChange('cardSubTitle', 'textAlign', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div>Text Styles</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="text0FontSize">Font Size</Label>
                                <Input id="text0FontSize" type="text" placeholder="Font Size" onChange={(e) => handleStyleChange('text0', 'fontSize', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="text0FontWeight">Font Weight</Label>
                                <Input id="text0FontWeight" type="text" placeholder="Font Weight" onChange={(e) => handleStyleChange('text0', 'fontWeight', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="text0Color">Color</Label>
                                <Input id="text0Color" type="text" placeholder="Color" onChange={(e) => handleStyleChange('text0', 'color', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="text0TextAlign">Text Align</Label>
                                <Input id="text0TextAlign" type="text" placeholder="Text Align" onChange={(e) => handleStyleChange('text0', 'textAlign', e.target.value)} />
                            </div>
                        </div>

                        <div>
                            <div>CTA Button Styles</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="ctaBgColor">Background Color</Label>
                                <Input id="ctaBgColor" type="text" placeholder="Background Color" onChange={(e) => handleStyleChange('cta', 'backgroundColor', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="ctaTextColor">Text Color</Label>
                                <Input id="ctaTextColor" type="text" placeholder="Text Color" onChange={(e) => handleStyleChange('cta', 'color', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="ctaBorderColor">Border Color</Label>
                                <Input id="ctaBorderColor" type="text" placeholder="Border Color" onChange={(e) => handleStyleChange('cta', 'borderColor', e.target.value)} />
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

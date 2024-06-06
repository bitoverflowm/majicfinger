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


const PresentationView = () => {
    const user = useUser()
    const contextStateV2 = useMyStateV2()
    const [handle, setHandle] = useState()

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta

    const [displayMap, setDisplayMap] = useState()
    const [styles, setStyles] = useState({
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
    })
    const [projectName, setProjectName] = useState(`Wall St Bets and Sentiments`)
    const [presentationName, setPresentationName] = useState(`June 5th Bets`)

    const [edit, setEdit] = useState(true)
    const [mainTitle, setMainTitle] = useState('Where to Launch Your AI Project')
    const [subTitle, setSubTitle] = useState(`I spent 12 months and $14,327 to find which AI directories are the best, so you don't have to.... \n A curated list ranking my favorite directories based on: tangible traffic, project growth, MRR and SEO improvements`)



    useEffect(() => {
        if (connectedCols && connectedData) {
            let colLen = connectedCols.length
            setDisplayMap({
                'cardTitle': colLen > 0 ? connectedCols[0].field : '',
                'cardSubTitle': colLen > 1 ? connectedCols[1].field : '',
                'text0': colLen > 2 ? connectedCols[2].field : '',
                'cta': colLen > 4 ? connectedCols[4].field : '',
            })
        }
    }, [connectedData, connectedCols])

    const handleSelectChange = (key, value) => {
        setDisplayMap(prevState => ({
            ...prevState,
            [key]: value
        }))
    }

    const handleStyleChange = (styleCategory, styleProperty, value) => {
        setStyles(prevStyles => ({
            ...prevStyles,
            [styleCategory]: {
                ...prevStyles[styleCategory],
                [styleProperty]: value
            }
        }))
    }

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
            <div className='flex pb-6 gap-2'>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={() => setEdit(!edit)}> {edit ? 'Stop Editing' : 'Start Editing'}</div>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' >Preview</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => deployHandler()}>Deploy</div>
            </div>
            <div className='text-slate-400 text-sm'>Workspace</div>
            <div className="flex">
                <div className={`border border-slate-100 rounded-xl ${edit ? 'w-3/4' : 'w-full'}`}>
                    <div className='py-20 px-44 bg-black text-white flex flex-col text-center place-items-center place-content-center gap-2'>
                        {/* Heading */}
                        <div className='text-8xl text-center font-[800]'>{mainTitle}</div>
                        <div className='text-lychee_white'>{subTitle}</div>
                        <Avatar>
                            <AvatarImage src="/avatar1.png" />
                            <AvatarFallback>MP</AvatarFallback>
                        </Avatar> by Mr. Pink
                    </div>
                    {displayMap ?
                        <div className='grid grid-cols-3 gap-4 p-10'>
                            {
                                connectedData.length > 0 ?
                                    connectedData.map((row) => (
                                        <Card key={row[displayMap.cardTitle]}>
                                            <CardHeader style={styles.cardHeading}>
                                                <CardTitle style={styles.cardTitle}>{row[displayMap.cardTitle] ? row[displayMap.cardTitle] : 'cardTitle'}</CardTitle>
                                                <CardDescription style={styles.cardSubTitle}>{row[displayMap.cardSubTitle] ? row[displayMap.cardSubTitle] : 'cardSubTitle'}</CardDescription>
                                            </CardHeader>
                                            <CardContent>
                                                <p style={styles.text0}>{row[displayMap.text0] ? row[displayMap.text0] : 'text 0'}</p>
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
                    <div className='w-1/4 border border-slate-200 rounded-xl flex flex-col gap-6'>
                        <div className='p-2'>
                            <div className='flex gap-2'>
                                <Label htmlFor="mainTitle">Main Title</Label>
                                <Input id="mainTitle" type="text" placeholder="Title" onChange={(e)=>setMainTitle(e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="subTitle">Description</Label>
                                <Textarea id="subTitle" type="text" placeholder="subTitle" onChange={(e)=>setSubTitle(e.target.value)} />
                            </div>
                        </div>

                        <div className=''>
                            <Label>Edit your card template</Label>
                            {displayMap && Object.keys(displayMap).map((key) => (
                                <div key={key} className='p-1 flex gap-2'>
                                    <div>{key}:</div>
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
                                    <div className='flex'>Hide</div>
                                </div>
                            ))}
                        </div>
                        <div>
                            <div>Card Heading Styles</div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardHeadingBgColor">Background Color</Label>
                                <Input id="cardHeadingBgColor" type="text" placeholder="Background Color" onChange={(e) => handleStyleChange('cardHeading', 'backgroundColor', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardHeadingPadding">Padding</Label>
                                <Input id="cardHeadingPadding" type="text" placeholder="Padding" onChange={(e) => handleStyleChange('cardHeading', 'padding', e.target.value)} />
                            </div>
                            <div className='flex gap-2'>
                                <Label htmlFor="cardHeadingFontSize">Font Size</Label>
                                <Input id="cardHeadingFontSize" type="text" placeholder="Font Size" onChange={(e) => handleStyleChange('cardHeading', 'fontSize', e.target.value)} />
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
                    </div>
                }
            </div>
        </div>
    )
}

export default PresentationView

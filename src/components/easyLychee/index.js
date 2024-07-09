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

import { masterPalette } from '../chartView/panels/masterPalette';

import { toast } from 'sonner';


const EasyLychee = () => {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const baseUrl = isDevelopment ? 'http://localhost:3000/easy/' : 'https://www.lych3e.com/easy/';

    const user = useUser()
    const contextStateV2 = useMyStateV2()

    let userHandle = contextStateV2?.userHandle

    let connectedCols = contextStateV2?.connectedCols
    let connectedData = contextStateV2?.connectedData
    let loadedDataMeta = contextStateV2?.loadedDataMeta
    let loadedPresentationMeta = contextStateV2?.loadedPresentationMeta
    let connectedPresentation = contextStateV2?.connectedPresentation

    //handle used for saving and publishing website
    const [handle, setHandle] = useState()
    const [template, setTemplate] = useState('classic')
    
    const [displayMap, setDisplayMap] = useState({})
    
    //control panel
    const [edit, setEdit] = useState(true)
    const [mainTitle, setMainTitle] = useState('Title Goes Here')
    const [subTitle, setSubTitle] = useState(`Description goes here`)

    const [selectedPalette, setSelectedPalette] = useState(['#000']);

    const [displayNames, setDisplaNames] = useState()
    const [projectName, setProjectName] = useState(`myProject`)
    const [presentationName, setPresentationName] = useState(`page1`)

    useEffect(()=> {
        if(connectedPresentation){
            console.log('connectedPresentation: ', connectedPresentation)
            setTemplate(connectedPresentation.template)
            setDisplayMap(connectedPresentation.display_map)
            setEdit(false)
            setMainTitle(connectedPresentation.main_title)
            setSubTitle(connectedPresentation.sub_title)
            setSelectedPalette(connectedPresentation.palette)
            setProjectName(connectedPresentation.project_name)
            setPresentationName(connectedPresentation.presentation_name)
            if (connectedCols && connectedData) {
                if(connectedPresentation.template === 'classic'){
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
        }
    },[connectedPresentation])

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

    const isValidLink = (url) => {
        try {
          new URL(url);
          return true;
        } catch (e) {
          return false;
        }
    };

    const renderLinkOrButton = (url) => {
        return isValidLink(url) ? (
          <Link rel="noopener noreferrer" target="_blank" href={url}>
            <div className='bg-black px-3 py-1 rounded-md text-white text-xs cursor-pointer hover:bg-lychee_green hover:text-black'>Go</div>
          </Link>
        ) : (
          <div className='bg-gray-400 px-3 py-1 rounded-md text-white text-xs cursor-not-allowed'>Go</div>
        );
    };

    /* Color management */

    const [paletteVisible, setPaletteVisible] = useState()
    const [selectedCategory, setSelectedCategory] = useState(null);
    const categories = Object.keys(masterPalette);

    const selectedPaletteHandler = (index) => {
        let newPalette = masterPalette[selectedCategory][index];
        if (!newPalette || !newPalette.length) return; // Ensure newPalette is valid
        setSelectedPalette(newPalette);
    };
    
    const getRandomColor = () => {
        return selectedPalette[Math.floor(Math.random() * selectedPalette.length)];
    };

    /* Deploy */

    const handleDeploy = async (presentationId) => {
        try{
            if (!presentationId) {
                presentationId = await saveHandler(); // Get the presentation ID from saveHandler if not provided
            } else {
                await saveHandler(); // Ensure the presentation is saved before deploying
            }
    
            if (!presentationId) {
                throw new Error('Failed to save presentation. No presentation ID returned.');
            }
        
            const response = await fetch('/api/presentations/deploy', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ presentationId }),
            });

            const data = await response.json();
            if (data.success) {
                toast('Presentation deployed!', {
                    description: 'Your presentation has been successfully deployed.',
                    closeButton: true,
                    duration: 3000,
                });
            } else {
                console.error('Failed to deploy presentation:', data.message);
            }
        } catch(error){
            console.error('Error deploying presentation:', error);
        };
    };

    const saveHandler = async () => {
        try {
            let response;
            if (loadedPresentationMeta) {
                // Update existing presentation
                response = await fetch(`/api/presentations/presentation/${loadedPresentationMeta._id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        project_name: projectName,
                        presentation_name: presentationName,
                        template: template,
                        main_title: mainTitle,
                        sub_title: subTitle,
                        display_map: displayMap,
                        data_meta: loadedDataMeta,
                        data_snap_shot: connectedData,
                        palette: selectedPalette,
                        last_saved_date: new Date(),
                    }),
                });
            } else {
                // Create new presentation
                response = await fetch(`/api/presentations/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        // user specified for their own reference. This will also be used for slug
                        project_name: projectName,
                        // lychee/userhandle/projectname/pagename
                        presentation_name: presentationName,
                        template: template,
                        main_title: mainTitle,
                        sub_title: subTitle,
                        display_map: displayMap,
                        data_meta: loadedDataMeta,
                        data_snap_shot: connectedData,
                        palette: selectedPalette,
                        user_id: user.userId,
                    }),
                });
            }
            
            const data = await response.json();
            if (data.success) {
                console.log("Presentation saved: ", data);
                return data.data._id; // Return the presentation ID
            } else {
                console.error("Error saving presentation: ", data.message);
                return null;
            }
        } catch (error) {
            console.error('Error saving presentation:', error);
            return null;
        }
    };
    


    return (
        <div className='px-10 py-2'>
            <div className='flex pb-6 gap-2 text-xs place-items-center'>
                <div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={() => setEdit(!edit)}> {edit ? 'Hide Edit' : 'Show Edit Panel'}</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => saveHandler()}>Save</div>
                <div className='bg-black text-white p-2 rounded-sm cursor-pointer' onClick={() => handleDeploy(loadedPresentationMeta && loadedPresentationMeta._id)}>Deploy</div>
                <div className='bg-slate-100/80 px-1 h-10'></div>
                <Label className="text-xs text-slate-600">Template</Label><div className='bg-slate-100 text-black p-2 rounded-sm cursor-pointer' onClick={()=>setTemplate('classic')}>Classic</div>
            </div>
            <div className='text-slate-400 text-sm pb-1'>This is how your page will look</div>
            <div className="flex gap-10">
                <div className={`border border-slate-100 rounded-xl w-full p-10`}>
                    <div className='h-96 text-center flex flex-col place-items-center
                    place-content-center'>
                        <h1 className="py-6 scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl">
                            {mainTitle}
                        </h1>
                        <p className="text-sm text-muted-foreground py-2 w-1/2">{subTitle}</p>
                        <p className="text-xs text-muted-foreground">
                            Created by
                            <Link rel="noopener noreferrer" target="_blank" href={''}>
                                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                    @{userHandle}
                                </code></Link> 
                            using 
                            <Link rel="noopener noreferrer" target="_blank" href={'www.lych3e.com'}>
                                <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
                                    EasyLychee
                                </code></Link>
                        </p>                        
                    </div>
                    {
                        template === 'classic' && 
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-10">
                                {displayMap && connectedData && connectedData.length > 0 ?
                                        connectedData.map((data, index) => (
                                        <Card key={index} className="flex flex-col h-full">
                                            <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: getRandomColor()}}>
                                                <small className="text-white text-sm font-medium leading-none">{data[displayMap.name] ? data[displayMap.name] : '-'}</small>
                                            </CardHeader>
                                            <CardContent className="py-4 grow">
                                                <p className="text-sm pt-1 text-muted-foreground pb-2">{data[displayMap.description] ? data[displayMap.description] : '-'}</p>
                                            </CardContent>
                                            <CardFooter className="flex place-content-end">
                                                {renderLinkOrButton(data[displayMap.link])}
                                            </CardFooter>
                                        </Card>
                                    ))
                                    : <Card key={0} className="flex flex-col h-full">
                                            <CardHeader className={`w-full items-center rounded-md py-20`} style={{backgroundColor: getRandomColor()}}>
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
                    <div className="fixed top-20 right-10 w-1/4 border border-slate-200 rounded-xl flex flex-col bg-white shadow-lg"
                    style={{ zIndex: 20 }}>
                        {
                            paletteVisible ? 
                                <div className="">
                                        <div className="mt-2 ml-4 cursor-pointer bg-yellow-300/40 w-16 hover:bg-slate-300/40  text-xs pl-1" onClick={()=>setPaletteVisible(false)}>Close</div>
                                        <div className="p-4 flex flex-wrap gap-2 mb-4">
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
                                            <div className="pb-6 px-3 flex flex-wrap place-items-center place-content-center gap-1">
                                                {masterPalette[selectedCategory].map((palette, index) => (
                                                    <div key={index} className="flex cursor-pointer rounded-full hover:shadow-inner hover:bg-slate-100 p-1" onClick={() => selectedPaletteHandler(index)}>
                                                        {palette.map((color, colorIndex) => (
                                                            <div key={colorIndex} className="p-2 rounded-full" style={{ backgroundColor: color }}></div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                        )}                                    
                            </div>
                            :
                            <div className='px-8 py-8 w-full'>
                                <p className="text-xs font-bold text-muted-foreground">Card Management</p>
                                <p className="text-xs text-muted-foreground">How would you like to present your data?</p>
                                <div className=''>
                                    {displayMap && Object.keys(displayMap).map((key) => (
                                        <div key={key} className="py-2">
                                            <div className="text-left text-xs">
                                                {displayNames && displayNames[key]}
                                            </div>
                                            <div className='flex flex-wrap gap-2'>
                                                <div className="w-3/5 text-xs">
                                                    <Select value={displayMap[key]} onValueChange={(value) => handleSelectChange(key, value)}>
                                                        <SelectTrigger >
                                                            <SelectValue placeholder="Select column" className='text-xs'/>
                                                        </SelectTrigger>
                                                        <SelectContent className='text-xs'>
                                                            {connectedCols.map((col) => (
                                                                <SelectItem key={col.field} value={col.field} className='text-xs'>
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
                                <div className='pt-4'>
                                    <p className="text-xs text-muted-foreground">Hero Section</p>                        
                                    <div className=''>
                                        <Label htmlFor="mainTitle" className="text-xs">Title</Label>
                                        <Input id="mainTitle" type="text" placeholder="Title" value={mainTitle} onChange={(e)=>setMainTitle(e.target.value)} />
                                    </div>
                                    <div className=''>
                                        <Label htmlFor="subTitle" className="text-xs">Sub Title</Label>
                                        <Textarea id="subTitle" type="text" placeholder="Description" value={subTitle} onChange={(e)=>setSubTitle(e.target.value)} />
                                    </div>
                                </div>
                                <div className='pt-4'>
                                    <div className='bg-slate-100 text-xs w-32 text-black p-2 rounded-lg cursor-pointer' onClick={()=>setPaletteVisible(true)}>Pick a Pallate</div>
                                </div>
                                <p className="text-xs font-bold text-muted-foreground pt-2">Admin Stuff</p>
                                <p className="text-xs text-muted-foreground">When you deploy, your page will be accessible here:</p>
                                <div className="max-w-full break-words px-2 py-4">
                                    <Link rel="noopener noreferrer" target="_blank" href={`${baseUrl}${userHandle}/${projectName}/${presentationName}`}>
                                        <small className="text-xs font-medium leading-none">www.lych3e.com/easy/{userHandle}/{projectName}/{presentationName}</small>
                                    </Link>
                                </div>
                                <div>
                                    <small className="text-xs font-medium leading-none">Deployment Checklist</small>
                                    <div className='flex flex-col gap-2'>
                                        <div className=''>
                                            <Label htmlFor="projectName" className="text-xs">Project Name</Label>
                                            <Input
                                                id="projectName"
                                                type="text"
                                                placeholder="Project Name"
                                                value={projectName}
                                                onChange={(e) => setProjectName(e.target.value)}
                                            />
                                        </div>
                                        <div className=''>
                                            <Label htmlFor="presentationName" className="text-xs">Presentation Name</Label>
                                            <Input
                                                id="presentationName"
                                                type="text"
                                                placeholder="Presentation Name"
                                                value={presentationName}
                                                onChange={(e) => setPresentationName(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        }                        
                    </div>
                }
            </div>
        </div>
    )
}

export default EasyLychee

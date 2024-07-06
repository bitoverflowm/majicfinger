import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import moment from "moment"

import { Menu } from "lucide-react"

//Shdcn
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { useUser } from '@/lib/hooks';
import { useMyStateV2  } from '@/context/stateContextV2'
import { Badge } from "@/components/ui/badge"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardFooter, CardDescription } from "@/components/ui/card"


const Nav = () => {
  const user = useUser()
  const router = useRouter();
  const contextStateV2 = useMyStateV2()

  //what component are we viewing
  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing


  const connectedData = contextStateV2?.connectedData
  const dataSetName = contextStateV2?.dataSetName
  const setDataSetName = contextStateV2?.setDataSetName
  
  const savedDataSets = contextStateV2?.savedDataSets
  const setConnectedData = contextStateV2?.setConnectedData

  const loadedDataMeta = contextStateV2?.loadedDataMeta
  const setLoadedDataMeta = contextStateV2?.setLoadedDataMeta
  const loadedDataId = contextStateV2?.loadedDataId
  const setLoadedDataId = contextStateV2?.setLoadedDataId

  const savedPresentations = contextStateV2?.savedPresentations
  const loadedPresentationMeta = contextStateV2?.loadedPresentationMeta
  const setLoadedPresentationMeta = contextStateV2?.setLoadedPresentationMeta
  const connectedPresentation = contextStateV2?.connectedPresentation
  const setConnectedPresentation = contextStateV2?.setConnectedPresentation



  //saving charts
  const savedCharts = contextStateV2?.savedCharts
  const setSavedCharts = contextStateV2?.setSavedCharts

  //let system know to conduct refetch
  const setRefetchData = contextStateV2?.setRefetchData
  const setRefetchChart = contextStateV2?.setRefetchData
  const setRefetchPresentations = contextStateV2?.setRefetchPresentations

  //current chart view properties
  const chartOptions = contextStateV2?.chartOptions
  const chartTheme = contextStateV2?.chartTheme
  const bgColor = contextStateV2?.bgColor
  const textColor = contextStateV2?.textColor
  const cardColor = contextStateV2?.cardColor
  const title = contextStateV2?.title
  const subTitle = contextStateV2?.subTitle

  //loading charts
  const loadedChartMeta = contextStateV2?.loadedChartMeta
  const setLoadedChartMeta = contextStateV2?.setLoadedChartMeta

  //setting loaded chart values for viewing
  const setChartOptions = contextStateV2?.setChartOptions
  const setChartTheme = contextStateV2?.setChartTheme
  const setBgColor = contextStateV2?.setBgColor
  const setTextColor = contextStateV2?.setTextColor
  const setCardColor = contextStateV2?.setCardColor
  const setTitle = contextStateV2?.setTitle
  const setSubTitle = contextStateV2?.setSubTitle


  const [isOpen, setIsOpen] = useState(false) 
  const [saveIsOpen, setSaveIsOpen] = useState(false)
  const [newDataName, setNewDataName] = useState()
  const [newChartName, setNewChartName] = useState()

  const handleLogout = async () => {
    //e.preventDefault(); // Prevent the default link behavior

    try {
      const response = await fetch('/api/logout', {
        method: 'POST', // Make sure to use POST if your logout API expects it
      });

      // If the logout was successful, redirect to the homepage
      if (response.ok) {
        router.push('/');
      } else {
        // Handle errors or unsuccessful logout attempts here
        console.error('Logout failed');
      }
    } catch (error) {
      console.error('An error occurred during logout', error);
    }
  };

  const [overwrite, setOverwrite] = useState()

  const handleSave = async () => {
      if(overwrite){
        if(viewing === 'charts'){
          alert('overwrite mode')
          fetch(`/api/charts/chart/${loadedChartMeta._id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                chart_name: loadedChartMeta.chart_name,
                chart_properties: [{
                  'chartOptions': chartOptions,
                  'chartTheme': chartTheme,
                  'bgColor': bgColor,
                  'textColor': textColor,
                  'cardColor': cardColor,
                  'title': title,
                  'subTitle': subTitle
                }],
                last_saved_date: new Date(),
                labels: ['test'],
            }),
          })
          .then(response => response.json())
          .then(data => {
              toast(`Your Chart has been saved as ${loadedChartMeta.chart_name}`)
              setRefetchChart(1)
          })
          .catch(error => {
              console.error('Error saving Data:', error);
              // Handle the error here
          });
        }else{
            fetch(`/api/dataSets/dataSet/${loadedDataMeta._id}`, {
              method: 'PUT',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({ 
                  data_set_name: loadedDataMeta.data_set_name,
                  data: connectedData,
                  last_saved_date: new Date(),
                  labels: ['test'],
                  source: 'userUpload',       
              }),
            })
            .then(response => response.json())
            .then(data => {
                toast(`Your Data has been saved as ${loadedDataMeta.data_set_name}`)
                setRefetchData(1)
                // Handle the response data here
            })
            .catch(error => {
                console.error('Error saving Data:', error);
                // Handle the error here
            });
        }        
      }else{
        if(viewing === 'charts'){
          // console.log("data to save: ", data)
          // Here you can add code to save the projectName to a database or state management
          fetch('/api/charts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                chart_name: newChartName,
                chart_properties: [{
                  'chartOptions': chartOptions,
                  'chartTheme': chartTheme,
                  'bgColor': bgColor,
                  'textColor': textColor,
                  'cardColor': cardColor,
                  'title': title,
                  'subTitle': subTitle
                }],
                created_date: new Date(),
                last_saved_date: new Date(),
                labels: ['test'],
                user_id: user.userId,           
                data_set_id: loadedDataMeta._id
            }),
          })
          .then(response => response.json())
          .then(data => {
              toast(`Your Chart has been saved as ${newChartName}`)
              setRefetchChart(1)
              // Handle the response data here
          })
          .catch(error => {
              console.error('Error saving Data:', error);
              // Handle the error here
          });
        }else{
          fetch('/api/dataSets', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                data_set_name: newDataName,
                data: connectedData,
                created_date: new Date(),
                last_saved_date: new Date(),
                labels: ['test'],
                source: 'userUpload',
                user_id: user.userId,        
            }),
          })
          .then(response => response.json())
          .then(data => {
              toast(`Your Data has been saved as ${newDataName}`)
              setRefetchData(1)
              setConnectedData(data.data.data)
              setLoadedDataId(data._id)
              // Handle the response data here
          })
          .catch(error => {
              console.error('Error saving Data:', error);
              // Handle the error here
          });
        }
      }
      setSaveIsOpen(false)
  }

  const loadDataSheet = async (dataSetId, dataSet) => {
    if(loadedDataMeta && dataSetId === loadedDataMeta._id){
      setViewing('dataStart')
      setIsOpen(false)
    }else{
      fetch(`/api/dataSets/dataSet/${dataSetId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
        .then(res =>{
          setConnectedData(res.data.data)
          setLoadedDataMeta(dataSet)
          toast.success(`Data: ${res.data.data_set_name} loaded`, {
            duration: 99999999
          })
          setIsOpen(false)
          setViewing('dataStart')
        })
    }    
  }

  const loadChart = async (chartId, chartMeta) => {
    if(loadedChartMeta && chartId === loadedChartMeta._id){
      //now we construct the chart
      setChartOptions(chartOptions)
      setChartTheme(chartTheme)
      setBgColor(bgColor)
      setTextColor(textColor)
      setCardColor(cardColor)
      setTitle(title)
      setSubTitle(subTitle)          
      setViewing('charts')
      setIsOpen(false)
    }else{
      fetch(`/api/charts/chart/${chartId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
        .then(res =>{
          console.log(res.data)
          //letting system know that a new chart has been propogated
          setLoadedChartMeta(chartMeta)
          //now we construct the chart
          setChartOptions(res.data.chart_properties[0].chartOptions)
          setBgColor(res.data.chart_properties[0].bgColor)
          setTextColor(res.data.chart_properties[0].textColor)
          setCardColor(res.data.chart_properties[0].cardColor)
          setTitle(res.data.chart_properties[0].title)
          setSubTitle(res.data.chart_properties[0].subTitle)
          setChartTheme(res.data.chart_properties[0].chartTheme)
          toast.success(`Chart: ${res.data.chart_properties[0].title} loaded`, {
            duration: 99999999
          })

          fetch(`/api/dataSets/dataSet/${chartMeta.data_set_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }).then(response => response.json())
            .then(dataSheetRes =>{
              setConnectedData(dataSheetRes.data.data)
              setLoadedDataMeta(savedDataSets.find(ds => ds._id === chartMeta.data_set_id))
          })
          setIsOpen(false)
          setViewing('charts')
        })
    }    
  }

  const loadPresentation = async (presentationId, presentationMeta) => {
    if(loadedPresentationMeta && presentationId === loadedPresentationMeta._id){
      //set the data
      //set the presentation 
      setViewing('presentation')
      setIsOpen(false)
    }else{
      fetch(`/api/presentations/presentation/${presentationId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }).then(response => response.json())
        .then(res =>{
          console.log(res.data)
          //letting system know that a new chart has been propogated
          setLoadedPresentationMeta(presentationMeta)
          setConnectedData(res.data.data_snap_shot)
          setLoadedDataMeta(res.data.data_meta)
          setConnectedPresentation(res.data)          

          toast.success(`Presentation: ${res.data.data_meta.project_name} loaded`, {
            duration: 99999999
          })

          setIsOpen(false)
          setViewing('presentation')
        })
    }    
  }

  useEffect(()=> {
    loadedChartMeta || loadedDataMeta && setOverwrite(true)
  }, [])




  return (
    <div className="absolute top-0 flex w-full items-center gap-4 border-b py-1 px-5">
          { user ?
              <div className="flex w-full items-center gap-4 pl-44 md:gap-2 lg:gap-4 ">
                <div className="w-full flex gap-2">
                  {((savedDataSets && savedDataSets.length > 0) || (savedCharts && savedCharts.length > 0)) && 
                    <div>
                      <Sheet open={isOpen} onOpenChange={setIsOpen} >
                        <SheetTrigger asChild>
                          <div className="ml-2 w-32 text-xs text-black cursor-pointer hover:bg-slate-100 py-1 pl-4 rounded-md" onClick={()=>setIsOpen(true)}> 
                            Your Work 
                            <Badge className='ml-2 text-[10px] w-8 bg-slate-600'>{savedDataSets && savedDataSets.length}</Badge> 
                          </div>
                        </SheetTrigger>
                        <SheetContent side={'left'} className="w-[1000px]! sm:max-w-4xl flex flex-col">
                          <SheetHeader>
                            <SheetTitle>Your Saved Work</SheetTitle>
                            <SheetDescription>
                              Click on a project to load and begin work.
                            </SheetDescription>
                          </SheetHeader>
                          <Tabs defaultValue="data" className="h-5/6 overflow-y-auto h-screen">
                            <TabsList className="">
                              <TabsTrigger value="data">Data Sheets</TabsTrigger>
                              <TabsTrigger value="charts">Charts</TabsTrigger>
                              <TabsTrigger value="persentations">Presentations</TabsTrigger>
                            </TabsList>
                            <TabsContent value="data">
                              <div className="flex flex-wrap gap-2">
                                {
                                    savedDataSets && savedDataSets.length > 0 && savedDataSets.map(
                                      (dataSet)=> 
                                        <Card key={dataSet._id} className="w-sm text-sm hover:bg-green-100 cursor-pointer" onClick={()=>loadDataSheet(dataSet._id, dataSet)}>
                                          <CardHeader>
                                            <div className="flex">{dataSet.data_set_name}<div className="ml-auto">{loadedDataMeta && loadedDataMeta._id === dataSet._id && <Badge className={"bg-green-200 text-black"}>Loaded | Click to View</Badge>}</div></div>
                                          </CardHeader>
                                          <CardContent>
                                            <div className="font-muted">{dataSet.source}</div>
                                            <div className="py-1">Edited: {moment(dataSet.last_saved_date).format('ddd MMM YY h:mm a')}</div>
                                          </CardContent>
                                          <CardFooter>
                                            <div className="flex">{dataSet.labels.map((label)=> <Badge>{label}</Badge>)}</div>
                                          </CardFooter>
                                        </Card>
                                        )
                                  }                            
                              </div>                                
                            </TabsContent>
                            <TabsContent value="charts">
                              <div className="flex flex-wrap gap-2">
                                { 
                                  savedCharts && savedCharts.length > 0 && savedCharts.map(
                                    (chart)=> 
                                      <Card key={chart._id} className="text-sm hover:bg-green-100 cursor-pointer" onClick={()=>loadChart(chart._id, chart)}>
                                        <CardHeader>
                                          <div className="flex">{chart.chart_name}<div className="ml-auto">{loadedChartMeta && loadedChartMeta._id === chart._id && <Badge className={"bg-green-200 text-black"}>Loaded | Click to View</Badge>}</div></div>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="py-1">Edited: {moment(chart.last_saved_date).format('ddd MMM YY h:mm a')}</div>
                                        </CardContent>
                                        <CardFooter>
                                          <div className="flex">{chart.labels.map((label)=> <Badge>{label}</Badge>)}</div>
                                        </CardFooter>
                                      </Card>
                                      )
                                }
                              </div>
                            </TabsContent>
                            <TabsContent value="persentations"><div className="flex flex-wrap gap-2">
                                { 
                                  savedPresentations && savedPresentations.length > 0 && savedPresentations.map(
                                    (pressie)=> 
                                      <Card key={pressie._id} className="text-sm hover:bg-green-100 cursor-pointer" onClick={()=>loadPresentation(pressie._id, pressie)}>
                                        <CardHeader>
                                          <div className="flex">{pressie.presentation_name}<div className="ml-auto">{loadedPresentationMeta && loadedPresentationMeta._id === pressie._id && <Badge className={"bg-green-200 text-black"}>Loaded | Click to View</Badge>}</div></div>
                                        </CardHeader>
                                        <CardContent>
                                          <div>{pressie.project_name}</div>
                                          <div></div>
                                          <div></div>
                                          <div className="py-1">Edited: {moment(pressie.last_saved_date).format('ddd MMM YY h:mm a')}</div>
                                        </CardContent>
                                        <CardFooter>
                                          <div className="flex">{pressie.deployed && <Badge>Deployed</Badge>}</div>
                                        </CardFooter>
                                      </Card>
                                      )
                                }
                              </div></TabsContent>
                          </Tabs>
                        </SheetContent>
                      </Sheet>
                    </div>
                  }

                  {connectedData && 
                    <div className="flex place-items-center">
                      <Dialog open={saveIsOpen} onOpenChange={setSaveIsOpen}>
                        <DialogTrigger asChild>
                          <div className="text-xs text-black cursor-pointer hover:bg-slate-100 py-2 px-2 rounded-md">Save {viewing === 'charts' ? 'Chart':  'Data'}</div>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>{viewing === 'charts' ? 'Save Chart' : 'Save Data Set'}</DialogTitle>
                            <DialogDescription>
                              { loadedDataMeta && `You are currently connected to ${loadedDataMeta.data_set_name}`}
                              { loadedChartMeta && `You are currently connected to ${loadedDataMeta.chart_name}`}
                            </DialogDescription>
                          </DialogHeader>
                          {
                            viewing === "charts" 
                              ?<div className="grid gap-4 py-4">
                                  {
                                    loadedChartMeta && 
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="overwrite" className="text-right">
                                          Overwrite {loadedDataMeta.chart_name} ?
                                        </Label>
                                        <Checkbox id="overwrite" checked={overwrite} onCheckedChange={setOverwrite}/>
                                      </div>
                                  }
                                  {
                                    loadedChartMeta && !(overwrite) &&
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                          Chart Name
                                        </Label>
                                        <Input
                                          id="name"
                                          defaultValue="Pied-Piper"
                                          className="col-span-3"
                                          onChange={(e)=>setNewChartName(e.target.value)}
                                        />
                                      </div>
                                  }
                                  {
                                    !(loadedChartMeta) &&
                                      <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="name" className="text-right">
                                          Name your chart
                                        </Label>
                                        <Input
                                          id="name"
                                          defaultValue="Pied-Piper"
                                          className="col-span-3"
                                          onChange={(e)=>setNewChartName(e.target.value)}
                                        />
                                      </div>
                                  }
                                </div>
                              : <div className="grid gap-4 py-4">
                              {
                                loadedDataMeta && loadedDataMeta.data_set_name &&
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="overwrite" className="text-right">
                                      Overwrite {loadedDataMeta.data_set_name} ?
                                    </Label>
                                    <Checkbox id="overwrite" checked={overwrite} onCheckedChange={setOverwrite}/>
                                  </div>
                              }
                              {
                                loadedDataMeta && loadedDataMeta.data_set_name && !(overwrite) &&
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                      Data Sheet Name
                                    </Label>
                                    <Input
                                      id="name"
                                      defaultValue="Pied-Piper"
                                      className="col-span-3"
                                      onChange={(e)=>setNewDataName(e.target.value)}
                                    />
                                  </div>
                              }
                              {
                                !(loadedDataMeta) &&
                                  <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="name" className="text-right">
                                      Name your data sheet
                                    </Label>
                                    <Input
                                      id="name"
                                      defaultValue="Pied-Piper"
                                      className="col-span-3"
                                      onChange={(e)=>setNewDataName(e.target.value)}
                                    />
                                  </div>
                              }
                            </div>                          
                          }                      
                          <DialogFooter>
                            <Button type="submit" onClick={()=>handleSave()}>Save changes</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    }
                  
                </div>
                {loadedDataMeta && loadedDataMeta.data_set_name && <div className="flex text-xs gap-1"><div>Loaded:</div> <div>{loadedDataMeta.data_set_name}</div></div> }
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" className="rounded-full shadow-2xl shadow-inner flex bg-white">
                        <Image className="" src={'/avatar.png'} height={40} width={40} />
                        <Menu/>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Account</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem  onClick={()=>setViewing('manageAccount')}>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>handleLogout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
              </div>
            : <div className="flex ml-auto place-items-center gap-6" >
                {connectedData && <div className="flex text-xs">Register to Save Your Work</div>}
                <div className="bg-black text-white px-3 py-2 rounded-md text-xs cursor-pointer" onClick={()=>setViewing('register')}>Member Log In </div>
              </div>
          }
    </div>
  )
}

export default Nav;
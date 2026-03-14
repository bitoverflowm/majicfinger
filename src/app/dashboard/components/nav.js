import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import moment from "moment"


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
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler"
import { Pause, Play, RotateCw, Square } from "lucide-react"


const Nav = () => {
  const user = useUser()
  const router = useRouter();
  const contextStateV2 = useMyStateV2()

  //what component are we viewing
  const viewing = contextStateV2?.viewing
  const setViewing = contextStateV2?.setViewing
  const integrationSidebar = contextStateV2?.integrationSidebar
  const setIntegrationSidebar = contextStateV2?.setIntegrationSidebar


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

  // summarization: when charting a summary table
  const chartDataOverride = contextStateV2?.chartDataOverride
  const chartDataOverrideMeta = contextStateV2?.chartDataOverrideMeta
  const setChartDataOverride = contextStateV2?.setChartDataOverride
  const setChartDataOverrideMeta = contextStateV2?.setChartDataOverrideMeta

  const liveStreamState = contextStateV2?.liveStreamState
  const liveStreamActions = contextStateV2?.liveStreamActions

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
    try {
      liveStreamActions?.stop?.();
      const response = await fetch('/api/logout', {
        method: 'POST',
      });
      if (response.ok) {
        router.push('/');
      } else {
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
          const saveChartWithData = async (dataSetId) => {
            const res = await fetch('/api/charts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
                data_set_id: dataSetId
              }),
            });
            const data = await res.json();
            if (data._id || data.success) {
              toast(`Your Chart has been saved as ${newChartName}`);
              setRefetchChart(1);
              setChartDataOverride?.(null);
              setChartDataOverrideMeta?.(null);
            }
          };

          if (chartDataOverride && Array.isArray(chartDataOverride) && chartDataOverride.length > 0) {
            // Save summary data as DataSet first, then chart
            fetch('/api/dataSets', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                data_set_name: `${newChartName || 'Summary'} (summary)`,
                data: chartDataOverride,
                created_date: new Date(),
                last_saved_date: new Date(),
                labels: JSON.stringify({
                  parentDataSetId: loadedDataMeta?._id,
                  summarizationType: chartDataOverrideMeta?.type,
                  summarizationTitle: chartDataOverrideMeta?.title
                }),
                source: 'summarization',
                user_id: user.userId,
              }),
            })
              .then(r => r.json())
              .then((dsRes) => {
                const summaryDataSetId = dsRes.data?._id || dsRes._id;
                if (summaryDataSetId) {
                  saveChartWithData(summaryDataSetId);
                } else {
                  toast.error('Failed to save summary data');
                }
              })
              .catch((err) => {
                console.error('Error saving summary data:', err);
                toast.error('Failed to save summary data');
              });
          } else {
            const dataSetId = loadedDataMeta?._id;
            if (!dataSetId) {
              toast.error('Save your data first, or create a summary from the Summarize drawer.');
              return;
            }
            saveChartWithData(dataSetId);
          }
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
          toast.success(`Presentation: ${res.data.project_name} loaded`, {
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


  const breadcrumb = viewing === 'dashboard' ? 'Lychee / Dashboard' :
    viewing === 'charts' || viewing === 'gallery' ? 'Lychee / Charts' :
    (viewing === 'dataStart' && integrationSidebar) ? 'Lychee / Data' :
    (viewing === 'dataStart' || viewing === 'upload' || viewing === 'newSheet' || viewing === 'integrations') ? 'Lychee / Data' :
    viewing === 'ai' ? 'Lychee / AI' :
    viewing === 'scrape' ? 'Lychee / Scrape' :
    viewing ? `Lychee / ${viewing}` : 'Lychee';

  const showUnsavedFlag = connectedData && connectedData.length > 0 && !loadedDataMeta?.data_set_name && !loadedChartMeta?.chart_name;

  return (
    <div className="container flex flex-col items-start justify-between gap-2 py-4 sm:flex-row sm:items-center sm:gap-0 md:h-16">
          <div className="w-full flex items-center gap-2 min-w-0">
            <div className="w-full pl-0.5 text-sm font-semibold">{breadcrumb}</div>
          </div>
          { user ? (
              <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-2 sm:justify-end">
                  {liveStreamState?.isRunning && (
                    <div className="flex items-center gap-1 shrink-0 rounded-md border bg-muted/50 px-1 py-0.5">
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Pause" disabled={liveStreamState?.isPaused} onClick={() => liveStreamActions?.pause?.()}>
                        <Pause className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title={liveStreamState?.isPaused ? "Resume" : "Start"} onClick={() => liveStreamActions?.resume?.()}>
                        <Play className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" title="Restart" onClick={() => liveStreamActions?.restart?.()}>
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" title="Stop" onClick={() => liveStreamActions?.stop?.()}>
                        <Square className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                  {showUnsavedFlag && (
                    <span className="text-[7pt] px-2 py-1 rounded-sm bg-rose-100 text-rose-500  dark:text-amber-400 font-bold shrink-0">Viewing Unsaved Data</span>
                  )}
                  {(connectedData || (viewing === 'charts' && chartDataOverride)) && (
                      <Dialog open={saveIsOpen} onOpenChange={setSaveIsOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">Save {viewing === 'charts' ? 'Chart' : 'Data'}</Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                          <DialogHeader>
                            <DialogTitle>{viewing !== 'presentation' && (viewing === 'charts' ? 'Save Chart' : 'Save Data Set')}</DialogTitle>
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
                  )}
                  <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        Your Work
                        <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[10px]">
                          {(savedDataSets?.length ?? 0) + (savedCharts?.length ?? 0) + (savedPresentations?.length ?? 0)}
                        </Badge>
                      </Button>
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


                {loadedDataMeta && loadedDataMeta.data_set_name && (
                  <span className="text-xs text-muted-foreground hidden sm:inline">Loaded: {loadedDataMeta.data_set_name}</span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="secondary" size="icon" className="rounded-full h-9 w-9 overflow-hidden">
                        <Image src={'/avatar.png'} height={36} width={36} alt="Profile" />
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuLabel>My Profile</DropdownMenuLabel>
                      <DropdownMenuItem  onClick={()=>setViewing('profilePage')}>Manage</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem  onClick={()=>setViewing('manageAccount')}>Billing</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>handleLogout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
                <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
              </div>
            ) : (
              <div className="ml-auto flex items-center gap-2">
                {connectedData && <span className="text-xs text-muted-foreground hidden sm:inline">Register to save your work</span>}
                <Button variant="default" size="sm" onClick={()=>setViewing('register')}>Member Log In</Button>
                <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
              </div>
            )}
    </div>
  )
}

export default Nav;
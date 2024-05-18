import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import moment from "moment"

import { CircleUser, Menu, Package2  } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"


import { useUser } from '@/lib/hooks';
import { useMyStateV2  } from '@/context/stateContextV2'
import { Badge } from "@/components/ui/badge"

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

import { toast } from "sonner"

const Nav = () => {
  const user = useUser()
  const router = useRouter();
  const contextStateV2 = useMyStateV2()

  const setViewing = contextStateV2?.setViewing
  const connectedData = contextStateV2?.connectedData
  const dataSetName = contextStateV2?.dataSetName
  const setDataSetName = contextStateV2?.setDataSetName
  const savedDataSets = contextStateV2?.savedDataSets
  const setConnectedData = contextStateV2?.setConnectedData
  const loadedDataMeta = contextStateV2?.loadedDataMeta
  const setLoadedDataMeta = contextStateV2?.setLoadedDataMeta

  const [isOpen, setIsOpen] = useState(false) 
  const [saveIsOpen, setSaveIsOpen] = useState(false)
  const [newDataName, setNewDataName] = useState()

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

  const [overwrite, setOverwrite] = useState(true)

  const handleSave = async () => {
      if(overwrite){
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
            // Handle the response data here
        })
        .catch(error => {
            console.error('Error saving Data:', error);
            // Handle the error here
        });
      }else{
        //console.log("data to save: ", data)
        // Here you can add code to save the projectName to a database or state management
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
                // Handle the response data here
            })
            .catch(error => {
                console.error('Error saving Data:', error);
                // Handle the error here
            });
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
          console.log(res.data)
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


  return (
    <div className="absolute top-0 flex w-full items-center gap-4 border-b bg-background py-2 px-5">
          { user ?
              <div className="flex items-center gap-4 ml-auto md:gap-2 lg:gap-4">
                {savedDataSets && savedDataSets.length > 0 && 
                  <Sheet open={isOpen} onOpenChange={setIsOpen}>
                    <SheetTrigger asChild>
                      <div className="cursor-pointer hover:bg-black hover:text-white py-1 px-2 rounded-md" onClick={()=>setIsOpen(true)}> 
                        View Saved Data 
                        <Badge className='ml-1'>{savedDataSets.length}</Badge> 
                      </div>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Your Saved Data</SheetTitle>
                        <SheetDescription>
                          Chick on a project to load and begin work.
                        </SheetDescription>
                      </SheetHeader>
                      <div className="pt-4">
                        { 
                          savedDataSets.map(
                            (dataSet)=> 
                              <div key={dataSet._id} className="text-sm hover:bg-green-100 cursor-pointer" onClick={()=>loadDataSheet(dataSet._id, dataSet)}>
                                <div className="flex">{dataSet.data_set_name}<div className="ml-auto">{loadedDataMeta && loadedDataMeta._id === dataSet._id && <Badge className={"bg-green-200 text-black"}>Loaded | Click to View</Badge>}</div></div>
                                <div className="font-muted">Source: {dataSet.source}</div>
                                <div className="py-1">Edited: {moment(dataSet.last_saved_date).format('ddd MMM YY h:mm a')}</div>
                                <div className="flex">{dataSet.labels.map((label)=> <Badge>{label}</Badge>)}</div>
                                <Separator className="my-2" />
                              </div>
                              )
                        }
                      </div>
                    </SheetContent>
                  </Sheet>                  
                }
                {connectedData && 
                  <Dialog open={saveIsOpen} onOpenChange={setSaveIsOpen}>
                    <DialogTrigger asChild>
                      <Button>Save Work</Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>Save Data Set</DialogTitle>
                        <DialogDescription>
                          { loadedDataMeta && loadedDataMeta.data_set_name && `You are currently connected to ${loadedDataMeta.data_set_name}`}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
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
                      <DialogFooter>
                        <Button type="submit" onClick={()=>handleSave()}>Save changes</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  }
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
                      <DropdownMenuItem>Settings</DropdownMenuItem>
                      <DropdownMenuItem>Support</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={()=>handleLogout()}>Logout</DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>
              </div>
            : <div className="flex ml-auto" >
                {connectedData && <div className="flex">You have unsaved data register to save your progress</div>}
                <div className="bg-black text-white px-3 py-2 rounded-md text-xs cursor-pointer" onClick={()=>setViewing('register')}> Log in/Register </div>
              </div>
          }
    </div>
  )
}

export default Nav;
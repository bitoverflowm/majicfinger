import { useState } from "react"

import {
    Menubar,
    MenubarCheckboxItem,
    MenubarContent,
    MenubarItem,
    MenubarLabel,
    MenubarMenu,
    MenubarRadioGroup,
    MenubarRadioItem,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
  } from "@/components/ui/menubar"

  import {
    Drawer,
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
  } from "@/components/ui/drawer"
  
  import { toast } from "sonner"

  import { Button } from "@/components/ui/button"
  import { Input } from "@/components/ui/input"
  import { Label } from "@/components/ui/label"
  import { Trash } from "lucide-react"

  import { useMyStateV2  } from '@/context/stateContextV2'

  
  export function Menu() {
    const contextStateV2 = useMyStateV2()

    let connectedCols = contextStateV2?.connectedCols || []
    let setConnectedCols = contextStateV2?.setConnectedCols || []
    let connectedData = contextStateV2?.connectedData || []
    let setConnectedData = contextStateV2?.setConnectedData || []

    const [open, setOpen] = useState()
    const [content, setContent] = useState()
    

    const handleOpen = (param) => {
      setContent(param)
      if(param ==="editColumns"){
        setOpen(true)
      }
    }

    const handleAddColumn = (name) => {
      let newCols = [...connectedCols, { field: name }];
      setConnectedCols(newCols);
      //adding col to data as well
      if(connectedData.length > 0){
          setConnectedData(prevData => {
              // Create a new array with updated data
              const newData = prevData.map((item, index) => {
                  return { ...item, [name]: '' }; // Update the specific field value
              });
              return newData;
            });
      }else{
          setConnectedData(prevData => {
              return prevData.map(item => {
                return { ...item, [name]: '' };
              }).concat([{ [name]: '' }]);
            });
      }

      toast(`New Column added!`, {
          duration: 5000
      })   
    }

    const handleDeleteColumn = (index) => {
      // Get the name of the column to be deleted
      const colName = connectedCols[index].field;
      
      // Remove the column from the connectedCols array
      let newCols = connectedCols.filter((_, colIndex) => colIndex !== index);
      setConnectedCols(newCols);
    
      // Remove the column from each item in the connectedData array
      setConnectedData(prevData => {
        return prevData.map(item => {
          const newItem = { ...item };
          delete newItem[colName]; // Remove the specific field
          return newItem;
        });
      });
    
    
      toast(`Column "${colName}" deleted!`, {
        duration: 5000
      });
    };

    return (
      <Menubar className="rounded-xl border-slate-100 border px-2 lg:px-4">
        <MenubarMenu>
          <MenubarTrigger>Columns</MenubarTrigger>
          <MenubarContent>
            <MenubarItem onClick={()=>handleOpen('editColumns')}>
                Edit Columns
            </MenubarItem>
            <MenubarItem>Delete Columns</MenubarItem>
            <MenubarSeparator />
            <MenubarItem>Rearrange Column Sequence</MenubarItem>
            <MenubarItem>Hide Columns</MenubarItem>
          </MenubarContent>
        </MenubarMenu>
        {/* Universal Drawer */}
        <Drawer open={open} onOpenChange={setOpen}>
          {
            content ==="editColumns" &&
              <DrawerContent>
                  <div className="mx-auto w-64">              
                      <DrawerHeader>
                          <DrawerTitle className="text-center">Edit Columns</DrawerTitle>
                      </DrawerHeader>
                      {connectedCols.map((col, index) => (
                        <div key={index} className="grid gap-4">
                          <div className="grid gap-2">
                            <div className="grid grid-cols-4 items-center gap-4">
                              <Label htmlFor={`col-${index}`}>{col.field}</Label>
                              <Input
                                id={`col-${index}`}
                                defaultValue={col.field}
                                className="col-span-2 h-8"
                              />
                              <div
                                className="bg-red-600 w-6 h-6 rounded-sm flex place-items-center place-content-center text-white cursor-pointer hover:bg-white hover:text-red-600 border-2 border-red-600"
                                onClick={() => handleDeleteColumn(index)}
                              >
                                <Trash className="w-3 h-3" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <DrawerFooter className={'mx-auto'}>
                      <DrawerClose asChild className="w-32">
                          <Button variant="outline">Close</Button>
                      </DrawerClose>
                  </DrawerFooter>
              </DrawerContent>
          }
        </Drawer>
      </Menubar>
    )
  }
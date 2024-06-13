import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
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
} from "@/components/ui/menubar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash } from "lucide-react";
import { useMyStateV2 } from '@/context/stateContextV2';

export function Menu() {
  const contextStateV2 = useMyStateV2();

  let connectedCols = contextStateV2?.connectedCols || []
  let setConnectedCols = contextStateV2?.setConnectedCols || []
  let connectedData = contextStateV2?.connectedData || []
  let setConnectedData = contextStateV2?.setConnectedData || []
  let setViewing = contextStateV2?.setViewing
  let dataTypes = contextStateV2?.dataTypes
  let setDataTypes = contextStateV2?.setDataTypes

  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [editingName, setEditingName] = useState(null);
  const [newColName, setNewColName] = useState("");

  const handleOpen = (param) => {
    setContent(param);
    if (param === "editColumns") {
      setOpen(true);
    }
  };

  const handleAddColumn = (name) => {
    let newCols = [...connectedCols, { field: name }];
    setConnectedCols(newCols);
    //adding col to data as well
    if (connectedData.length > 0) {
      setConnectedData((prevData) => {
        // Create a new array with updated data
        const newData = prevData.map((item) => {
          return { ...item, [name]: "" }; // Update the specific field value
        });
        return newData;
      });
    } else {
      setConnectedData((prevData) => {
        return prevData.map((item) => {
          return { ...item, [name]: "" };
        }).concat([{ [name]: "" }]);
      });
    }
    setDataTypes(prevTypes => ({
      ...prevTypes,
      [name]: 'text' // Default to 'text' type for new columns
    }));

    toast(`New Column added!`, {
      duration: 5000,
    });
  };

  const handleDeleteColumn = (index) => {
    // Get the name of the column to be deleted
    const colName = connectedCols[index].field;

    // Remove the column from the connectedCols array
    let newCols = connectedCols.filter((_, colIndex) => colIndex !== index);
    setConnectedCols(newCols);

    // Remove the column from each item in the connectedData array
    setConnectedData((prevData) => {
      return prevData.map((item) => {
        const newItem = { ...item };
        delete newItem[colName]; // Remove the specific field
        return newItem;
      });
    });
    // Remove the column from data types
    setDataTypes((prevTypes) => {
      const newTypes = { ...prevTypes };
      delete newTypes[colName];
      return newTypes;
    });

    toast(`Column "${colName}" deleted!`, {
      duration: 5000,
    });
  };

  const handleSaveColumnName = (index) => {
    if (newColName.trim() === "") return;

    const oldColName = connectedCols[index].field;
    let newCols = connectedCols.map((col, colIndex) =>
      colIndex === index ? { ...col, field: newColName } : col
    );
    setConnectedCols(newCols);

    setConnectedData((prevData) => {
      return prevData.map((item) => {
        const newItem = { ...item };
        newItem[newColName] = newItem[oldColName];
        delete newItem[oldColName];
        return newItem;
      });
    });

    setDataTypes((prevTypes) => {
      const newTypes = { ...prevTypes };
      newTypes[newColName] = newTypes[oldColName];
      delete newTypes[oldColName];
      return newTypes;
    });

    setEditingName(null);
    setNewColName("");
    toast(`Column name updated to "${newColName}"`, {
      duration: 5000,
    });
  };

  const handleTypeChange = (index, newType) => {
    const colName = connectedCols[index].field;
  
    // Convert the data type of the column in connectedData
    const updatedData = convertDataType(connectedData, colName, newType);
    setConnectedData(updatedData);
  
    setDataTypes(prevTypes => ({
      ...prevTypes,
      [colName]: newType
    }));
  
    toast(`Column "${colName}" type updated to "${newType}"`, {
      duration: 5000,
    });
  };

  const onDragEnd = (result) => {
    if (!result.destination) {
      return;
    }

    const reorderedCols = Array.from(connectedCols);
    const [removed] = reorderedCols.splice(result.source.index, 1);
    reorderedCols.splice(result.destination.index, 0, removed);

    setConnectedCols(reorderedCols);
  };

  const convertDataType = (data, column, newType) => {
    return data.map(row => {
      let newValue = row[column];
      switch (newType) {
        case 'number':
          newValue = parseFloat(newValue);
          if (isNaN(newValue)) newValue = null;
          break;
        case 'boolean':
          newValue = Boolean(newValue);
          break;
        case 'dateString':
          newValue = new Date(newValue).toISOString();
          break;
        case 'object':
          try {
            newValue = JSON.parse(newValue);
          } catch {
            newValue = null;
          }
          break;
        case 'text':
        default:
          newValue = String(newValue);
          break;
      }
      return { ...row, [column]: newValue };
    });
  };

  return (
    <Menubar className="rounded-xl border-slate-100 border px-2 lg:px-4">
      <MenubarMenu>
        <div className="cursor-pointer hover:bg-lychee_green/20"  onClick={() => handleOpen("editColumns")}> Column Properties </div>
        <div className="hidden" onClick={()=>setViewing('presentation')}>Present</div>
      </MenubarMenu>
      {/* Universal Drawer */}
      <Drawer open={open} onOpenChange={setOpen}>
        {content === "editColumns" && (
          <DrawerContent>
            <div className="mx-auto">
              <DrawerHeader>
                <DrawerTitle className="text-center">Manage Columns</DrawerTitle>
              </DrawerHeader>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="columns">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="grid gap-4"
                    >
                      {connectedCols.map((col, index) => (
                        <Draggable
                          key={col.field}
                          draggableId={col.field}
                          index={index}
                        >
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="grid gap-2"
                            >
                              <div className="grid grid-cols-12 items-center gap-4 px-20">
                                {index === editingName ? (
                                  <Input
                                    id={`col-${index}`}
                                    defaultValue={col.field}
                                    className="col-span-2 h-8"
                                    onChange={(e) => setNewColName(e.target.value)}
                                  />
                                ) : (
                                  <Label htmlFor={`col-${index}`}>{col.field}</Label>
                                )}
                                {index === editingName ? (
                                  <Button
                                    onClick={() => handleSaveColumnName(index)}
                                    className="col-span-2 h-8"
                                  >
                                    Save
                                  </Button>
                                ) : (
                                  <div
                                    className="bg-slate-200 w-6 h-6 rounded-sm flex place-items-center place-content-center text-white cursor-pointer hover:bg-white hover:text-slate-600 border-2 border-slate-800"
                                    onClick={() => setEditingName(index)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </div>
                                )}
                                <div
                                  className="bg-red-600 w-6 h-6 rounded-sm flex place-items-center place-content-center text-white cursor-pointer hover:bg-white hover:text-red-600 border-2 border-red-600"
                                  onClick={() => handleDeleteColumn(index)}
                                >
                                  <Trash className="w-3 h-3" />
                                </div>
                                <select
                                  id={`type-${index}`}
                                  value={dataTypes[col.field] || 'text'}
                                  onChange={(e) => handleTypeChange(index, e.target.value)}
                                  className="col-span-3 h-8"
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="boolean">Boolean</option>
                                  <option value="date">Date</option>
                                  <option value="dateString">DateString</option>
                                  <option value="object">Object</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
            <DrawerFooter className={"mx-auto"}>
              <DrawerClose asChild className="w-32">
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        )}
      </Drawer>
    </Menubar>
  );
}

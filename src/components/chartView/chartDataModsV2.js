import { Bird, Rabbit, Turtle } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

import { useMyStateV2 } from "@/context/stateContextV2"

import Group from './ui/group'

const ChartDataModsV2 = () => {
    const contextStateV2 = useMyStateV2()

    const title = contextStateV2?.setTitle || {};
    const setTitle = contextStateV2?.setTitle || {};
    const subTitle = contextStateV2?.subTitle || '';
    const setSubTitle = contextStateV2?.setSubTitle || {};
    const chartTypes = contextStateV2?.chartTypes || '';
    const type = contextStateV2?.type || ''; 
    const setType = contextStateV2?.setType || '';
    const xKey = contextStateV2?.xKey || '';
    const setXKey = contextStateV2?.setXKey || {};
    const yKey = contextStateV2?.yKey || '';
    const setYKey = contextStateV2?.setYKey || {};
    const xOptions = contextStateV2?.xOptions || {};
    const yOptions = contextStateV2?.yOptions || {};
    const directions = contextStateV2?.directions || {};
    const direction = contextStateV2?.direction || '';
    const setDirection = contextStateV2?.setDirection || {};

  return (
    <div
      className="relative hidden flex-col items-start gap-8 md:flex"
    >
      <form className="grid w-full items-start gap-6">
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">Text</legend>
          <div className="grid gap-3">
            <Label htmlFor="temperature">Title</Label>
            <Input id="title" type="text" placeholder="What do you want to call your chart?" onChange={(e)=>setTitle(e.target.value)} />
          </div>
          <div className="grid gap-3">
            <Label htmlFor="temperature">Sub-Title</Label>
            <Input id="subTitle" type="text" placeholder="A brief description of your chart?" onChange={(e)=>setSubTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 gap-4">            
            <Label htmlFor="chartType">Chart Type</Label>
            {chartTypes && chartTypes.length > 1 && <Group title={'Select your chart type'} options={chartTypes} val={type} call={setType} opened={true}/>}
          </div>
          <div>
            {xOptions && xOptions.length > 1 && <Group title={'Set X-axis'} options={xOptions} val={xKey} call={setXKey} opened={false}/>}
          </div>
          <div>
            {yOptions && yOptions.length > 1 && <Group title={'Set Y-axis'} options={yOptions} val={yKey} call={setYKey} opened={false}/>}
          </div>
          <div className="hidden">
            {directions && directions.length > 1 && <Group title={'Direction'} options={directions} val={direction} call={setDirection} opened={false}/>}
          </div>
        </fieldset>
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">Aesthetics</legend>
          <div className="grid gap-3">
            <Label htmlFor="model">Background Color</Label>
            <Select>
              <SelectTrigger
                id="model"
                className="items-start [&_[data-description]]:hidden"
              >
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="genesis">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Rabbit className="size-5" />
                    <div className="grid gap-0.5">
                      <p>
                        Neural{" "}
                        <span className="font-medium text-foreground">
                          Genesis
                        </span>
                      </p>
                      <p className="text-xs" data-description>
                        Our fastest model for general use cases.
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="model">Card Color</Label>
            <Select>
              <SelectTrigger
                id="model"
                className="items-start [&_[data-description]]:hidden"
              >
                <SelectValue placeholder="Select a model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="genesis">
                  <div className="flex items-start gap-3 text-muted-foreground">
                    <Rabbit className="size-5" />
                    <div className="grid gap-0.5">
                      <p>
                        Neural{" "}
                        <span className="font-medium text-foreground">
                          Genesis
                        </span>
                      </p>
                      <p className="text-xs" data-description>
                        Our fastest model for general use cases.
                      </p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="temperature">Temperature</Label>
            <Input id="temperature" type="number" placeholder="0.4" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-3">
              <Label htmlFor="top-p">Top P</Label>
              <Input id="top-p" type="number" placeholder="0.7" />
            </div>
            <div className="grid gap-3">
              <Label htmlFor="top-k">Top K</Label>
              <Input id="top-k" type="number" placeholder="0.0" />
            </div>
          </div>
        </fieldset>
        <fieldset className="grid gap-6 rounded-lg border p-4">
          <legend className="-ml-1 px-1 text-sm font-medium">Messages</legend>
          <div className="grid gap-3">
            <Label htmlFor="role">Role</Label>
            <Select defaultValue="system">
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="assistant">Assistant</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              placeholder="You are a..."
              className="min-h-[9.5rem]"
            />
          </div>
        </fieldset>
      </form>
    </div>
  )
}

export default ChartDataModsV2
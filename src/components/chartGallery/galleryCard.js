import * as React from "react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card"

import { AgChartsReact } from 'ag-charts-react';

export function GalleryCard({title, description, data, footnote, series, axes, theme}) {
  return (
    <Card className="text-center px-10">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mx-auto w-[420px] h-[400px]">
            <AgChartsReact 
                options={{
                    data: data && data,
                    series: series && series,
                    axes: axes && axes,
                    theme: theme && theme,
            }} />
        </div>
      </CardContent>
      <CardFooter className="text-xs">
        <p className="w-full text-center">{footnote && footnote}</p>
      </CardFooter>
    </Card>
  )
}

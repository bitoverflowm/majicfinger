'use client'

import React from 'react'

import { ResponsiveAreaBump } from '@nivo/bump'
import { ResponsiveBar } from '@nivo/bar'

import { useState } from 'react'

export default function Home() {

  const [chart, setChart] = useState('bar')

  const data = [
    {
      "id": "JavaScript",
      "data": [
        {
          "x": 2000,
          "y": 28
        },
        {
          "x": 2001,
          "y": 15
        },
        {
          "x": 2002,
          "y": 11
        },
        {
          "x": 2003,
          "y": 13
        },
        {
          "x": 2004,
          "y": 28
        },
        {
          "x": 2005,
          "y": 19
        }
      ]
    },
    {
      "id": "ReasonML",
      "data": [
        {
          "x": 2000,
          "y": 10
        },
        {
          "x": 2001,
          "y": 14
        },
        {
          "x": 2002,
          "y": 12
        },
        {
          "x": 2003,
          "y": 30
        },
        {
          "x": 2004,
          "y": 30
        },
        {
          "x": 2005,
          "y": 19
        }
      ]
    },
    {
      "id": "TypeScript",
      "data": [
        {
          "x": 2000,
          "y": 17
        },
        {
          "x": 2001,
          "y": 14
        },
        {
          "x": 2002,
          "y": 10
        },
        {
          "x": 2003,
          "y": 20
        },
        {
          "x": 2004,
          "y": 19
        },
        {
          "x": 2005,
          "y": 29
        }
      ]
    },
    {
      "id": "Elm",
      "data": [
        {
          "x": 2000,
          "y": 26
        },
        {
          "x": 2001,
          "y": 23
        },
        {
          "x": 2002,
          "y": 13
        },
        {
          "x": 2003,
          "y": 18
        },
        {
          "x": 2004,
          "y": 10
        },
        {
          "x": 2005,
          "y": 16
        }
      ]
    },
    {
      "id": "CoffeeScript",
      "data": [
        {
          "x": 2000,
          "y": 25
        },
        {
          "x": 2001,
          "y": 10
        },
        {
          "x": 2002,
          "y": 19
        },
        {
          "x": 2003,
          "y": 10
        },
        {
          "x": 2004,
          "y": 29
        },
        {
          "x": 2005,
          "y": 16
        }
      ]
    }
  ]

  const barData = [
    {
      "country": "AD",
      "hot dog": 175,
      "hot dogColor": "hsl(243, 70%, 50%)",
      "burger": 115,
      "burgerColor": "hsl(305, 70%, 50%)",
      "sandwich": 182,
      "sandwichColor": "hsl(6, 70%, 50%)",
      "kebab": 61,
      "kebabColor": "hsl(350, 70%, 50%)",
      "fries": 167,
      "friesColor": "hsl(327, 70%, 50%)",
      "donut": 12,
      "donutColor": "hsl(82, 70%, 50%)"
    },
    {
      "country": "AE",
      "hot dog": 61,
      "hot dogColor": "hsl(5, 70%, 50%)",
      "burger": 107,
      "burgerColor": "hsl(17, 70%, 50%)",
      "sandwich": 13,
      "sandwichColor": "hsl(186, 70%, 50%)",
      "kebab": 195,
      "kebabColor": "hsl(28, 70%, 50%)",
      "fries": 161,
      "friesColor": "hsl(227, 70%, 50%)",
      "donut": 169,
      "donutColor": "hsl(1, 70%, 50%)"
    },
    {
      "country": "AF",
      "hot dog": 183,
      "hot dogColor": "hsl(186, 70%, 50%)",
      "burger": 19,
      "burgerColor": "hsl(111, 70%, 50%)",
      "sandwich": 30,
      "sandwichColor": "hsl(171, 70%, 50%)",
      "kebab": 155,
      "kebabColor": "hsl(116, 70%, 50%)",
      "fries": 37,
      "friesColor": "hsl(278, 70%, 50%)",
      "donut": 76,
      "donutColor": "hsl(62, 70%, 50%)"
    },
    {
      "country": "AG",
      "hot dog": 52,
      "hot dogColor": "hsl(67, 70%, 50%)",
      "burger": 148,
      "burgerColor": "hsl(3, 70%, 50%)",
      "sandwich": 81,
      "sandwichColor": "hsl(32, 70%, 50%)",
      "kebab": 168,
      "kebabColor": "hsl(266, 70%, 50%)",
      "fries": 124,
      "friesColor": "hsl(114, 70%, 50%)",
      "donut": 17,
      "donutColor": "hsl(168, 70%, 50%)"
    },
    {
      "country": "AI",
      "hot dog": 192,
      "hot dogColor": "hsl(72, 70%, 50%)",
      "burger": 15,
      "burgerColor": "hsl(212, 70%, 50%)",
      "sandwich": 183,
      "sandwichColor": "hsl(142, 70%, 50%)",
      "kebab": 102,
      "kebabColor": "hsl(166, 70%, 50%)",
      "fries": 55,
      "friesColor": "hsl(283, 70%, 50%)",
      "donut": 8,
      "donutColor": "hsl(323, 70%, 50%)"
    },
    {
      "country": "AL",
      "hot dog": 0,
      "hot dogColor": "hsl(20, 70%, 50%)",
      "burger": 161,
      "burgerColor": "hsl(82, 70%, 50%)",
      "sandwich": 163,
      "sandwichColor": "hsl(37, 70%, 50%)",
      "kebab": 42,
      "kebabColor": "hsl(124, 70%, 50%)",
      "fries": 115,
      "friesColor": "hsl(320, 70%, 50%)",
      "donut": 174,
      "donutColor": "hsl(334, 70%, 50%)"
    },
    {
      "country": "AM",
      "hot dog": 123,
      "hot dogColor": "hsl(183, 70%, 50%)",
      "burger": 124,
      "burgerColor": "hsl(25, 70%, 50%)",
      "sandwich": 136,
      "sandwichColor": "hsl(238, 70%, 50%)",
      "kebab": 24,
      "kebabColor": "hsl(96, 70%, 50%)",
      "fries": 150,
      "friesColor": "hsl(187, 70%, 50%)",
      "donut": 84,
      "donutColor": "hsl(280, 70%, 50%)"
    }
  ] 

  return (
    <div className='w-full h-screen bg-green-200 flex place-content-center place-items-center'>
      <div className='w-full h-content flex flex-col place-items-center place-content-center'>
        <div className='flex '>
          <div onClick={()=>setChart('bar')} className={`${chart === 'bar' ? 'bg-black text-white' : 'bg-white text-black'}`}>Bar</div>
          <div onClick={()=>setChart('areaBump')} className={`${chart === 'areaBump' ? 'bg-black text-white' : 'bg-white text-black'}`}>Area Bump</div>
        </div>
        <div className='w-full h-96 p-20 p-10  bg-slate-100'>
            {
              chart && chart === "bar" 
                &&             
                  <ResponsiveBar
                    data={barData}
                    keys={[
                        'hot dog',
                        'burger',
                        'sandwich',
                        'kebab',
                        'fries',
                        'donut'
                    ]}
                    indexBy="country"
                    margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
                    padding={0.3}
                    valueScale={{ type: 'linear' }}
                    indexScale={{ type: 'band', round: true }}
                    colors={{ scheme: 'nivo' }}
                    defs={[
                        {
                            id: 'dots',
                            type: 'patternDots',
                            background: 'inherit',
                            color: '#38bcb2',
                            size: 4,
                            padding: 1,
                            stagger: true
                        },
                        {
                            id: 'lines',
                            type: 'patternLines',
                            background: 'inherit',
                            color: '#eed312',
                            rotation: -45,
                            lineWidth: 6,
                            spacing: 10
                        }
                    ]}
                    fill={[
                        {
                            match: {
                                id: 'fries'
                            },
                            id: 'dots'
                        },
                        {
                            match: {
                                id: 'sandwich'
                            },
                            id: 'lines'
                        }
                    ]}
                    borderColor={{
                        from: 'color',
                        modifiers: [
                            [
                                'darker',
                                1.6
                            ]
                        ]
                    }}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'country',
                        legendPosition: 'middle',
                        legendOffset: 32,
                        truncateTickAt: 0
                    }}
                    axisLeft={{
                        tickSize: 5,
                        tickPadding: 5,
                        tickRotation: 0,
                        legend: 'food',
                        legendPosition: 'middle',
                        legendOffset: -40,
                        truncateTickAt: 0
                    }}
                    labelSkipWidth={12}
                    labelSkipHeight={12}
                    labelTextColor={{
                        from: 'color',
                        modifiers: [
                            [
                                'darker',
                                1.6
                            ]
                        ]
                    }}
                    legends={[
                        {
                            dataFrom: 'keys',
                            anchor: 'bottom-right',
                            direction: 'column',
                            justify: false,
                            translateX: 120,
                            translateY: 0,
                            itemsSpacing: 2,
                            itemWidth: 100,
                            itemHeight: 20,
                            itemDirection: 'left-to-right',
                            itemOpacity: 0.85,
                            symbolSize: 20,
                            effects: [
                                {
                                    on: 'hover',
                                    style: {
                                        itemOpacity: 1
                                    }
                                }
                            ]
                        }
                    ]}
                    role="application"
                    ariaLabel="Nivo bar chart demo"
                    barAriaLabel={e=>e.id+": "+e.formattedValue+" in country: "+e.indexValue}
              />            
                
            }

            {chart && chart === 'areaBump' &&
              <ResponsiveAreaBump
                data={data}
              margin={{ top: 40, right: 100, bottom: 40, left: 100 }}
              spacing={8}
              colors={{ scheme: 'nivo' }}
              blendMode="multiply"
              defs={[
                  {
                      id: 'dots',
                      type: 'patternDots',
                      background: 'inherit',
                      color: '#38bcb2',
                      size: 4,
                      padding: 1,
                      stagger: true
                  },
                  {
                      id: 'lines',
                      type: 'patternLines',
                      background: 'inherit',
                      color: '#eed312',
                      rotation: -45,
                      lineWidth: 6,
                      spacing: 10
                  }
              ]}
              fill={[
                  {
                      match: {
                          id: 'CoffeeScript'
                      },
                      id: 'dots'
                  },
                  {
                      match: {
                          id: 'TypeScript'
                      },
                      id: 'lines'
                  }
              ]}
              startLabel={true}
              endLabel="id"
              endLabelTextColor={{
                  from: 'color',
                  modifiers: [
                      [
                          'darker',
                          '0.5'
                      ]
                  ]
              }}
              axisTop={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: -36
              }}
              axisBottom={{
                  tickSize: 5,
                  tickPadding: 5,
                  tickRotation: 0,
                  legend: '',
                  legendPosition: 'middle',
                  legendOffset: 32
              }}
              motionConfig="wobbly"
              />
            }
            
        </div>
      </div>
    </div>
  )
}

import * as React from "react"
import { GalleryCard } from "./galleryCard"


export function ChartGallery() {
    function formatNumber(value) {
        value /= 1000_000;
        return `${Math.floor(value)}M`;
    }

    const numFormatter = new Intl.NumberFormat("en-US");

    const dateFormatter = new Intl.DateTimeFormat("en-US");

    const tooltip = {
        renderer: ({ title, datum, xKey, yKey }) => ({
          title,
          content: `${dateFormatter.format(datum[xKey])}: ${datum[yKey]}`,
        }),
      };

    const demoCharts = [
        {
            id: 'bar0',
            title: "Simple Bar Chart",
            description: "Bar Series visualises numerical data with proportional bars",
            footnote: "Source: Department for Digital, Culture, Media & Sport",
            data: [
                { year: "2016", visitors: 46636720 },
                { year: "2017", visitors: 48772922 },
                { year: "2018", visitors: 50800193 },
                { year: "2019", visitors: 48023342 },
                { year: "2020", visitors: 47271912 },
                { year: "2021", visitors: 47155093 },
                { year: "2022", visitors: 49441678 },
                { year: "2023", visitors: 50368190 },
              ],
            series: [
                {
                  type: "bar",
                  xKey: "year",
                  yKey: "visitors",
                  label: {
                    formatter: ({ value }) => formatNumber(value),
                  },
                  tooltip: {
                    renderer: ({ datum, xKey, yKey }) => {
                      return { title: datum[xKey], content: formatNumber(datum[yKey]) };
                    },
                  },
                },
              ],            
            axes: [
                {
                    type: "category",
                    position: "bottom",
                    title: {
                    text: "Year",
                    },
                },
                {
                    type: "number",
                    position: "left",
                    title: {
                    text: "Total Visitors",
                    },
                    label: {
                    formatter: ({ value }) => formatNumber(value),
                    },
                    crosshair: {
                    label: {
                        renderer: ({ value }) =>
                        `<div style="padding: 0 7px; border-radius: 2px; line-height: 1.7em; background-color: rgb(71,71,71); color: rgb(255, 255, 255);">${formatNumber(value)}</div>`,
                    },
                    },
                },
            ],
        },
        {
            id: 'bar1',
            title: "Group Stacked Bar",
            description: "Bar Charts can be grouped or stacked",
            footnote: null,
            data: [
                {
                  dolphin: "Peter",
                  interactionDurationTM: 1.23,
                  interactionDurationTMLower: 0.8,
                  interactionDurationTMUpper: 1.44,
                  interactionDurationYM: 2.85,
                  interactionDurationYMLower: 2.22,
                  interactionDurationYMUpper: 3.61,
                  numberOfLooksTM: 60,
                  numberOfLooksYM: 64,
                },
                {
                  dolphin: "Mary",
                  interactionDurationTM: 1.35,
                  interactionDurationTMLower: 0.9,
                  interactionDurationTMUpper: 1.59,
                  interactionDurationYM: 2.59,
                  interactionDurationYMLower: 2.09,
                  interactionDurationYMUpper: 2.85,
                  numberOfLooksTM: 57,
                  numberOfLooksYM: 93,
                },
                {
                  dolphin: "Mercutio",
                  interactionDurationTM: 1.4,
                  interactionDurationTMLower: 1.32,
                  interactionDurationTMUpper: 1.46,
                  interactionDurationYM: 1.45,
                  interactionDurationYMLower: 1.1,
                  interactionDurationYMUpper: 1.54,
                  numberOfLooksTM: 238,
                  numberOfLooksYM: 217,
                },
                {
                  dolphin: "Ada",
                  interactionDurationTM: 1.1,
                  interactionDurationTMLower: 0.89,
                  interactionDurationTMUpper: 1.45,
                  interactionDurationYM: 1.47,
                  interactionDurationYMLower: 1.35,
                  interactionDurationYMUpper: 1.64,
                  numberOfLooksTM: 237,
                  numberOfLooksYM: 217,
                },
            ],
            series: [
            {
                type: "bar",
                xKey: "dolphin",
                yKey: "interactionDurationTM",
                yName: "Interaction Duration - Transparent Mirror",
                legendItemName: "Interaction Duration - Transparent Mirror",
                stackGroup: "ID",
                errorBar: {
                yLowerKey: "interactionDurationTMLower",
                yUpperKey: "interactionDurationTMUpper",
                },
            },
            {
                type: "bar",
                xKey: "dolphin",
                yKey: "interactionDurationYM",
                yName: "Interaction Duration - Yellow Mirror",
                legendItemName: "Interaction Duration - Yellow Mirror",
                stackGroup: "ID",
                errorBar: {
                yLowerKey: "interactionDurationYMLower",
                yUpperKey: "interactionDurationYMUpper",
                },
            },
            {
                type: "bar",
                xKey: "dolphin",
                yKey: "numberOfLooksTM",
                yName: "Number of Looks - Transparent Mirror",
                legendItemName: "Number of Looks - Transparent Mirror",
                stackGroup: "NOL",
            },
            {
                type: "bar",
                xKey: "dolphin",
                yKey: "numberOfLooksYM",
                yName: "Number of Looks - Yellow Mirror",
                legendItemName: "Number of Looks - Yellow Mirror",
                stackGroup: "NOL",
            },
            ],
            axes: [
            {
                position: "top",
                type: "category",
                keys: ["dolphin"],
                title: {
                text: "Dolphin",
                },
                paddingInner: 0.5,
                paddingOuter: 0.2,
                crossLines: [
                {
                    type: "range",
                    range: ["Peter", "Peter"],
                    strokeWidth: 0,
                },
                {
                    type: "range",
                    range: ["Mercutio", "Mercutio"],
                    strokeWidth: 0,
                },
                ],
            },
            {
                position: "left",
                type: "number",
                keys: ["interactionDurationTM", "interactionDurationYM"],
                title: {
                text: "Duration of Interaction (seconds)",
                },
            },
            {
                position: "right",
                type: "number",
                title: {
                text: "Numer of Looks",
                },
                keys: ["numberOfLooksTM", "numberOfLooksYM"],
            },
            ],
        },
        {
            id: 'bar2',
            title: "Hardcore Stacked Bar",
            description: "Chart display to the extent of your imagination",
            footnote: "Source: Transport of London",
            data: [
                {
                  station: "Finsbury\nPark",
                  early: 2454,
                  morningPeak: 16644,
                  interPeak: 9338,
                  afternoonPeak: 6346,
                  evening: 3547,
                },
                {
                  station: "Seven\nSisters",
                  early: 3927,
                  morningPeak: 7581,
                  interPeak: 5421,
                  afternoonPeak: 3245,
                  evening: 2036,
                },
                {
                  station: "Tottenham\nHale",
                  early: 6836,
                  morningPeak: 12740,
                  interPeak: 14964,
                  afternoonPeak: 12790,
                  evening: 8428,
                },
                {
                  station: "Warren\nStreet",
                  early: 9108,
                  morningPeak: 2710,
                  interPeak: 5902,
                  afternoonPeak: 10947,
                  evening: 5574,
                },
                {
                  station: "Oxford\nCircus",
                  early: 7170,
                  morningPeak: 4996,
                  interPeak: 26616,
                  afternoonPeak: 32269,
                  evening: 3665,
                },
                {
                  station: "Green\nPark",
                  early: 6252,
                  morningPeak: 3911,
                  interPeak: 11971,
                  afternoonPeak: 19749,
                  evening: 11582,
                },
              ],
            series: [
                {
                  type: "bar",
                  xKey: "station",
                  yKey: "early",
                  yName: "Early",
                  stacked: true,
                  normalizedTo: 100,
                },
                {
                  type: "bar",
                  xKey: "station",
                  yKey: "morningPeak",
                  yName: "Morning peak",
                  stacked: true,
                  normalizedTo: 100,
                },
                {
                  type: "bar",
                  xKey: "station",
                  yKey: "interPeak",
                  yName: "Between peak",
                  stacked: true,
                  normalizedTo: 100,
                },
                {
                  type: "bar",
                  xKey: "station",
                  yKey: "afternoonPeak",
                  yName: "Afternoon peak",
                  stacked: true,
                  normalizedTo: 100,
                },
                {
                  type: "bar",
                  xKey: "station",
                  yKey: "evening",
                  yName: "Evening",
                  stacked: true,
                  normalizedTo: 100,
                },
              ],
            axes: [
                {
                    type: "category",
                    position: "bottom",
                    paddingInner: 0,
                    groupPaddingInner: 0,
                    paddingOuter: 0,
                },
                {
                    type: "number",
                    position: "left",
                    nice: false,
                    gridLine: {
                    enabled: false,
                    },
                    label: {
                    enabled: false,
                    },
                    crosshair: {
                    enabled: false,
                    },
                },
            ],
            theme: {
                overrides: {
                  bar: {
                    series: {
                      stroke: "transparent",
                      strokeWidth: 2,
                      cornerRadius: 6,
                      fillOpacity: 0.8,
                      label: {
                        enabled: true,
                        formatter: ({ value }) => `${numFormatter.format(value)}`,
                      },
                      tooltip: {
                        renderer: ({ title, datum, xKey, yKey }) => ({
                          title,
                          content: `${datum[xKey]}: ${numFormatter.format(datum[yKey])}`,
                        }),
                      },
                    },
                  },
                },
              },
        },
        {
            id: 'line0',
            title: "Simple Line Graphs",
            description: "A Line Series visualises continuous data, and is typically used to see trends or fluctuations over time.",
            footnote: "Source: Department for Business, Energy & Industrial Strategy",
            data: [{
                date: new Date(2019, 0, 7),
                petrol: 120.27,
                diesel: 130.33,
                lowerPetrol: 119.8,
                upperPetrol: 120.7,
                lowerDiesel: 130.0,
                upperDiesel: 131.5,
              },
              {
                date: new Date(2019, 0, 14),
                petrol: 119.53,
                diesel: 129.47,
                lowerPetrol: 119.0,
                upperPetrol: 120.0,
                lowerDiesel: 128.5,
                upperDiesel: 130.5,
              },
              {
                date: new Date(2019, 0, 21),
                petrol: 119.12,
                diesel: 128.92,
                lowerPetrol: 118.5,
                upperPetrol: 119.8,
                lowerDiesel: 128.0,
                upperDiesel: 129.5,
              },
              {
                date: new Date(2019, 0, 28),
                petrol: 119.29,
                diesel: 129.1,
                lowerPetrol: 118.0,
                upperPetrol: 120,
                lowerDiesel: 128.7,
                upperDiesel: 130.5,
              },
              {
                date: new Date(2019, 1, 4),
                petrol: 119.13,
                diesel: 129.13,
                lowerPetrol: 118.5,
                upperPetrol: 119.9,
                lowerDiesel: 129.0,
                upperDiesel: 131.0,
              },
              {
                date: new Date(2019, 1, 11),
                petrol: 118.97,
                diesel: 129.17,
                lowerPetrol: 118.5,
                upperPetrol: 119.6,
                lowerDiesel: 129.0,
                upperDiesel: 131.5,
              },
              {
                date: new Date(2019, 1, 18),
                petrol: 119.05,
                diesel: 129.23,
                lowerPetrol: 118.5,
                upperPetrol: 119.6,
                lowerDiesel: 129.0,
                upperDiesel: 131.0,
              },
              {
                date: new Date(2019, 1, 25),
                petrol: 119.22,
                diesel: 129.66,
                lowerPetrol: 118.9,
                upperPetrol: 119.7,
                lowerDiesel: 129.0,
                upperDiesel: 131.0,
              },
              {
                date: new Date(2019, 2, 4),
                petrol: 119.72,
                diesel: 130.25,
                lowerPetrol: 119.4,
                upperPetrol: 120.2,
                lowerDiesel: 129.0,
                upperDiesel: 131.5,
              },
              {
                date: new Date(2019, 2, 11),
                petrol: 120.1,
                diesel: 130.59,
                lowerPetrol: 119.9,
                upperPetrol: 120.6,
                lowerDiesel: 130.3,
                upperDiesel: 131.3,
              },
              {
                date: new Date(2019, 2, 18),
                petrol: 120.48,
                diesel: 130.85,
                lowerPetrol: 119.2,
                upperPetrol: 120.9,
                lowerDiesel: 130.5,
                upperDiesel: 131.5,
              },
              {
                date: new Date(2019, 2, 25),
                petrol: 120.83,
                diesel: 131.15,
                lowerPetrol: 119.5,
                upperPetrol: 121.1,
                lowerDiesel: 130.5,
                upperDiesel: 131.7,
              },
              {
                date: new Date(2019, 3, 1),
                petrol: 121.7,
                diesel: 131.48,
                lowerPetrol: 120.4,
                upperPetrol: 123.0,
                lowerDiesel: 131.0,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 3, 8),
                petrol: 122.75,
                diesel: 132.08,
                lowerPetrol: 121.5,
                upperPetrol: 123.2,
                lowerDiesel: 131.5,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 3, 15),
                petrol: 124.06,
                diesel: 132.96,
                lowerPetrol: 122.8,
                upperPetrol: 125.5,
                lowerDiesel: 132.0,
                upperDiesel: 133.5,
              },
              {
                date: new Date(2019, 3, 22),
                petrol: 125.43,
                diesel: 133.99,
                lowerPetrol: 124.1,
                upperPetrol: 126.7,
                lowerDiesel: 133.0,
                upperDiesel: 134.0,
              },
              {
                date: new Date(2019, 3, 29),
                petrol: 126.36,
                diesel: 134.6,
                lowerPetrol: 126.0,
                upperPetrol: 127.5,
                lowerDiesel: 134.0,
                upperDiesel: 135.0,
              },
              {
                date: new Date(2019, 4, 6),
                petrol: 127.5,
                diesel: 135.41,
                lowerPetrol: 127.1,
                upperPetrol: 128.8,
                lowerDiesel: 135.0,
                upperDiesel: 136.0,
              },
              {
                date: new Date(2019, 4, 13),
                petrol: 127.97,
                diesel: 135.36,
                lowerPetrol: 126.7,
                upperPetrol: 129.2,
                lowerDiesel: 135.0,
                upperDiesel: 136.0,
              },
              {
                date: new Date(2019, 4, 20),
                petrol: 128.51,
                diesel: 135.82,
                lowerPetrol: 128.0,
                upperPetrol: 129.8,
                lowerDiesel: 135.0,
                upperDiesel: 136.0,
              },
              {
                date: new Date(2019, 4, 27),
                petrol: 129.14,
                diesel: 136.45,
                lowerPetrol: 128.9,
                upperPetrol: 129.4,
                lowerDiesel: 136.0,
                upperDiesel: 137.0,
              },
              {
                date: new Date(2019, 5, 3),
                petrol: 129.41,
                diesel: 136.39,
                lowerPetrol: 129.1,
                upperPetrol: 129.7,
                lowerDiesel: 136.0,
                upperDiesel: 137.0,
              },
              {
                date: new Date(2019, 5, 10),
                petrol: 128.89,
                diesel: 135.4,
                lowerPetrol: 128.6,
                upperPetrol: 129.1,
                lowerDiesel: 135.0,
                upperDiesel: 136.0,
              },
              {
                date: new Date(2019, 5, 17),
                petrol: 127.66,
                diesel: 133.76,
                lowerPetrol: 127.3,
                upperPetrol: 128.0,
                lowerDiesel: 133.0,
                upperDiesel: 134.0,
              },
              {
                date: new Date(2019, 5, 24),
                petrol: 126.66,
                diesel: 131.81,
                lowerPetrol: 126.3,
                upperPetrol: 127.0,
                lowerDiesel: 130.5,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 6, 1),
                petrol: 126.49,
                diesel: 131.55,
                lowerPetrol: 126.2,
                upperPetrol: 126.8,
                lowerDiesel: 131.0,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 6, 8),
                petrol: 126.86,
                diesel: 131.68,
                lowerPetrol: 126.6,
                upperPetrol: 127.1,
                lowerDiesel: 131.5,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 6, 15),
                petrol: 127.13,
                diesel: 131.86,
                lowerPetrol: 126.9,
                upperPetrol: 127.4,
                lowerDiesel: 130.8,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 6, 22),
                petrol: 127.81,
                diesel: 132.21,
                lowerPetrol: 127.6,
                upperPetrol: 128.1,
                lowerDiesel: 131.8,
                upperDiesel: 133.9,
              },
              {
                date: new Date(2019, 6, 29),
                petrol: 128.03,
                diesel: 132.6,
                lowerPetrol: 127.8,
                upperPetrol: 128.3,
                lowerDiesel: 131.6,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 7, 5),
                petrol: 128.37,
                diesel: 132.61,
                lowerPetrol: 128.1,
                upperPetrol: 128.6,
                lowerDiesel: 132.0,
                upperDiesel: 133.2,
              },
              {
                date: new Date(2019, 7, 12),
                petrol: 128.36,
                diesel: 132.59,
                lowerPetrol: 128.1,
                upperPetrol: 128.6,
                lowerDiesel: 132.3,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 7, 19),
                petrol: 128.17,
                diesel: 132.6,
                lowerPetrol: 127.9,
                upperPetrol: 128.4,
                lowerDiesel: 132.0,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 7, 26),
                petrol: 128.22,
                diesel: 132.51,
                lowerPetrol: 128.0,
                upperPetrol: 128.4,
                lowerDiesel: 132.0,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 8, 2),
                petrol: 127.86,
                diesel: 132.29,
                lowerPetrol: 127.6,
                upperPetrol: 128.1,
                lowerDiesel: 132.0,
                upperDiesel: 133.0,
              },
              {
                date: new Date(2019, 8, 9),
                petrol: 127.79,
                diesel: 131.89,
                lowerPetrol: 127.6,
                upperPetrol: 128.1,
                lowerDiesel: 131.5,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 8, 16),
                petrol: 126.92,
                diesel: 131.35,
                lowerPetrol: 126.7,
                upperPetrol: 127.2,
                lowerDiesel: 131.0,
                upperDiesel: 131.7,
              },
              {
                date: new Date(2019, 8, 23),
                petrol: 126.78,
                diesel: 131.52,
                lowerPetrol: 126.5,
                upperPetrol: 127.0,
                lowerDiesel: 131.0,
                upperDiesel: 131.7,
              },
              {
                date: new Date(2019, 8, 30),
                petrol: 126.92,
                diesel: 131.83,
                lowerPetrol: 126.7,
                upperPetrol: 127.2,
                lowerDiesel: 131.0,
                upperDiesel: 131.85,
              },
              {
                date: new Date(2019, 9, 7),
                petrol: 126.87,
                diesel: 131.82,
                lowerPetrol: 126.6,
                upperPetrol: 127.1,
                lowerDiesel: 131.0,
                upperDiesel: 131.88,
              },
              {
                date: new Date(2019, 9, 14),
                petrol: 126.62,
                diesel: 131.58,
                lowerPetrol: 126,
                upperPetrol: 126.9,
                lowerDiesel: 131.2,
                upperDiesel: 131.9,
              },
              {
                date: new Date(2019, 9, 21),
                petrol: 126.72,
                diesel: 131.48,
                lowerPetrol: 126.5,
                upperPetrol: 127.0,
                lowerDiesel: 131.2,
                upperDiesel: 131.9,
              },
              {
                date: new Date(2019, 9, 28),
                petrol: 126.75,
                diesel: 131.47,
                lowerPetrol: 126.5,
                upperPetrol: 127.0,
                lowerDiesel: 131.2,
                upperDiesel: 131.9,
              },
              {
                date: new Date(2019, 10, 4),
                petrol: 127.07,
                diesel: 131.6,
                lowerPetrol: 126.9,
                upperPetrol: 127.2,
                lowerDiesel: 131.3,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 10, 11),
                petrol: 127.03,
                diesel: 131.58,
                lowerPetrol: 126.9,
                upperPetrol: 127.2,
                lowerDiesel: 131.3,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 10, 18),
                petrol: 127.01,
                diesel: 131.57,
                lowerPetrol: 126.8,
                upperPetrol: 127.1,
                lowerDiesel: 131.3,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 10, 25),
                petrol: 127.09,
                diesel: 131.6,
                lowerPetrol: 126.9,
                upperPetrol: 127.2,
                lowerDiesel: 131.3,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 11, 2),
                petrol: 127.02,
                diesel: 131.55,
                lowerPetrol: 126.8,
                upperPetrol: 127.1,
                lowerDiesel: 131.3,
                upperDiesel: 132.0,
              },
              {
                date: new Date(2019, 11, 9),
                petrol: 126.78,
                diesel: 131.36,
                lowerPetrol: 126.6,
                upperPetrol: 127.0,
                lowerDiesel: 131.2,
                upperDiesel: 131.9,
              },
              {
                date: new Date(2019, 11, 16),
                petrol: 126.56,
                diesel: 131.2,
                lowerPetrol: 126.4,
                upperPetrol: 126.9,
                lowerDiesel: 131.1,
                upperDiesel: 131.8,
              },
              {
                date: new Date(2019, 11, 23),
                petrol: 126.4,
                diesel: 131.07,
                lowerPetrol: 126.2,
                upperPetrol: 126.7,
                lowerDiesel: 131.0,
                upperDiesel: 131.7,
              },
              {
                date: new Date(2019, 11, 30),
                petrol: 126.19,
                diesel: 130.88,
                lowerPetrol: 125.9,
                upperPetrol: 126.4,
                lowerDiesel: 130.8,
                upperDiesel: 131.3,
              }],
            series: [
                {
                  type: "line",
                  xKey: "date",
                  yKey: "petrol",
                  tooltip,
                },
                {
                  type: "line",
                  xKey: "date",
                  yKey: "diesel",
                  tooltip,
                },
              ],
            axes: [
                {
                  position: "bottom",
                  type: "time",
                  title: {
                    text: "Date",
                  },
                  label: {
                    format: "%b",
                  },
                },
                {
                  position: "left",
                  type: "number",
                  title: {
                    text: "Price in Pence",
                  },
                },
              ],
        }
    ]

    return (
        <div className="grid grid-cols-3 gap-4 p-20">
            {demoCharts.map((chart, idx) => (
                <GalleryCard title={chart.title} description={chart.description} data ={chart.data} footnote={chart.footnote} series={chart.series} axes={chart.axes} theme={chart.theme}/>
            ))}
        </div>
    )
}
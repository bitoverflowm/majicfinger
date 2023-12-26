'use client'

import React, { useState, useEffect } from 'react'

import { ResponsiveAreaBump } from '@nivo/bump'
import { ResponsiveBar } from '@nivo/bar'
import { ResponsiveLine } from '@nivo/line'
import { ResponsiveCalendar } from '@nivo/calendar'

import { IoBarChartOutline, IoAddCircle, IoAdd } from "react-icons/io5";
import { BsClipboardData } from "react-icons/bs";
import { VscJson } from "react-icons/vsc";
import { PiFinnTheHumanFill } from "react-icons/pi";
import { CiViewTable } from "react-icons/ci";
import { SlMagicWand } from "react-icons/sl";
import { FaLongArrowAltRight } from "react-icons/fa";
import { FaRegEye } from "react-icons/fa";
import { LuTimerReset } from "react-icons/lu";
import { MdOutlineCreateNewFolder } from "react-icons/md";
import { GoEyeClosed } from "react-icons/go";



import EditField from '@/components/mjUtils/editField'


export default function Home() {

  const [chart, setChart] = useState('line')
  const [dataVisible, setDataVisible] = useState(0)

  //States for views
  const [sideViewActive, setSideViewActive] = useState(false)
  const [dataEditView, setDataEditView] = useState()

  //humanFriendly edit view
  const [horizontalTable, setHorizontalTable] = useState(true)

  //the parent data; this is correct, and is master
  const [activeData, setActiveData] = useState()
  const [previewOldData, setPreviewOldData] = useState()

  //States for data editing
  const [isEditing, setIsEditing] = useState()
  const [liveData, setLiveData] = useState()

  //chart variable holder
  const [xAxis, setXAxis] = useState()
  const [yAxis, setYAxis] = useState()

  //edit data field states
  const [addingXY, setAddingXY] = useState()
  const [tempX, setTempX] = useState('')
  const [tempY, setTempY] = useState('')

  const defaultBarData = [
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

  const defaultBTCLine = [
    {
      "id": "BTC Price",
      "data": [
        {
          "x": "Aug 22",
          "y": 1100
        },
        {
          "x": "Sept 22",
          "y": 33578
        },
        {
          "x": "Oct 22",
          "y": 33578
        },
        {
          "x": "Nov 22",
          "y": 33578
        },
        {
        "x": "Dec 22",
        "y": 43578
      }]
    },
    /*
    {
      "id": "ETH Price",
      "data": [
        {
          "x": "Aug 22",
          "y": 1100
        },
        {
          "x": "Sept 22",
          "y": 33578
        },
        {
          "x": "Oct 22",
          "y": 33578
        },
        {
          "x": "Nov 22",
          "y": 33578
        },
        {
        "x": "Dec 22",
        "y": 43578
      }]
    },*/
  ]

  const defaultLineData = [
    {
      "id": "japan",
      "color": "hsl(197, 70%, 50%)",
      "data": [
        {
          "x": "plane",
          "y": 162
        },
        {
          "x": "helicopter",
          "y": 124
        },
        {
          "x": "boat",
          "y": 193
        },
        {
          "x": "train",
          "y": 229
        },
        {
          "x": "subway",
          "y": 60
        },
        {
          "x": "bus",
          "y": 107
        },
        {
          "x": "car",
          "y": 23
        },
        {
          "x": "moto",
          "y": 158
        },
        {
          "x": "bicycle",
          "y": 36
        },
        {
          "x": "horse",
          "y": 247
        },
        {
          "x": "skateboard",
          "y": 221
        },
        {
          "x": "others",
          "y": 260
        }
      ]
    },
    {
      "id": "france",
      "color": "hsl(109, 70%, 50%)",
      "data": [
        {
          "x": "plane",
          "y": 123
        },
        {
          "x": "helicopter",
          "y": 126
        },
        {
          "x": "boat",
          "y": 297
        },
        {
          "x": "train",
          "y": 188
        },
        {
          "x": "subway",
          "y": 229
        },
        {
          "x": "bus",
          "y": 191
        },
        {
          "x": "car",
          "y": 167
        },
        {
          "x": "moto",
          "y": 242
        },
        {
          "x": "bicycle",
          "y": 288
        },
        {
          "x": "horse",
          "y": 26
        },
        {
          "x": "skateboard",
          "y": 248
        },
        {
          "x": "others",
          "y": 6
        }
      ]
    },
    {
      "id": "us",
      "color": "hsl(268, 70%, 50%)",
      "data": [
        {
          "x": "plane",
          "y": 196
        },
        {
          "x": "helicopter",
          "y": 55
        },
        {
          "x": "boat",
          "y": 145
        },
        {
          "x": "train",
          "y": 98
        },
        {
          "x": "subway",
          "y": 73
        },
        {
          "x": "bus",
          "y": 186
        },
        {
          "x": "car",
          "y": 42
        },
        {
          "x": "moto",
          "y": 210
        },
        {
          "x": "bicycle",
          "y": 19
        },
        {
          "x": "horse",
          "y": 209
        },
        {
          "x": "skateboard",
          "y": 192
        },
        {
          "x": "others",
          "y": 264
        }
      ]
    },
    {
      "id": "germany",
      "color": "hsl(65, 70%, 50%)",
      "data": [
        {
          "x": "plane",
          "y": 252
        },
        {
          "x": "helicopter",
          "y": 144
        },
        {
          "x": "boat",
          "y": 19
        },
        {
          "x": "train",
          "y": 1
        },
        {
          "x": "subway",
          "y": 142
        },
        {
          "x": "bus",
          "y": 233
        },
        {
          "x": "car",
          "y": 293
        },
        {
          "x": "moto",
          "y": 35
        },
        {
          "x": "bicycle",
          "y": 175
        },
        {
          "x": "horse",
          "y": 245
        },
        {
          "x": "skateboard",
          "y": 273
        },
        {
          "x": "others",
          "y": 182
        }
      ]
    },
    {
      "id": "norway",
      "color": "hsl(30, 70%, 50%)",
      "data": [
        {
          "x": "plane",
          "y": 223
        },
        {
          "x": "helicopter",
          "y": 270
        },
        {
          "x": "boat",
          "y": 293
        },
        {
          "x": "train",
          "y": 220
        },
        {
          "x": "subway",
          "y": 25
        },
        {
          "x": "bus",
          "y": 87
        },
        {
          "x": "car",
          "y": 295
        },
        {
          "x": "moto",
          "y": 285
        },
        {
          "x": "bicycle",
          "y": 213
        },
        {
          "x": "horse",
          "y": 48
        },
        {
          "x": "skateboard",
          "y": 191
        },
        {
          "x": "others",
          "y": 25
        }
      ]
    }
  ]

  const defaultGhData = [
    {
      "value": 9,
      "day": "2016-12-26"
    },
    {
      "value": 375,
      "day": "2016-04-13"
    },
    {
      "value": 312,
      "day": "2015-05-10"
    },
    {
      "value": 331,
      "day": "2018-05-23"
    },
    {
      "value": 311,
      "day": "2016-04-18"
    },
    {
      "value": 144,
      "day": "2017-09-06"
    },
    {
      "value": 42,
      "day": "2017-04-13"
    },
    {
      "value": 335,
      "day": "2015-12-25"
    },
    {
      "value": 5,
      "day": "2017-07-16"
    },
    {
      "value": 226,
      "day": "2015-08-22"
    },
    {
      "value": 30,
      "day": "2018-05-27"
    },
    {
      "value": 172,
      "day": "2015-06-16"
    },
    {
      "value": 153,
      "day": "2015-08-07"
    },
    {
      "value": 291,
      "day": "2017-01-06"
    },
    {
      "value": 263,
      "day": "2016-04-15"
    },
    {
      "value": 257,
      "day": "2015-06-03"
    },
    {
      "value": 297,
      "day": "2016-10-02"
    },
    {
      "value": 31,
      "day": "2017-09-19"
    },
    {
      "value": 336,
      "day": "2016-05-16"
    },
    {
      "value": 20,
      "day": "2017-02-19"
    },
    {
      "value": 24,
      "day": "2016-05-28"
    },
    {
      "value": 87,
      "day": "2017-07-09"
    },
    {
      "value": 116,
      "day": "2017-07-15"
    },
    {
      "value": 241,
      "day": "2018-07-19"
    },
    {
      "value": 75,
      "day": "2015-10-01"
    },
    {
      "value": 166,
      "day": "2016-03-09"
    },
    {
      "value": 352,
      "day": "2015-09-20"
    },
    {
      "value": 201,
      "day": "2018-06-30"
    },
    {
      "value": 142,
      "day": "2016-10-07"
    },
    {
      "value": 278,
      "day": "2017-05-23"
    },
    {
      "value": 205,
      "day": "2016-12-03"
    },
    {
      "value": 361,
      "day": "2016-09-17"
    },
    {
      "value": 266,
      "day": "2015-06-09"
    },
    {
      "value": 333,
      "day": "2017-03-27"
    },
    {
      "value": 377,
      "day": "2015-04-08"
    },
    {
      "value": 208,
      "day": "2016-01-15"
    },
    {
      "value": 386,
      "day": "2017-10-04"
    },
    {
      "value": 252,
      "day": "2015-09-05"
    },
    {
      "value": 287,
      "day": "2017-11-08"
    },
    {
      "value": 268,
      "day": "2018-01-18"
    },
    {
      "value": 33,
      "day": "2015-05-19"
    },
    {
      "value": 223,
      "day": "2015-06-24"
    },
    {
      "value": 295,
      "day": "2017-11-26"
    },
    {
      "value": 61,
      "day": "2017-08-15"
    },
    {
      "value": 51,
      "day": "2017-02-14"
    },
    {
      "value": 278,
      "day": "2018-03-22"
    },
    {
      "value": 269,
      "day": "2016-10-26"
    },
    {
      "value": 248,
      "day": "2018-07-16"
    },
    {
      "value": 279,
      "day": "2017-01-09"
    },
    {
      "value": 212,
      "day": "2018-02-22"
    },
    {
      "value": 230,
      "day": "2017-11-01"
    },
    {
      "value": 397,
      "day": "2015-09-01"
    },
    {
      "value": 360,
      "day": "2015-07-30"
    },
    {
      "value": 94,
      "day": "2016-09-09"
    },
    {
      "value": 117,
      "day": "2017-09-12"
    },
    {
      "value": 131,
      "day": "2017-08-10"
    },
    {
      "value": 117,
      "day": "2016-03-08"
    },
    {
      "value": 61,
      "day": "2016-04-23"
    },
    {
      "value": 376,
      "day": "2015-05-30"
    },
    {
      "value": 16,
      "day": "2016-08-28"
    },
    {
      "value": 292,
      "day": "2017-10-01"
    },
    {
      "value": 250,
      "day": "2016-12-07"
    },
    {
      "value": 1,
      "day": "2017-11-16"
    },
    {
      "value": 145,
      "day": "2015-12-13"
    },
    {
      "value": 76,
      "day": "2017-06-23"
    },
    {
      "value": 249,
      "day": "2016-01-27"
    },
    {
      "value": 87,
      "day": "2015-12-03"
    },
    {
      "value": 367,
      "day": "2016-08-29"
    },
    {
      "value": 170,
      "day": "2018-04-02"
    },
    {
      "value": 255,
      "day": "2018-05-04"
    },
    {
      "value": 234,
      "day": "2016-07-19"
    },
    {
      "value": 99,
      "day": "2018-01-20"
    },
    {
      "value": 218,
      "day": "2017-10-19"
    },
    {
      "value": 137,
      "day": "2016-08-18"
    },
    {
      "value": 368,
      "day": "2015-06-30"
    },
    {
      "value": 266,
      "day": "2017-10-12"
    },
    {
      "value": 54,
      "day": "2015-08-23"
    },
    {
      "value": 323,
      "day": "2018-05-01"
    },
    {
      "value": 214,
      "day": "2015-12-10"
    },
    {
      "value": 263,
      "day": "2017-01-21"
    },
    {
      "value": 60,
      "day": "2016-10-01"
    },
    {
      "value": 14,
      "day": "2018-04-13"
    },
    {
      "value": 53,
      "day": "2018-04-12"
    },
    {
      "value": 260,
      "day": "2017-07-30"
    },
    {
      "value": 297,
      "day": "2016-11-22"
    },
    {
      "value": 209,
      "day": "2015-06-10"
    },
    {
      "value": 309,
      "day": "2016-06-21"
    },
    {
      "value": 68,
      "day": "2017-01-07"
    },
    {
      "value": 297,
      "day": "2016-07-04"
    },
    {
      "value": 176,
      "day": "2018-04-16"
    },
    {
      "value": 67,
      "day": "2017-03-26"
    },
    {
      "value": 64,
      "day": "2017-11-21"
    },
    {
      "value": 189,
      "day": "2016-09-02"
    },
    {
      "value": 136,
      "day": "2016-01-16"
    },
    {
      "value": 257,
      "day": "2017-12-14"
    },
    {
      "value": 147,
      "day": "2015-11-08"
    },
    {
      "value": 235,
      "day": "2018-06-15"
    },
    {
      "value": 379,
      "day": "2016-03-13"
    },
    {
      "value": 247,
      "day": "2017-02-18"
    },
    {
      "value": 230,
      "day": "2016-08-06"
    },
    {
      "value": 351,
      "day": "2016-08-11"
    },
    {
      "value": 392,
      "day": "2015-04-09"
    },
    {
      "value": 130,
      "day": "2017-08-28"
    },
    {
      "value": 194,
      "day": "2018-06-16"
    },
    {
      "value": 362,
      "day": "2015-07-27"
    },
    {
      "value": 68,
      "day": "2018-05-24"
    },
    {
      "value": 316,
      "day": "2016-02-02"
    },
    {
      "value": 270,
      "day": "2017-08-18"
    },
    {
      "value": 217,
      "day": "2017-09-20"
    },
    {
      "value": 72,
      "day": "2017-07-25"
    },
    {
      "value": 370,
      "day": "2018-01-15"
    },
    {
      "value": 293,
      "day": "2017-06-25"
    },
    {
      "value": 153,
      "day": "2016-09-01"
    },
    {
      "value": 183,
      "day": "2017-03-20"
    },
    {
      "value": 341,
      "day": "2016-10-08"
    },
    {
      "value": 55,
      "day": "2016-02-11"
    },
    {
      "value": 188,
      "day": "2016-03-30"
    },
    {
      "value": 305,
      "day": "2017-12-13"
    },
    {
      "value": 283,
      "day": "2017-01-02"
    },
    {
      "value": 279,
      "day": "2017-01-01"
    },
    {
      "value": 211,
      "day": "2017-02-25"
    },
    {
      "value": 78,
      "day": "2017-01-24"
    },
    {
      "value": 173,
      "day": "2017-07-28"
    },
    {
      "value": 375,
      "day": "2018-03-01"
    },
    {
      "value": 355,
      "day": "2015-12-18"
    },
    {
      "value": 23,
      "day": "2015-09-10"
    },
    {
      "value": 310,
      "day": "2015-05-31"
    },
    {
      "value": 66,
      "day": "2015-07-05"
    },
    {
      "value": 244,
      "day": "2017-07-19"
    },
    {
      "value": 125,
      "day": "2015-05-27"
    },
    {
      "value": 65,
      "day": "2017-09-22"
    },
    {
      "value": 323,
      "day": "2016-04-09"
    },
    {
      "value": 28,
      "day": "2015-05-28"
    },
    {
      "value": 329,
      "day": "2017-02-21"
    },
    {
      "value": 187,
      "day": "2016-11-29"
    },
    {
      "value": 83,
      "day": "2018-07-18"
    },
    {
      "value": 107,
      "day": "2016-03-12"
    },
    {
      "value": 82,
      "day": "2016-03-20"
    },
    {
      "value": 248,
      "day": "2016-03-03"
    },
    {
      "value": 86,
      "day": "2017-09-25"
    },
    {
      "value": 290,
      "day": "2016-10-13"
    },
    {
      "value": 42,
      "day": "2018-06-09"
    },
    {
      "value": 390,
      "day": "2016-07-10"
    },
    {
      "value": 372,
      "day": "2016-09-12"
    },
    {
      "value": 334,
      "day": "2016-03-26"
    },
    {
      "value": 150,
      "day": "2018-02-24"
    },
    {
      "value": 275,
      "day": "2016-04-30"
    },
    {
      "value": 42,
      "day": "2015-07-02"
    },
    {
      "value": 89,
      "day": "2016-01-07"
    },
    {
      "value": 307,
      "day": "2016-06-20"
    },
    {
      "value": 53,
      "day": "2016-05-14"
    },
    {
      "value": 175,
      "day": "2017-06-16"
    },
    {
      "value": 90,
      "day": "2018-05-06"
    },
    {
      "value": 113,
      "day": "2017-04-19"
    },
    {
      "value": 36,
      "day": "2018-02-28"
    },
    {
      "value": 30,
      "day": "2016-07-09"
    },
    {
      "value": 221,
      "day": "2017-08-17"
    },
    {
      "value": 128,
      "day": "2017-01-08"
    },
    {
      "value": 42,
      "day": "2015-07-07"
    },
    {
      "value": 268,
      "day": "2016-07-07"
    },
    {
      "value": 127,
      "day": "2015-10-21"
    },
    {
      "value": 191,
      "day": "2016-04-01"
    },
    {
      "value": 71,
      "day": "2017-01-25"
    },
    {
      "value": 386,
      "day": "2017-02-20"
    },
    {
      "value": 272,
      "day": "2018-06-27"
    },
    {
      "value": 178,
      "day": "2015-09-25"
    },
    {
      "value": 24,
      "day": "2015-12-09"
    },
    {
      "value": 32,
      "day": "2017-06-21"
    },
    {
      "value": 389,
      "day": "2016-12-20"
    },
    {
      "value": 3,
      "day": "2017-08-12"
    },
    {
      "value": 166,
      "day": "2016-01-26"
    },
    {
      "value": 203,
      "day": "2017-04-08"
    },
    {
      "value": 384,
      "day": "2017-02-10"
    },
    {
      "value": 201,
      "day": "2016-02-14"
    },
    {
      "value": 365,
      "day": "2015-11-15"
    },
    {
      "value": 260,
      "day": "2015-10-30"
    },
    {
      "value": 187,
      "day": "2017-09-05"
    },
    {
      "value": 194,
      "day": "2018-03-30"
    },
    {
      "value": 46,
      "day": "2016-05-18"
    },
    {
      "value": 16,
      "day": "2018-06-19"
    },
    {
      "value": 239,
      "day": "2017-11-28"
    },
    {
      "value": 38,
      "day": "2015-04-13"
    },
    {
      "value": 168,
      "day": "2015-10-08"
    },
    {
      "value": 96,
      "day": "2016-08-02"
    },
    {
      "value": 6,
      "day": "2016-12-10"
    },
    {
      "value": 192,
      "day": "2015-09-07"
    },
    {
      "value": 328,
      "day": "2016-10-31"
    },
    {
      "value": 2,
      "day": "2018-03-17"
    },
    {
      "value": 227,
      "day": "2017-04-22"
    },
    {
      "value": 264,
      "day": "2018-04-05"
    },
    {
      "value": 383,
      "day": "2015-07-21"
    },
    {
      "value": 112,
      "day": "2016-04-03"
    },
    {
      "value": 235,
      "day": "2017-10-13"
    },
    {
      "value": 197,
      "day": "2017-12-23"
    },
    {
      "value": 317,
      "day": "2018-05-19"
    },
    {
      "value": 285,
      "day": "2017-01-26"
    },
    {
      "value": 399,
      "day": "2015-06-19"
    },
    {
      "value": 143,
      "day": "2018-02-18"
    },
    {
      "value": 388,
      "day": "2017-04-25"
    },
    {
      "value": 20,
      "day": "2016-08-26"
    },
    {
      "value": 266,
      "day": "2015-11-04"
    },
    {
      "value": 369,
      "day": "2017-05-10"
    },
    {
      "value": 108,
      "day": "2015-06-14"
    },
    {
      "value": 225,
      "day": "2017-04-28"
    },
    {
      "value": 215,
      "day": "2018-01-16"
    },
    {
      "value": 357,
      "day": "2015-07-26"
    },
    {
      "value": 279,
      "day": "2016-02-15"
    },
    {
      "value": 273,
      "day": "2017-03-16"
    },
    {
      "value": 31,
      "day": "2017-04-11"
    },
    {
      "value": 25,
      "day": "2018-06-03"
    },
    {
      "value": 74,
      "day": "2015-04-11"
    },
    {
      "value": 231,
      "day": "2016-10-12"
    },
    {
      "value": 330,
      "day": "2017-04-17"
    },
    {
      "value": 325,
      "day": "2016-04-22"
    },
    {
      "value": 370,
      "day": "2016-08-04"
    },
    {
      "value": 102,
      "day": "2017-09-16"
    },
    {
      "value": 360,
      "day": "2017-01-19"
    },
    {
      "value": 294,
      "day": "2015-10-09"
    },
    {
      "value": 123,
      "day": "2017-12-19"
    },
    {
      "value": 329,
      "day": "2017-01-05"
    },
    {
      "value": 26,
      "day": "2015-07-23"
    },
    {
      "value": 180,
      "day": "2017-09-08"
    },
    {
      "value": 104,
      "day": "2015-04-01"
    },
    {
      "value": 164,
      "day": "2015-09-08"
    },
    {
      "value": 3,
      "day": "2017-12-11"
    },
    {
      "value": 151,
      "day": "2015-12-31"
    },
    {
      "value": 170,
      "day": "2016-07-25"
    },
    {
      "value": 73,
      "day": "2016-05-17"
    },
    {
      "value": 15,
      "day": "2017-11-13"
    },
    {
      "value": 141,
      "day": "2018-07-08"
    },
    {
      "value": 257,
      "day": "2017-10-14"
    },
    {
      "value": 300,
      "day": "2015-08-15"
    },
    {
      "value": 43,
      "day": "2015-10-23"
    },
    {
      "value": 106,
      "day": "2016-12-14"
    },
    {
      "value": 265,
      "day": "2016-01-18"
    },
    {
      "value": 28,
      "day": "2015-07-12"
    },
    {
      "value": 117,
      "day": "2015-04-04"
    },
    {
      "value": 363,
      "day": "2016-02-27"
    },
    {
      "value": 338,
      "day": "2016-04-04"
    },
    {
      "value": 74,
      "day": "2017-03-28"
    },
    {
      "value": 321,
      "day": "2018-01-29"
    },
    {
      "value": 156,
      "day": "2016-05-04"
    },
    {
      "value": 190,
      "day": "2016-03-29"
    },
    {
      "value": 342,
      "day": "2015-07-14"
    },
    {
      "value": 81,
      "day": "2016-07-08"
    },
    {
      "value": 55,
      "day": "2016-03-28"
    },
    {
      "value": 163,
      "day": "2018-02-10"
    },
    {
      "value": 315,
      "day": "2015-09-06"
    },
    {
      "value": 154,
      "day": "2016-05-24"
    },
    {
      "value": 243,
      "day": "2018-01-31"
    },
    {
      "value": 91,
      "day": "2016-08-20"
    },
    {
      "value": 344,
      "day": "2015-09-09"
    },
    {
      "value": 18,
      "day": "2015-05-07"
    },
    {
      "value": 219,
      "day": "2016-04-19"
    },
    {
      "value": 162,
      "day": "2016-07-28"
    },
    {
      "value": 259,
      "day": "2015-06-12"
    },
    {
      "value": 396,
      "day": "2016-07-18"
    },
    {
      "value": 380,
      "day": "2015-09-22"
    },
    {
      "value": 19,
      "day": "2017-07-17"
    },
    {
      "value": 227,
      "day": "2015-05-05"
    },
    {
      "value": 235,
      "day": "2016-10-06"
    },
    {
      "value": 130,
      "day": "2015-04-24"
    },
    {
      "value": 338,
      "day": "2017-07-12"
    },
    {
      "value": 208,
      "day": "2017-12-01"
    },
    {
      "value": 294,
      "day": "2018-03-21"
    },
    {
      "value": 83,
      "day": "2015-11-27"
    },
    {
      "value": 337,
      "day": "2016-07-27"
    },
    {
      "value": 357,
      "day": "2017-08-06"
    },
    {
      "value": 331,
      "day": "2015-06-08"
    },
    {
      "value": 295,
      "day": "2016-11-03"
    },
    {
      "value": 68,
      "day": "2016-06-12"
    },
    {
      "value": 17,
      "day": "2016-09-28"
    },
    {
      "value": 223,
      "day": "2017-04-07"
    },
    {
      "value": 352,
      "day": "2015-06-20"
    },
    {
      "value": 136,
      "day": "2016-09-13"
    },
    {
      "value": 288,
      "day": "2015-10-11"
    },
    {
      "value": 106,
      "day": "2017-11-10"
    },
    {
      "value": 146,
      "day": "2016-05-30"
    },
    {
      "value": 326,
      "day": "2017-05-15"
    },
    {
      "value": 324,
      "day": "2016-01-25"
    },
    {
      "value": 266,
      "day": "2017-05-13"
    },
    {
      "value": 367,
      "day": "2015-05-23"
    },
    {
      "value": 36,
      "day": "2016-11-27"
    },
    {
      "value": 96,
      "day": "2018-04-09"
    },
    {
      "value": 67,
      "day": "2017-06-01"
    },
    {
      "value": 99,
      "day": "2015-09-13"
    },
    {
      "value": 70,
      "day": "2016-11-30"
    },
    {
      "value": 184,
      "day": "2016-11-06"
    },
    {
      "value": 22,
      "day": "2015-09-11"
    },
    {
      "value": 33,
      "day": "2017-04-16"
    },
    {
      "value": 142,
      "day": "2018-07-11"
    },
    {
      "value": 3,
      "day": "2015-06-13"
    },
    {
      "value": 189,
      "day": "2017-03-29"
    },
    {
      "value": 256,
      "day": "2018-04-25"
    },
    {
      "value": 370,
      "day": "2017-09-01"
    },
    {
      "value": 1,
      "day": "2018-01-04"
    },
    {
      "value": 354,
      "day": "2015-10-17"
    },
    {
      "value": 365,
      "day": "2018-08-06"
    },
    {
      "value": 155,
      "day": "2015-07-20"
    },
    {
      "value": 49,
      "day": "2016-09-11"
    },
    {
      "value": 321,
      "day": "2018-05-17"
    },
    {
      "value": 152,
      "day": "2017-03-11"
    },
    {
      "value": 219,
      "day": "2018-05-08"
    },
    {
      "value": 367,
      "day": "2018-04-03"
    },
    {
      "value": 323,
      "day": "2018-04-29"
    },
    {
      "value": 347,
      "day": "2017-06-18"
    },
    {
      "value": 275,
      "day": "2017-04-30"
    },
    {
      "value": 86,
      "day": "2016-04-24"
    },
    {
      "value": 32,
      "day": "2016-08-01"
    },
    {
      "value": 79,
      "day": "2015-10-13"
    },
    {
      "value": 227,
      "day": "2015-05-11"
    },
    {
      "value": 27,
      "day": "2017-03-01"
    },
    {
      "value": 289,
      "day": "2018-02-03"
    },
    {
      "value": 127,
      "day": "2018-04-01"
    },
    {
      "value": 314,
      "day": "2015-09-02"
    },
    {
      "value": 386,
      "day": "2017-12-15"
    },
    {
      "value": 290,
      "day": "2016-02-29"
    },
    {
      "value": 171,
      "day": "2016-07-31"
    },
    {
      "value": 142,
      "day": "2015-05-03"
    },
    {
      "value": 44,
      "day": "2015-08-12"
    },
    {
      "value": 186,
      "day": "2015-05-01"
    },
    {
      "value": 204,
      "day": "2018-01-11"
    },
    {
      "value": 82,
      "day": "2015-05-14"
    },
    {
      "value": 241,
      "day": "2015-05-22"
    },
    {
      "value": 388,
      "day": "2017-09-03"
    },
    {
      "value": 267,
      "day": "2016-05-19"
    },
    {
      "value": 4,
      "day": "2016-02-18"
    },
    {
      "value": 92,
      "day": "2016-02-08"
    },
    {
      "value": 287,
      "day": "2016-06-02"
    },
    {
      "value": 376,
      "day": "2017-09-26"
    },
    {
      "value": 302,
      "day": "2016-06-03"
    },
    {
      "value": 394,
      "day": "2018-01-05"
    },
    {
      "value": 392,
      "day": "2018-06-10"
    },
    {
      "value": 130,
      "day": "2016-12-09"
    },
    {
      "value": 41,
      "day": "2015-12-02"
    },
    {
      "value": 41,
      "day": "2017-07-06"
    },
    {
      "value": 145,
      "day": "2018-03-26"
    },
    {
      "value": 29,
      "day": "2018-06-01"
    },
    {
      "value": 327,
      "day": "2018-03-24"
    },
    {
      "value": 262,
      "day": "2017-08-29"
    },
    {
      "value": 53,
      "day": "2016-05-27"
    },
    {
      "value": 58,
      "day": "2016-09-06"
    },
    {
      "value": 372,
      "day": "2017-11-23"
    },
    {
      "value": 126,
      "day": "2017-08-21"
    },
    {
      "value": 349,
      "day": "2017-05-25"
    },
    {
      "value": 80,
      "day": "2016-11-28"
    },
    {
      "value": 275,
      "day": "2016-08-19"
    },
    {
      "value": 325,
      "day": "2016-07-26"
    },
    {
      "value": 164,
      "day": "2016-07-29"
    },
    {
      "value": 134,
      "day": "2017-07-18"
    },
    {
      "value": 236,
      "day": "2015-10-19"
    },
    {
      "value": 130,
      "day": "2018-03-02"
    },
    {
      "value": 233,
      "day": "2016-05-21"
    },
    {
      "value": 383,
      "day": "2015-10-03"
    },
    {
      "value": 331,
      "day": "2017-05-31"
    },
    {
      "value": 129,
      "day": "2018-03-25"
    },
    {
      "value": 48,
      "day": "2016-11-14"
    },
    {
      "value": 57,
      "day": "2015-11-01"
    },
    {
      "value": 165,
      "day": "2016-11-04"
    },
    {
      "value": 169,
      "day": "2016-12-27"
    },
    {
      "value": 258,
      "day": "2018-01-21"
    },
    {
      "value": 310,
      "day": "2015-05-24"
    },
    {
      "value": 163,
      "day": "2016-05-11"
    },
    {
      "value": 82,
      "day": "2017-11-20"
    },
    {
      "value": 315,
      "day": "2017-02-05"
    },
    {
      "value": 238,
      "day": "2018-06-28"
    },
    {
      "value": 56,
      "day": "2016-08-31"
    },
    {
      "value": 392,
      "day": "2017-10-07"
    },
    {
      "value": 66,
      "day": "2016-03-27"
    },
    {
      "value": 317,
      "day": "2017-09-30"
    },
    {
      "value": 74,
      "day": "2017-09-10"
    },
    {
      "value": 63,
      "day": "2017-07-26"
    },
    {
      "value": 80,
      "day": "2016-08-30"
    },
    {
      "value": 109,
      "day": "2017-02-22"
    },
    {
      "value": 383,
      "day": "2015-12-04"
    },
    {
      "value": 94,
      "day": "2015-08-11"
    },
    {
      "value": 232,
      "day": "2016-11-12"
    },
    {
      "value": 290,
      "day": "2016-07-15"
    },
    {
      "value": 343,
      "day": "2018-04-08"
    },
    {
      "value": 164,
      "day": "2017-05-04"
    },
    {
      "value": 67,
      "day": "2016-04-05"
    },
    {
      "value": 394,
      "day": "2017-12-26"
    },
    {
      "value": 130,
      "day": "2016-08-24"
    },
    {
      "value": 102,
      "day": "2017-01-20"
    },
    {
      "value": 9,
      "day": "2015-08-01"
    },
    {
      "value": 344,
      "day": "2017-05-02"
    },
    {
      "value": 278,
      "day": "2017-02-26"
    },
    {
      "value": 208,
      "day": "2015-12-30"
    },
    {
      "value": 282,
      "day": "2015-11-21"
    },
    {
      "value": 1,
      "day": "2015-07-22"
    },
    {
      "value": 64,
      "day": "2016-02-20"
    },
    {
      "value": 187,
      "day": "2018-02-06"
    },
    {
      "value": 112,
      "day": "2015-04-12"
    },
    {
      "value": 61,
      "day": "2017-11-12"
    },
    {
      "value": 10,
      "day": "2016-03-24"
    },
    {
      "value": 360,
      "day": "2017-07-24"
    },
    {
      "value": 396,
      "day": "2017-05-20"
    },
    {
      "value": 387,
      "day": "2017-02-28"
    },
    {
      "value": 354,
      "day": "2017-01-04"
    },
    {
      "value": 254,
      "day": "2017-06-09"
    },
    {
      "value": 15,
      "day": "2017-11-27"
    },
    {
      "value": 251,
      "day": "2018-05-11"
    },
    {
      "value": 184,
      "day": "2016-11-05"
    },
    {
      "value": 156,
      "day": "2017-08-14"
    },
    {
      "value": 226,
      "day": "2018-05-07"
    },
    {
      "value": 258,
      "day": "2015-09-29"
    },
    {
      "value": 301,
      "day": "2015-11-24"
    },
    {
      "value": 170,
      "day": "2018-02-01"
    },
    {
      "value": 51,
      "day": "2015-10-29"
    },
    {
      "value": 189,
      "day": "2016-01-30"
    },
    {
      "value": 131,
      "day": "2018-01-02"
    },
    {
      "value": 156,
      "day": "2016-03-02"
    },
    {
      "value": 93,
      "day": "2018-01-14"
    },
    {
      "value": 213,
      "day": "2017-02-01"
    },
    {
      "value": 114,
      "day": "2017-10-21"
    },
    {
      "value": 94,
      "day": "2018-04-21"
    },
    {
      "value": 210,
      "day": "2015-07-11"
    },
    {
      "value": 400,
      "day": "2016-04-20"
    },
    {
      "value": 45,
      "day": "2018-02-13"
    },
    {
      "value": 199,
      "day": "2018-03-10"
    },
    {
      "value": 333,
      "day": "2016-01-12"
    },
    {
      "value": 362,
      "day": "2015-08-02"
    },
    {
      "value": 315,
      "day": "2017-08-05"
    },
    {
      "value": 67,
      "day": "2018-03-08"
    },
    {
      "value": 153,
      "day": "2018-07-27"
    },
    {
      "value": 376,
      "day": "2018-01-19"
    },
    {
      "value": 126,
      "day": "2018-06-08"
    },
    {
      "value": 187,
      "day": "2015-09-14"
    },
    {
      "value": 335,
      "day": "2016-04-27"
    },
    {
      "value": 197,
      "day": "2016-07-11"
    },
    {
      "value": 151,
      "day": "2016-12-13"
    },
    {
      "value": 18,
      "day": "2018-02-27"
    },
    {
      "value": 84,
      "day": "2016-06-18"
    },
    {
      "value": 215,
      "day": "2015-04-03"
    },
    {
      "value": 380,
      "day": "2018-07-05"
    },
    {
      "value": 146,
      "day": "2015-08-27"
    },
    {
      "value": 255,
      "day": "2015-05-06"
    },
    {
      "value": 384,
      "day": "2016-06-09"
    },
    {
      "value": 335,
      "day": "2015-09-21"
    },
    {
      "value": 318,
      "day": "2017-01-10"
    },
    {
      "value": 69,
      "day": "2015-04-21"
    },
    {
      "value": 397,
      "day": "2015-09-24"
    },
    {
      "value": 80,
      "day": "2016-04-12"
    },
    {
      "value": 333,
      "day": "2018-04-15"
    },
    {
      "value": 218,
      "day": "2016-01-28"
    },
    {
      "value": 218,
      "day": "2015-09-03"
    },
    {
      "value": 213,
      "day": "2015-09-30"
    },
    {
      "value": 73,
      "day": "2016-08-27"
    },
    {
      "value": 69,
      "day": "2017-02-07"
    },
    {
      "value": 141,
      "day": "2016-11-17"
    },
    {
      "value": 95,
      "day": "2016-11-19"
    },
    {
      "value": 286,
      "day": "2017-11-30"
    },
    {
      "value": 361,
      "day": "2016-01-13"
    },
    {
      "value": 187,
      "day": "2016-12-01"
    },
    {
      "value": 88,
      "day": "2016-05-13"
    },
    {
      "value": 150,
      "day": "2016-03-21"
    },
    {
      "value": 350,
      "day": "2018-03-03"
    },
    {
      "value": 324,
      "day": "2017-06-13"
    },
    {
      "value": 266,
      "day": "2015-06-11"
    },
    {
      "value": 390,
      "day": "2017-01-15"
    },
    {
      "value": 37,
      "day": "2017-05-27"
    },
    {
      "value": 248,
      "day": "2016-06-29"
    },
    {
      "value": 162,
      "day": "2017-11-09"
    },
    {
      "value": 63,
      "day": "2015-12-20"
    },
    {
      "value": 174,
      "day": "2016-06-07"
    },
    {
      "value": 188,
      "day": "2016-12-15"
    },
    {
      "value": 117,
      "day": "2016-04-07"
    },
    {
      "value": 141,
      "day": "2017-07-14"
    },
    {
      "value": 301,
      "day": "2016-11-13"
    },
    {
      "value": 245,
      "day": "2016-07-20"
    },
    {
      "value": 83,
      "day": "2015-06-04"
    },
    {
      "value": 86,
      "day": "2016-11-15"
    },
    {
      "value": 158,
      "day": "2015-07-29"
    },
    {
      "value": 68,
      "day": "2018-06-14"
    },
    {
      "value": 227,
      "day": "2017-10-26"
    },
    {
      "value": 22,
      "day": "2018-06-04"
    },
    {
      "value": 244,
      "day": "2016-02-23"
    },
    {
      "value": 185,
      "day": "2018-06-13"
    },
    {
      "value": 10,
      "day": "2018-05-10"
    },
    {
      "value": 216,
      "day": "2017-02-11"
    },
    {
      "value": 389,
      "day": "2017-02-03"
    },
    {
      "value": 345,
      "day": "2016-02-19"
    },
    {
      "value": 362,
      "day": "2015-11-02"
    },
    {
      "value": 283,
      "day": "2017-12-28"
    },
    {
      "value": 359,
      "day": "2018-08-09"
    },
    {
      "value": 69,
      "day": "2015-07-24"
    },
    {
      "value": 130,
      "day": "2018-08-08"
    },
    {
      "value": 393,
      "day": "2016-09-24"
    },
    {
      "value": 378,
      "day": "2017-12-08"
    },
    {
      "value": 295,
      "day": "2015-11-22"
    },
    {
      "value": 324,
      "day": "2016-01-09"
    },
    {
      "value": 183,
      "day": "2016-02-25"
    },
    {
      "value": 215,
      "day": "2017-02-16"
    },
    {
      "value": 156,
      "day": "2015-04-19"
    },
    {
      "value": 222,
      "day": "2016-05-26"
    },
    {
      "value": 29,
      "day": "2015-08-04"
    },
    {
      "value": 297,
      "day": "2017-12-12"
    },
    {
      "value": 397,
      "day": "2016-08-23"
    },
    {
      "value": 260,
      "day": "2015-09-04"
    },
    {
      "value": 117,
      "day": "2015-06-23"
    },
    {
      "value": 44,
      "day": "2018-02-21"
    },
    {
      "value": 43,
      "day": "2017-11-29"
    },
    {
      "value": 117,
      "day": "2017-11-02"
    },
    {
      "value": 242,
      "day": "2017-04-21"
    },
    {
      "value": 92,
      "day": "2018-02-17"
    },
    {
      "value": 356,
      "day": "2018-05-29"
    },
    {
      "value": 394,
      "day": "2017-09-09"
    },
    {
      "value": 313,
      "day": "2015-11-14"
    },
    {
      "value": 240,
      "day": "2017-03-17"
    },
    {
      "value": 176,
      "day": "2015-09-12"
    },
    {
      "value": 278,
      "day": "2016-05-06"
    },
    {
      "value": 306,
      "day": "2017-03-02"
    },
    {
      "value": 178,
      "day": "2017-12-04"
    },
    {
      "value": 274,
      "day": "2015-05-02"
    },
    {
      "value": 247,
      "day": "2017-11-24"
    },
    {
      "value": 72,
      "day": "2016-09-15"
    },
    {
      "value": 129,
      "day": "2018-03-29"
    },
    {
      "value": 251,
      "day": "2016-10-05"
    },
    {
      "value": 171,
      "day": "2016-06-10"
    },
    {
      "value": 58,
      "day": "2018-06-11"
    },
    {
      "value": 267,
      "day": "2015-12-17"
    },
    {
      "value": 394,
      "day": "2016-01-19"
    },
    {
      "value": 360,
      "day": "2016-08-05"
    },
    {
      "value": 123,
      "day": "2017-04-09"
    },
    {
      "value": 71,
      "day": "2018-08-04"
    },
    {
      "value": 353,
      "day": "2016-04-16"
    },
    {
      "value": 65,
      "day": "2018-07-12"
    },
    {
      "value": 176,
      "day": "2015-12-28"
    },
    {
      "value": 266,
      "day": "2015-08-25"
    },
    {
      "value": 286,
      "day": "2015-10-05"
    },
    {
      "value": 164,
      "day": "2016-08-12"
    },
    {
      "value": 270,
      "day": "2018-05-20"
    },
    {
      "value": 78,
      "day": "2018-06-25"
    },
    {
      "value": 301,
      "day": "2017-10-02"
    },
    {
      "value": 242,
      "day": "2017-07-01"
    },
    {
      "value": 106,
      "day": "2016-01-24"
    },
    {
      "value": 254,
      "day": "2018-04-24"
    },
    {
      "value": 66,
      "day": "2016-12-12"
    },
    {
      "value": 6,
      "day": "2017-06-20"
    },
    {
      "value": 23,
      "day": "2015-10-06"
    },
    {
      "value": 308,
      "day": "2017-10-05"
    },
    {
      "value": 208,
      "day": "2018-03-16"
    }
  ]

  /*
  styling  
  */
  //base button class
  const button = 'text-xxs px-2 py-1 rounded-md border flex place-items-center place-content-center gap-1 cursor-pointer hover:bg-black hover:text-white'
  // blue call to acton button
  const actionButton = 'text-xxs px-2 py-1 rounded-md border flex place-items-center place-content-center gap-1 cursor-pointer hover:bg-black hover:text-white bg-majic-blue'
  // When call to action is selected
  const actionButtonActive = 'text-xxs px-2 py-1 rounded-md border flex place-items-center place-content-center gap-1 cursor-pointer hover:bg-black hover:text-white bg-black text-white'
  //toggle button selected
  const selBtn = 'bg-black text-white'
  //toggle button unselected
  const undBtn = 'bg-white text-black border-black'

  //Table formatting
  const tbl_Label = "px-2 py-2 bg-majic-white flex place-items-center place-content-center font-bold border border-majic-grey"
  const tbl_axis = "px-2 py-2 border text-center border-majic-grey"
  const tbl_cell = "px-2 py-2 border text-center border-majic-grey"

  /*
  * Handle Views
  */

  const toggleDataView = () => {
    setDataVisible(!dataVisible)
    setSideViewActive(false)
  }

  const toggleSideView = () => {
    setSideViewActive(!sideViewActive)
  }

  const toggleIsEditing = () => {
    setIsEditing(!isEditing)
  }



  const change_data_editing_view = ( arg ) => {
    if(arg === "humanView"){
      setDataEditView("humanView")
    }else if(arg === "jsonView"){
      setDataEditView("jsonView")
    }else if(arg === "sheetView"){
      setDataEditView("sheetView")
    }else if(arg === "majicView"){
      setDataEditView("majicView")
    }
  }
  
  /*
    * data management
   */

  const handleDataChange = (event) => {
    setLiveData(JSON.parse(event.target.value))
  }  

  const handleSaveData = () => {
    if(checkJSONValidity(liveData)){
      setActiveData(liveData)
    }else{
      alert("error in json object")
    }
  }

  const checkJSONValidity = (jsonData) => {
    try{
      JSON.parse(jsonData);
      return { isValid: true, error: null };
    } catch(error) {
      const errorMessage = error.message
      
      let position
      const match = errorMessage.match(/position (\d+)/);
      
      if (match) {
        position = parseInt(match[1], 10);
      }

      return { isValid: false, error: errorMessage, position: position };
    }
  }

  const triggerAddXY = () =>{
    //add state to show new cells for x and y
    setAddingXY(true)
    //these will be editFields
  }

  const handleXDataAdd = (e) => {
    setTempX(e.target.value)
  }

  const handleYDataAdd = (e) => {
    setTempY(e.target.value)
  }

  const saveAddXY = (key) => {
    //id is the id of the data series being added to
    if(tempX && tempY){
      
      setLiveData(currentLiveData => {
        return currentLiveData.map((item, index)=> {
          if(index === key){
            return {
              ...item,
              data: [...item.data, {x: tempX, y: parseInt(tempY, 10)}]
            };
          }
          return item;
        })
      })
      setTempX('');
      setTempY('');
      setAddingXY()
    }
  }

  /* Manipulating Data */
  const saveValues = (key, newVal, type, dataIndex=null) => {
    const updatedData = liveData.map((item, index) => {
      if (index === key) {
        if (type === 'id') {
          return { ...item, id: newVal };
        } else if (type === 'x' || type === 'y') {
          return { 
            ...item, 
            data: item.data.map((dataPoint, idx) => {
              if (idx === dataIndex) {
                return { ...dataPoint, [type]: newVal };
              }
              return dataPoint;
            })
          };
        }
      }
      return item;
    });
    setLiveData(updatedData)
  }



  useEffect(()=> {
    setActiveData(defaultBTCLine)
    setLiveData(defaultBTCLine)
    setXAxis('date')
    setYAxis('price')
  }, [])


  return (
    <div className='w-full max-h-screen bg-white flex flex-col place-content-center place-items-center'>
      {/* Control panel */}
      <div className='absolute top-10 left-10 flex flex-col z-20'>
        <div className='text-xxs font-bold'>Switch Chart Type:</div>
        <div className='flex py-2 gap-2 text-sm'>
          <div onClick={()=>setChart('bar')} className={`${button} ${chart === 'bar' ? selBtn : undBtn}`}><IoBarChartOutline /> Bar</div>
          <div onClick={()=>setChart('line')} className={`${button} ${chart === 'line' ? selBtn : undBtn}`}><IoBarChartOutline /> Line</div>
          <div onClick={()=>setChart('ghTrack')} className={`${button} ${chart === 'ghTrack' ? selBtn : undBtn}`}><IoBarChartOutline /> Calendar Chart</div>
        </div>
        <div className='py-2'>
          <div className={`${dataVisible ? actionButtonActive : actionButton }`} onClick={()=>toggleDataView()}> <BsClipboardData /> Data</div>
        </div>
        <div className='flex py-1 gap-2 text-sm'>
          <div  className={`${button} ${previewOldData? selBtn : undBtn}`} onClick={()=>setPreviewOldData(!previewOldData)}><FaRegEye /> Preview Old Data State</div>
        </div>
        <div className='flex py-1 gap-2 text-sm'>
          <div onClick={()=>setLiveData(activeData)} className={`${button} ${undBtn}`}><LuTimerReset  /> Reset to Old Data State</div>
        </div>
        <div className='flex py-1 gap-2 text-sm'>
          <div onClick={()=>setActiveData(liveData)} className={`${button} ${undBtn}`}><MdOutlineCreateNewFolder /> Replace Old Data With Live Data</div>
        </div>
        { previewOldData &&
          <div className='rounded-md mt-2 px-4 max-w-96 pt-6 bg-majic-blue bg-opacity-20 backdrop-blur-sm'>
            <div className='flex place-content-end' onClick={()=>setPreviewOldData(false)}><GoEyeClosed /></div>
            <pre onClick={()=>toggleIsEditing()}>{JSON.stringify(activeData, null, 2)}</pre>
          </div>
        }

      </div>
      {/*Parent dashboard panel */}
      <div className={sideViewActive ? 'flex w-full h-screen place-items-center place-content-center': "w-screen h-screen"}>
        {/* Chart panel */}
        <div className={dataVisible ? 'w-screen z-0' : 'w-full h-screen flex flex-col place-items-center place-content-center'}>
          <div className={sideViewActive ? `w-3/4 h-full`:`px-20 `}>
            <div className='min-w-[800px] min-h-[600px] h-4/6 p-20 p-10 bg-majic-white shadow-xl rounded-lg text-center'>
                <div className='text-xs font-bold'>Chart Heading</div>
                {
                  chart && chart === "bar" 
                    &&             
                      <ResponsiveBar
                        data={defaultBarData}
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
                {
                  chart && chart === "line"
                    && <ResponsiveLine
                          data={liveData}
                          margin={{ top: 50, right: 110, bottom: 40, left: 60 }}
                          xScale={{ type: 'point' }}
                          yScale={{
                              type: 'linear',
                              min: 'auto',
                              max: 'auto',
                              stacked: true,
                              reverse: false
                          }}
                          yFormat=" >-.2f"
                          axisTop={null}
                          axisRight={null}
                          axisBottom={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: xAxis,
                              legendOffset: 36,
                              legendPosition: 'middle'
                          }}
                          axisLeft={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: yAxis,
                              legendOffset: -40,
                              legendPosition: 'middle'
                          }}
                          /*Curvature */
                          curve="cardinal"
                          /*Color Scheme */
                          colors={{scheme: "pastel1"}}
                          /*Line thickness */
                          lineWidth={'4px'}
                          /*Grid */
                          enableGridX={false}
                          enableGridY={false}
                          /* points */
                          enablePoints={false}
                          pointSize={0}
                          pointColor={{ theme: 'background' }}
                          pointBorderWidth={2}
                          pointBorderColor={{ from: 'serieColor' }}
                          pointLabelYOffset={-12}
                          useMesh={true}
                          /*legend formatting */
                          legends={[
                              {
                                  anchor: 'bottom-right',
                                  direction: 'column',
                                  justify: false,
                                  translateX: 100,
                                  translateY: 0,
                                  itemsSpacing: 0,
                                  itemDirection: 'left-to-right',
                                  itemWidth: 80,
                                  itemHeight: 20,
                                  itemOpacity: 0.75,
                                  symbolSize: 12,
                                  symbolShape: 'circle',
                                  symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                  effects: [
                                      {
                                          on: 'hover',
                                          style: {
                                              itemBackground: 'rgba(0, 0, 0, .03)',
                                              itemOpacity: 1
                                          }
                                      }
                                  ]
                              }
                          ]}
                        />
                }

                {
                  chart && chart === "line2"
                    && <ResponsiveLine
                          data={defaultBTCLine}
                          margin={{ top: 50, right: 110, bottom: 40, left: 60 }}
                          xScale={{ type: 'point' }}
                          yScale={{
                              type: 'linear',
                              min: 'auto',
                              max: 'auto',
                              stacked: true,
                              reverse: false
                          }}
                          yFormat=" >-.2f"
                          axisTop={null}
                          axisRight={null}
                          axisBottom={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: 'transportation',
                              legendOffset: 36,
                              legendPosition: 'middle'
                          }}
                          axisLeft={{
                              tickSize: 5,
                              tickPadding: 5,
                              tickRotation: 0,
                              legend: 'count',
                              legendOffset: -40,
                              legendPosition: 'middle'
                          }}
                          /*Curvature */
                          curve="cardinal"
                          /*Color Scheme */
                          colors={{scheme: "pastel1"}}
                          /*Line thickness */
                          lineWidth={'6px'}
                          /*Grid */
                          enableGridX={false}
                          enableGridY={false}
                          /* points */
                          enablePoints={false}
                          pointSize={0}
                          pointColor={{ theme: 'background' }}
                          pointBorderWidth={2}
                          pointBorderColor={{ from: 'serieColor' }}
                          pointLabelYOffset={-12}
                          useMesh={true}
                          /*legend formatting */
                          legends={[
                              {
                                  anchor: 'bottom-right',
                                  direction: 'column',
                                  justify: false,
                                  translateX: 100,
                                  translateY: 0,
                                  itemsSpacing: 0,
                                  itemDirection: 'left-to-right',
                                  itemWidth: 80,
                                  itemHeight: 20,
                                  itemOpacity: 0.75,
                                  symbolSize: 12,
                                  symbolShape: 'circle',
                                  symbolBorderColor: 'rgba(0, 0, 0, .5)',
                                  effects: [
                                      {
                                          on: 'hover',
                                          style: {
                                              itemBackground: 'rgba(0, 0, 0, .03)',
                                              itemOpacity: 1
                                          }
                                      }
                                  ]
                              }
                          ]}
                        />
                }
                {
                  chart && chart === "ghTrack"
                    && <ResponsiveCalendar
                    data={defaultGhData}
                    from="2015-03-01"
                    to="2016-07-12"
                    emptyColor="#eeeeee"
                    colors={[ '#61cdbb', '#97e3d5', '#e8c1a0', '#f47560' ]}
                    margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
                    yearSpacing={40}
                    monthBorderColor="#ffffff"
                    dayBorderWidth={2}
                    dayBorderColor="#ffffff"
                    legends={[
                        {
                            anchor: 'bottom-right',
                            direction: 'row',
                            translateY: 36,
                            itemCount: 4,
                            itemWidth: 42,
                            itemHeight: 36,
                            itemsSpacing: 14,
                            itemDirection: 'right-to-left'
                        }
                    ]}
                />

                }            
            </div>
          </div>
        </div>
        {/* Data editing panel */}
        <div className={`${dataVisible ? 'text-xxs absolute right-0 top-0 h-screen flex-col place-items-center place-content-center border-l-0 border-majic-blue bg-white bg-opacity-75 backdrop-blur-sm' : 'hidden'} ${sideViewActive ? "w-1/4": "w-1/2 z-10"}`}>
          <div className='flex flex-col p-6 pt-4 h-full w-full'>
            <div className='py-2 flex'>
              <div className={`${sideViewActive ? actionButtonActive: actionButton }`} onClick={toggleSideView}>
                  {sideViewActive ? 'Exit side-by-side view' : 'View chart side-by-side'}
              </div>
            </div>
            <div className='flex gap-1'>
              <div className={`${button} ${dataEditView === "humanView" ? selBtn : undBtn }`} onClick={()=>change_data_editing_view("humanView")}><PiFinnTheHumanFill /> Human Friendly View </div>
              <div className={`${button} ${dataEditView === "jsonView" ? selBtn : undBtn }`} onClick={()=>change_data_editing_view("jsonView")}><VscJson /> JSON</div>
              <div className={`${button} ${dataEditView === "sheetView" ? selBtn : undBtn }`} onClick={()=>change_data_editing_view("sheetView")}><CiViewTable /> Spreadsheet</div>
              <div className={`${button} ${dataEditView === "majicView" ? selBtn : undBtn }`} onClick={()=>change_data_editing_view("majicView")}><SlMagicWand /> Majic</div>
            </div>
            {
              /* humanView */
              dataEditView === "humanView" && 
                <div className='flex flex-col gap-2 py-10 px-10'>
                  <div className=''>Human Friendly View</div>
                  <div className=''><span className='bg-majic-accent text-white px-1 pt-1'>Click</span> any value to change.</div>                  
                  <div className='font-bold pt-2 text-sm'>Your Data</div>
                  <div className='flex flex-wrap gap-4'>
                    <div className='flex gap-2'><div>x-axis: </div><div className='font-black'>{xAxis}</div></div>
                    <div className='flex gap-2'><div>y-axis: </div> <div className='font-black'>{yAxis}</div></div>
                  </div>
                  <div className='flex'>
                    <div className={button + " "+ undBtn} onClick={()=>setHorizontalTable(!horizontalTable)}>{ horizontalTable ? 'Vertical' : 'Horizontal'} </div>
                  </div>
                  {/*Data table container */}
                  <div className='px-4 py-5'>
                    { horizontalTable ? 
                        <div>
                          {liveData.map((item, key) => (
                            <React.Fragment>
                              <div key={key} className='w-fit'>
                                <div className='grid grid-flow-col grid-rows-2 auto-cols-auto'>
                                  <div className={tbl_Label + " row-span-2"}><EditField val={item.id} keyval={key} saveVal={saveValues} type={'id'}/></div>
                                  <div className={tbl_axis}>{xAxis}</div>
                                  <div className={tbl_axis}>{yAxis}</div>
                                  {item.data.map((dataPoint, index) => (
                                    (index+1) === item.data.length ?
                                      <React.Fragment key={index}>
                                        <div className={tbl_cell}>
                                          <EditField val={dataPoint.x} keyval={key} saveVal={saveValues} type={'x'} dataIndex={index}/>
                                          </div>
                                        <div className={tbl_cell}>
                                          <EditField val={dataPoint.y} keyval={key} saveVal={saveValues} type={'y'} dataIndex={index}/></div>
                                        {
                                          addingXY 
                                            ? <>
                                                <div key={index + 1} className='flex flex-col place-items-center px-1 row-span-2 border border-majic-blue mx-2'>
                                                  <div className='text-center'><textarea placeholder={`new ${xAxis}`} className='max-w-12' style={{resize: 'none'}} onChange={handleXDataAdd}/></div>
                                                  <div className='text-center'><textarea placeholder={`new ${yAxis}`} className='max-w-12' style={{resize: 'none'}} onChange={handleYDataAdd}/></div>
                                                </div>
                                                <div className={`${selBtn} ${button} my-auto`}>+ Multi</div>
                                                <div className={`${actionButton} my-auto ${tempX.length >0 && tempY.length >0 ? '': 'disabled hover:bg-majic-blue hover:text-black'}`} onClick={()=>saveAddXY(key)}>Save</div>
                                              </>
                                            : <div key={index + 1} className='flex place-items-center px-1 bg-majic-blue rounded-r-lg row-span-2' onClick={()=>triggerAddXY()}>
                                                <IoAddCircle />
                                              </div>
                                        }
                                        
                                      </React.Fragment>
                                      : <React.Fragment key={index}>
                                        <div className={tbl_cell}><EditField val={dataPoint.x} keyval={key} saveVal={saveValues} type={'x'} dataIndex={index}/></div>
                                        <div className={tbl_cell}><EditField val={dataPoint.y} keyval={key} saveVal={saveValues} type={'y'} dataIndex={index}/></div>
                                      </React.Fragment>
                                  ))}
                                </div>
                                { (key+1) === liveData.length && 
                                  <div className='flex place-content-center py-1 text-lg text-black'><IoAddCircle /></div>}
                              </div>                              
                             </React.Fragment>
                          ))}
                        </div>
                        :
                        <div className="">
                          {liveData.map((item, key) => (
                            <div key={key} className='grid grid-cols-2 grid-rows-auto'>
                              <div className={tbl_Label + " col-span-2"}>{item.id}</div>
                              <div className={tbl_axis}>{xAxis}</div>
                              <div className={tbl_axis}>{yAxis}</div>
                              {item.data.map((dataPoint, index) => (
                                <React.Fragment key={index}>
                                  <div className={tbl_cell}>{dataPoint.x}</div>
                                  <div className={tbl_cell}>{dataPoint.y}</div>
                                </React.Fragment>
                              ))}
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                  
                  <div>Your Data Preview</div>
                  <div className='bg-majic-white p-4' >
                    <pre onClick={()=>toggleIsEditing()}>{JSON.stringify(liveData, null, 2)}</pre>
                  </div>
                </div>
            }
             
            { /* JSON View */
            dataEditView === "jsonView" &&
              <div className='py-8'>
              {
                isEditing 
                  ? <div >
                      <div className='flex px-2 py-2 gap-1 w-full'>
                        <div className={`${actionButton} p-1 w-1/6`} onClick={()=>handleSaveData()}>Save</div>
                        {isEditing && <div className={`${button} ${undBtn}`} onClick={toggleIsEditing}>Close Edit View</div>}
                        <div className='flex w-5/6 place-content-end pr-5 gap-2'>
                          <div className={`${button}  ${undBtn} p-1`} onClick={()=>toggleDataView()}>Close</div>
                          <div className={`${button}  ${undBtn} p-1`} onClick={()=>setLiveData(activeData)}>Reset Data</div>
                        </div>
                      </div>
                      <textarea value={JSON.stringify(liveData, null, 2)} onChange={handleDataChange}  className='h-dvh w-full'/>
                    </div>
                  : <div >
                      <pre onClick={()=>toggleIsEditing()}>{JSON.stringify(liveData, null, 2)}</pre>
                    </div>
              }
              </div>
            }

            {
              /* humanView */
              ["sheetView", "majicView"].includes(dataEditView) && 
                <div>
                  This is currently under construction.
                  </div>
            }

            
          </div>
        </div>
      </div>
      
      <div className={`${actionButton} mb-20`}>
        Start New Chart
      </div>
    </div>
  )
}

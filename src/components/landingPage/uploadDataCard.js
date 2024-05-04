"use client";

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useMemo, useState } from "react";

import { SiNotion, SiMicrosoftexcel, SiGooglesheets } from "react-icons/si";
import { BsFiletypeXml, BsFiletypeCsv } from "react-icons/bs";
import { VscJson } from "react-icons/vsc";
import { GoHubot } from "react-icons/go";


import { Badge } from "@/components/ui/badge"



export const AnimatedList = React.memo(
  ({
    className,
    children,
    delay = 1000,
  }) => {
    const [index, setIndex] = useState(0);
    const childrenArray = React.Children.toArray(children);

    useEffect(() => {
      const interval = setInterval(() => {
        setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
      }, delay);

      return () => clearInterval(interval);
    }, [childrenArray.length, delay]);

    const itemsToShow = useMemo(
      () => childrenArray.slice(0, index + 1).reverse(),
      [index, childrenArray],
    );

    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  },
);

AnimatedList.displayName = "AnimatedList";

export function AnimatedListItem({ children }) {
  const animations = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}


let notifications = [
  {
    name: "Excel",
    description: "Drop your .xlsx files",
    icon: <SiMicrosoftexcel  className="text-white"/>,
    color: "#00C9A7",
    label: "New"
  },
  {
    name: "CSV",
    description: "import your .csv",
    icon: <BsFiletypeCsv className="text-white"/>,
    color: "#FFB800",
    label: "New"
  },
  {
    name: "Google Sheets",
    description: "Just copy and paste the link",
    icon: <SiGooglesheets  className="text-white"/>,
    color: "#FF3D71",
    label: "New"
  },
  {
    name: "Notion",
    description: "Import directly from your Notion Docs",
    icon: <SiNotion className="text-white"/>,
    color: "#1E86FF",
    label: "New"
  },
  {
    name: "JSON",
    time: "Any JSON data",
    icon: <VscJson className="text-white"/>,
    color: "#00C9A7",
    label: "New"
  },
  {
    name: ".xml",
    description: "Extensible Markup Language (XML)",
    icon: <BsFiletypeXml className="text-white"/>,
    color: "#FFB800",
    label: "Coming"
  },
  {
    name: "WWW",
    description: "Scrape a URL",
    icon: <GoHubot className="text-white"/>,
    color: "#FF3D71",
    label: "Coming"
  },
];

notifications = Array.from({ length: 10 }, () => notifications).flat();

const Notification = ({ name, description, icon, color, label }) => {
  return (
    <figure
      className={cn(
        "relative mx-auto min-h-fit w-full w-[350px] transform cursor-pointer overflow-hidden rounded-lg p-4",
        // animation styles
        "transition-all duration-200 ease-in-out hover:scale-[103%]",
        // light styles
        "bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)]",
        // dark styles
        "transform-gpu dark:bg-transparent dark:backdrop-blur-md dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]",
      )}
    >
      <div className="flex flex-row items-center gap-3 w-full">
        <div
          className="flex h-10 w-12 items-center justify-center rounded-2xl"
          style={{
            backgroundColor: color,
          }}
        >
          <span className="text-lg">{icon}</span>
        </div>
        <div className="flex flex-col overflow-hidden w-full">
          <figcaption className="flex whitespace-pre text-lg font-medium dark:text-white w-full">
            <span className="text-sm sm:text-lg">{name}</span>
            {label === "New" 
                ? <div className="place-content-end w-full flex"><Badge className="bg-green-600"> {label} </Badge></div>
                : <div className="place-content-end w-full flex"><Badge className="bg-orange-500"> {label} </Badge></div>
            }
          </figcaption>
          <p className="text-sm text-left font-normal dark:text-white/60">
            {description}
          </p>
        </div>
      </div>
    </figure>
  );
};

export function UploadDataCard() {
  return (
    <div className="relative flex h-full max-h-[500px] min-h-[500px] w-full max-w-[32rem] transform-gpu flex-col justify-between overflow-hidden rounded-lg border bg-white [box-shadow:0_0_0_1px_rgba(0,0,0,.03),0_2px_4px_rgba(0,0,0,.05),0_12px_24px_rgba(0,0,0,.05)] dark:bg-black dark:[border:1px_solid_rgba(255,255,255,.1)] dark:[box-shadow:0_-20px_80px_-20px_#ffffff1f_inset]">
      <div className="flex items-center justify-center overflow-hidden">
        <AnimatedList>
          {notifications.map((item, idx) => (
            <Notification {...item} key={idx} />
          ))}
        </AnimatedList>
      </div>
      <div className="flex flex-col items-start gap-y-1 border-t p-4 dark:border-neutral-800">
        <h2 className="text-xl font-semibold">Drop Your Spreadsheet.</h2>
        <p className="text-left text-base font-normal text-neutral-500 dark:text-neutral-400">
            Drag that data into our beautiful upload box for us to instant graph-ify it.
            If you don't have one, you can make it here too.  We made it simple.
        </p>
      </div>
    </div>
  );
}

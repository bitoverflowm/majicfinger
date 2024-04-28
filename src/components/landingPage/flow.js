"use client";

import { IoCheckmarkSharp, IoWarningOutline  } from "react-icons/io5";
import { BsFiletypeCsv } from "react-icons/bs";
import { SiMicrosoftexcel, SiQuickbooks } from "react-icons/si";
import { FaGoogleDrive, FaTwitter, FaInstagram, FaEthereum, FaBtc, FaYoutube } from "react-icons/fa";



import { cn } from "@/lib/utils";
import { AnimatedBeam } from "@/components/magicui/animated-beam";
import React, { forwardRef, useRef } from "react";
import Image from "next/image";

const Circle = forwardRef(({ className, children }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-border bg-white p-3 shadow-[0_0_20px_-12px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      {children}
    </div>
  );
});

export function Flow() {
  const containerRef = useRef(null);
  const div1Ref = useRef(null);
  const div2Ref = useRef(null);
  const div3Ref = useRef(null);
  const div4Ref = useRef(null);
  const div5Ref = useRef(null);
  const div6Ref = useRef(null);
  const div7Ref = useRef(null);
  const div8Ref = useRef(null);
  const div9Ref = useRef(null);
  const div10Ref = useRef(null);
  const div11Ref = useRef(null);
  const div12Ref = useRef(null);
  const div13Ref = useRef(null);
  const div14Ref = useRef(null);
  const div15Ref = useRef(null);
  const div16Ref = useRef(null);
  const div17Ref = useRef(null);
  const div18Ref = useRef(null);
  const div19Ref = useRef(null);

  return (
    <div
      className="relative flex h-full w-full max-w-[84rem] items-center justify-center overflow-hidden rounded-lg border bg-background p-10 md:shadow-xl"
      ref={containerRef}
    >
      <div className="flex h-full w-full flex-row items-stretch justify-between gap-10">
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div1Ref}>
            <BsFiletypeCsv className="h-6 w-6 text-slate-700" />
          </Circle>
          <Circle ref={div2Ref}>
            <SiMicrosoftexcel  className="h-6 w-6 text-green-700" />
          </Circle>
          <Circle ref={div3Ref}>
            <FaGoogleDrive className="h-6 w-6 text-green-600" />
          </Circle>          
          <Circle ref={div4Ref}>
            <FaTwitter  className="h-6 w-6 text-blue-400" />
          </Circle>
          <Circle ref={div5Ref}>
            <FaInstagram className="h-6 w-6 text-purple-600" />
          </Circle>
          <Circle ref={div6Ref}>
            <SiQuickbooks className="h-6 w-6 text-green-600" />
          </Circle>
          <Circle ref={div7Ref}>
            <FaEthereum className="h-6 w-6 text-indigo-600" />
          </Circle>
          <Circle ref={div8Ref}>
            <FaBtc className=" h-6 w-6 text-orange-400" />
          </Circle>
          <Circle ref={div9Ref}>
            <FaYoutube className="h-6 w-6 text-red-400" />
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div10Ref} className="w-32 h-30">
            <Image src={'/fruit.png'} width="30" height="30"/>
          </Circle>
        </div>
        <div className="flex flex-col justify-center gap-10">
          <Circle ref={div11Ref} className="w-20 h-8">
            Operate
          </Circle>
          <Circle ref={div12Ref} className="w-20 h-8">
            Visualize
          </Circle>
          <Circle ref={div13Ref} className="w-20 h-8">
            LycheeAI
          </Circle>
          <Circle ref={div14Ref} className="w-20 h-8">
            Query
          </Circle>
        </div>
        <div className="flex flex-col justify-center">
          <Circle ref={div15Ref} className="w-32 h-30">
            Create Your Custom Dashboard
          </Circle>
        </div>
        <div className="flex flex-col justify-center gap-2">
          <Circle ref={div16Ref} className="w-15">
            Present
          </Circle>
          <Circle ref={div17Ref} className="w-15">
            Share 
          </Circle>
          <Circle ref={div18Ref} className="w-15">
            Export
          </Circle>
          <Circle ref={div19Ref} className="w-15">
            Host
          </Circle>
        </div>
      </div>

      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div1Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div2Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div3Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div4Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div5Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div6Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div7Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div8Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div9Ref}
        toRef={div10Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div10Ref}
        toRef={div11Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div10Ref}
        toRef={div12Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div10Ref}
        toRef={div13Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div10Ref}
        toRef={div14Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div11Ref}
        toRef={div15Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div12Ref}
        toRef={div15Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div13Ref}
        toRef={div15Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div14Ref}
        toRef={div15Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div15Ref}
        toRef={div16Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div15Ref}
        toRef={div17Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div15Ref}
        toRef={div18Ref}
      />
      <AnimatedBeam
        containerRef={containerRef}
        fromRef={div15Ref}
        toRef={div19Ref}
      />
    </div>
  );
}

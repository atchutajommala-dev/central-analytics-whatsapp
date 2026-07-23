"use client";

import React from "react";
import Image from "next/image";

interface PWLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export default function PWLogo({
  size = "md",
  className = "",
}: PWLogoProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
    xl: "w-24 h-24",
  };

  const imagePx = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 96,
  };

  const px = imagePx[size] || 40;

  return (
    <div className={`relative shrink-0 rounded-2xl overflow-hidden border-2 border-[#f06a55] shadow-lg shadow-[#f06a55]/25 group transform transition-transform duration-300 hover:scale-105 bg-slate-950 select-none ${sizeClasses[size]} ${className}`}>
      <Image
        src="/pw_cat_logo.png"
        alt="Physics Wallah Logo"
        width={px}
        height={px}
        className="object-cover w-full h-full"
        priority
      />
    </div>
  );
}

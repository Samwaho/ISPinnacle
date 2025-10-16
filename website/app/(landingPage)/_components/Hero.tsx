"use client";
import { ThreeDMarquee } from "@/components/ui/3d-marquee";
import { useMemo } from "react";
import { motion } from "motion/react";
import Link from "next/link";

const BASE_IMAGES = [
  "/1.png", "/2.png", "/3.png", "/4.png", "/5.png", "/6.png",
  "/7.png", "/8.png", "/9.png", "/10.png", "/11.png", "/12.png"
];

export function Hero() {
  // Create a stable random arrangement using useMemo
  const randomImages = useMemo(() => {
    const repeated = [...BASE_IMAGES, ...BASE_IMAGES, ...BASE_IMAGES];
    // Use a seeded random arrangement
    const arranged = repeated.map((item, index) => ({
      item,
      sort: Math.sin(index) // Using sin for deterministic "random" values
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
    
    return arranged;
  }, []); // Empty dependency array ensures this only runs once

  return (
    <div className="flex min-h-screen w-full flex-col items-center">
      <div className="relative flex flex-1 w-full flex-col items-center overflow-hidden">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="flex flex-1 w-full flex-col items-center justify-center px-4 relative z-20"
        >
          {/* Main content container */}
          <div className="relative mx-auto max-w-4xl rounded-2xl glass-effect p-8 md:p-12">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="text-center text-3xl font-bold text-balance md:text-5xl lg:text-7xl"
            >
              Streamline Your ISP Operations with{" "}
              <span className="inline-block text-gradient-custom font-extrabold">
                Smart Management
              </span>
            </motion.h2>

            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-center  text-lg mt-6 max-w-2xl mx-auto"
            >
              Manage your ISP business efficiently with our comprehensive platform. 
              From customer management to billing, we&apos;ve got everything you need to 
              grow your business.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.8 }}
              className="flex flex-wrap items-center justify-center gap-4 mt-8"
            >
              <Link href="/organization" className="rounded-xl bg-gradient-custom px-8 py-4 text-base font-semibold text-white hover:text-white transition-all duration-300 hover:scale-105 hover:shadow-xl hover:shadow-primary/20 focus:ring-2 focus:ring-primary/50 focus:ring-offset-2 focus:ring-offset-background focus:outline-none">
                Get Started
              </Link>
              <Link href="/pricing" className="rounded-xl glass-effect px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:scale-105 hover:bg-accent hover:shadow-xl focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background focus:outline-none">
                Pricing
              </Link>
            </motion.div>
          </div>
        </motion.div>

        {/* Background elements */}
        <div className="absolute inset-0 z-0">
          <ThreeDMarquee
            className="pointer-events-none absolute inset-0 h-full w-full"
            images={randomImages}
          />
        </div>
      </div>
    </div>
  );
}

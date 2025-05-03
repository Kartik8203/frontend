"use client";

import React from 'react';
import { HeartPulse } from 'lucide-react';

const LoadingScreen = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f2f7ff]">
      <div className="animate-pulse flex flex-col items-center">
        <HeartPulse size={40} className="text-primary mb-4" />
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
          MediPredict
        </h1>
        <div className="mt-6 w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
};

export default LoadingScreen;
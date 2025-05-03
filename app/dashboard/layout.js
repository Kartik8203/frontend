"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import { AuthProvider, useAuth } from "@/components/AuthProvider";

// This component renders the dashboard layout after auth check
function DashboardContent({ children }) {
  const [showSidebar, setShowSidebar] = useState(true);
  const { user, isLoading } = useAuth();


  // User data is now available to pass to Sidebar
  return (
    <div className="flex h-full">
      <Sidebar 
        showSidebar={showSidebar} 
        setShowSidebar={setShowSidebar} 
        userData={user}
      />
      
      <div className="flex flex-col flex-1 overflow-hidden bg-[#f2f7ff]">
        {/* Optional: Add Header component here if needed */}
        <div className="bg-gray-100 dark:bg-[#f2f7ff] flex-1 h-full overflow-auto">
          <main className="flex h-full">{children}</main>
        </div>
      </div>
    </div>
  );
}

// Wrapper with AuthProvider
const DashboardLayout = ({ children }) => {
  return (
    <AuthProvider>
      <DashboardContent>{children}</DashboardContent>
    </AuthProvider>
  );
};

export default DashboardLayout;
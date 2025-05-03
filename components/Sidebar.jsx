"use client";

import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  LayoutGrid,
  ClipboardList,
  BarChart2,
  User,
  Settings,
  Moon,
  SunMedium,
  LogOut,
  MoreVertical,
  HeartPulse
} from "lucide-react";
import { signOut, getCurrentUser, getSessionFromCookie } from "@/lib/auth-service";

export default function Sidebar({ showSidebar = true, setShowSidebar }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  // Fetch user data on component mount
  useEffect(() => {
    async function fetchUserData() {
      try {
        // Get user from both sources to ensure we have data
        const { user, error } = await getCurrentUser();
        console.log("User from getCurrentUser:", user);

        // Also try to get session data as a fallback
        const sessionData = getSessionFromCookie();
        console.log("Session data from cookie:", sessionData);

        if (user && !error) {
          setUserData(user);
        } else if (sessionData && sessionData.user) {
          // Use session data as fallback
          setUserData({
            uid: sessionData.user.id,
            email: sessionData.user.email,
            displayName: sessionData.user.name || sessionData.user.email?.split('@')[0] || null,
            profile_data: {
              full_name: sessionData.user.name,
              role: sessionData.user.role || "User"
            }
          });
        }
      } catch (err) {
        console.error("Error fetching user data:", err);
      }
    }

    fetchUserData();
  }, []);

  // Initialize theme based on system preference or localStorage on component mount
  useEffect(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setIsDarkMode(savedTheme === 'dark');
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    } else {
      // If no saved preference, check system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(systemPrefersDark);
      document.documentElement.classList.toggle('dark', systemPrefersDark);
    }
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const toggleTheme = () => {
    const newTheme = !isDarkMode ? 'dark' : 'light';
    setIsDarkMode(!isDarkMode);

    // Update DOM
    document.documentElement.classList.toggle('dark', !isDarkMode);

    // Save preference
    localStorage.setItem('theme', newTheme);
  };

  // Safely extract user info with fallbacks
  const userName = userData?.displayName || userData?.profile_data?.full_name || userData?.email?.split('@')[0] || "User";
  const userEmail = userData?.email || "";
  const userRole = userData?.profile_data?.role || "User";

  // Use consistent icon size across the entire sidebar
  const iconSize = 20;

  return (
    <aside
      className={`${!showSidebar ? '-translate-x-full lg:translate-x-0' : ''} 
        ${isSidebarCollapsed ? "w-16" : "w-64"} 
        h-screen flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 
        dark:border-zinc-800 transition-all duration-300 relative rounded-lg shadow-sm`}
      id="sidebar"
    >
      <button
        onClick={toggleSidebar}
        className="absolute -right-3 top-4 bg-white dark:bg-zinc-800 border border-zinc-200 
        dark:border-zinc-700 rounded-full p-1 shadow-md z-10 hover:bg-zinc-50 
        dark:hover:bg-zinc-700 transition-colors lg:block hidden"
        aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isSidebarCollapsed ? (
          <ChevronRight size={16} className="text-zinc-600 dark:text-zinc-300" />
        ) : (
          <ChevronLeft size={16} className="text-zinc-600 dark:text-zinc-300" />
        )}
      </button>

      <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center">
        <Link
          href="/dashboard"
          className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-2"}`}
        >
          <HeartPulse size={24} className="text-primary" />
          {!isSidebarCollapsed && (
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              MediPredict
            </h1>
          )}
        </Link>
        {!isSidebarCollapsed && (
          <button
            className="ml-auto text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 
            dark:hover:text-zinc-200 lg:hidden block"
            onClick={() => setShowSidebar(false)}
          >
            <ChevronLeft size={20} />
          </button>
        )}
      </div>

      <nav className={`px-3 mb-2 flex flex-col ${isSidebarCollapsed ? "space-y-3 mt-3" : "space-y-3 mt-3"}`}>
        <SidebarLink
          href="/dashboard"
          icon={<LayoutGrid size={iconSize} />}
          text="Dashboard"
          active={pathname === "/dashboard"}
          collapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/dashboard/records"
          icon={<ClipboardList size={iconSize} />}
          text="Patient Records"
          active={pathname === "/dashboard/records"}
          collapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/dashboard/analytics"
          icon={<BarChart2 size={iconSize} />}
          text="Analytics"
          active={pathname === "/dashboard/analytics"}
          collapsed={isSidebarCollapsed}
        />
        <SidebarLink
          href="/dashboard/settings"
          icon={<Settings size={iconSize} />}
          text="Settings"
          active={pathname === "/dashboard/settings"}
          collapsed={isSidebarCollapsed}
        />
      </nav>

      <div className="mt-auto border-t border-zinc-200 dark:border-zinc-800 p-3">
        <button
          onClick={toggleTheme}
          className={`flex items-center ${isSidebarCollapsed ? "justify-center h-12" : "justify-between w-full"}
            text-sm cursor-pointer p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors mb-2`}
          aria-label="Toggle dark mode"
        >
          {!isSidebarCollapsed && (
            <span className="text-zinc-700 dark:text-zinc-200 font-medium">Theme</span>
          )}
          {isDarkMode ? (
            <Moon size={iconSize} className="text-zinc-600 dark:text-zinc-300" />
          ) : (
            <SunMedium size={iconSize} className="text-zinc-600 dark:text-zinc-300" />
          )}
        </button>

        {/* User profile section */}
        <div className={`mt-4 pt-3 border-t border-zinc-200 dark:border-zinc-800 ${isSidebarCollapsed ? 'text-center' : ''}`}>
          <div className={`flex ${isSidebarCollapsed ? 'flex-col items-center' : 'items-center'}`}>
            <div className="flex-shrink-0">
                <div className="bg-black bg-opacity-90 text-primary rounded-full p-2 flex items-center justify-center h-9 w-9">
                  {userEmail && userEmail.length >= 2 ? (
                    <span className="text-white font-sm text-center">{userEmail[0]}{userEmail[1]}</span>
                  ) : (
                    <span className="text-white font-sm text-center">{userEmail}</span>
                  )}
                </div>

            </div>

            {!isSidebarCollapsed && (
              <>
                <div className="flex-grow-1 ml-3 overflow-hidden">
                  <div className="font-medium text-zinc-800 dark:text-zinc-200 truncate">{userName}</div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{userEmail}</div>
                </div>

                <button
                  onClick={handleLogout}
                  className="ml-auto text-red-500 hover:text-red-600 dark:text-red-400 
                  dark:hover:text-red-300 transition-colors flex-shrink-0"
                  aria-label="Logout"
                >
                  <LogOut size={iconSize} />
                </button>
              </>
            )}
          </div>

          {isSidebarCollapsed && (
            <button
              onClick={handleLogout}
              className="flex justify-center w-full text-sm cursor-pointer p-3 hover:bg-zinc-100 
              dark:hover:bg-zinc-800 rounded-md transition-colors mt-4"
              aria-label="Logout"
            >
              <LogOut size={iconSize} className="text-red-600 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, text, active = false, collapsed = false }) {
  return (
    <Link
      href={href}
      className={`flex items-center ${collapsed ? "justify-center h-12" : "justify-start gap-3"}
        px-3 py-3 rounded-md text-sm font-medium ${active
          ? "bg-zinc-100 dark:bg-zinc-800 text-primary dark:text-primary shadow-sm"
          : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        } relative group transition-colors`}
      aria-current={active ? "page" : undefined}
    >
      <span className={`${active ? "text-primary" : "text-zinc-600 dark:text-zinc-400"}`}>
        {icon}
      </span>
      {!collapsed && <span>{text}</span>}
      {collapsed && (
        <span className="absolute left-full ml-2 whitespace-nowrap bg-zinc-800 text-white text-xs px-2 py-1 
          rounded opacity-0 group-hover:opacity-100 transition-opacity z-10">
          {text}
        </span>
      )}
      {active && (
        <span className="absolute inset-y-0 left-0 w-1 bg-primary rounded-r-full" aria-hidden="true"></span>
      )}
    </Link>
  );
}
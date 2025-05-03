'use client';
import React, { useState } from 'react';
import { useTheme } from "next-themes";
import {
  Bell,
  ChevronDown,
  Search,
  Plus,
  Calendar,
  TrendingUp,
  Twitter,
  Instagram,
  Facebook,
  Linkedin,
  HelpCircle
} from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent, Button } from "@heroui/react";

const Header = () => {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const user = {
    name: 'John Doe',
    role: 'Marketing Manager',
    avatar: 'https://img.freepik.com/free-vector/smiling-young-man-illustration_1308-174669.jpg?semt=ais_hybrid&w=740' // Using placeholder as per requirements
  };

  const notifications = [
    { id: 1, text: 'Trending post about AI generated', time: '2 min ago' },
    { id: 2, text: '3 posts scheduled for today', time: '1 hour ago' },
    { id: 3, text: 'Analytics report is ready', time: '5 hours ago' }
  ];

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (showUserMenu) setShowUserMenu(false);
  };

  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    if (showNotifications) setShowNotifications(false);
  };

  return (
    <header className={`${isDarkMode ? 'bg-gray-900 text-white border-gray-700 m-2'  : 'bg-white text-gray-800 border-gray-200'} border-b px-6 py-3 flex justify-between items-center transition-colors duration-200`}>
      {/* Left side - Search */}
      <div className="flex-grow max-w-md">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <Search size={18} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search trends, posts, analytics..."
            className={`bg-transparent border-none focus:outline-none flex-grow ${isDarkMode ? 'text-white placeholder:text-gray-400' : 'text-gray-800 placeholder:text-gray-500'}`}
          />
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-5">
        {/* Create new post button */}
        <button className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
          <Plus size={16} />
          <span className="text-sm">Create Post</span>
        </button>

        {/* Connected accounts */}
        <div className="hidden md:flex items-center gap-2 border-r border-l px-5">
          <Twitter size={16} className="text-blue-400" />
          <Instagram size={16} className="text-pink-500" />
          <Facebook size={16} className="text-blue-600" />
          <Linkedin size={16} className="text-blue-700" />
        </div>

        {/* Notification bell */}
        <Popover placement="bottom" showArrow={true}>
          <PopoverTrigger>
            <Button className='bg-trnasparent p-0 m-0 gap-0'> <Bell size={20} className={isDarkMode ? 'text-gray-300' : 'text-gray-600'} />
              <span className="relative -top-2 right-0 bg-red-500 text-white text-xs w-4 h-4 flex items-center justify-center rounded-full">3</span></Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="p-3 border-b border-gray-200 dark:border-gray-700">
              <h3 className="font-medium">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {notifications.map(notification => (
                <div key={notification.id} className={`p-3 ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} cursor-pointer border-b border-gray-200 dark:border-gray-700`}>
                  <p className="text-sm mb-1">{notification.text}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{notification.time}</p>
                </div>
              ))}
            </div>
            <div className="p-2 text-center">
              <a href="#" className="text-xs text-purple-600 hover:text-purple-700">View all notifications</a>
            </div>
          </PopoverContent>
        </Popover>
        {/* User menu */}
        <div className="relative">
          <button
            className="flex items-center gap-2"
            onClick={toggleUserMenu}
          >
            <div className="h-8 w-8 rounded-full overflow-hidden bg-gray-200">
              <img src={user.avatar} alt={user.name} className="h-full w-full object-cover" />
            </div>
            <div className="hidden md:block">
              <div className="flex items-center gap-1">
                <span className="font-medium text-sm">{user.name}</span>
                <ChevronDown size={14} />
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">{user.role}</span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
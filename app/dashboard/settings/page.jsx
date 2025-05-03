'use client'

import { useState, useEffect } from 'react'
import { getCurrentUser, signOut } from '@/lib/auth-service'
import { UserIcon, ShieldIcon, Moon, SunMedium } from 'lucide-react'
import { firebase } from '@/lib/firebaseConfig'

const SettingsPage = () => {
    const [activeTab, setActiveTab] = useState('profile')
    const [user, setUser] = useState(null)
    const [loading, setLoading] = useState(true)
    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [message, setMessage] = useState({ type: '', content: '' })
    const [updating, setUpdating] = useState(false)
    const [isDarkMode, setIsDarkMode] = useState(false)

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const { user, error } = await getCurrentUser()
                if (user) {
                    setUser(user)
                    setFullName(user.displayName || '')
                }
            } catch (error) {
                console.error('Error fetching user data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchUserData()
    }, [])

    // Initialize theme based on system preference or localStorage on component mount
    useEffect(() => {
        // Check localStorage first
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            setIsDarkMode(savedTheme === 'dark');
        } else {
            // If no saved preference, check system preference
            const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            setIsDarkMode(systemPrefersDark);
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        setIsDarkMode(!isDarkMode);

        // Update DOM
        document.documentElement.classList.toggle('dark', !isDarkMode);

        // Save preference
        localStorage.setItem('theme', newTheme);
    };

    const handleNameUpdate = async (e) => {
        e.preventDefault()
        setUpdating(true)
        setMessage({ type: '', content: '' })

        try {
            // Update display name in Firebase Auth
            const auth = firebase.auth();
            const currentUser = auth.currentUser;
            
            if (currentUser) {
                await currentUser.updateProfile({
                    displayName: fullName
                });
                
                // Update profile in Firestore
                const db = firebase.firestore();
                const profileRef = db.collection('profiles').doc(currentUser.uid);
                
                await profileRef.update({
                    full_name: fullName
                });
                
                // Update local user state
                setUser({
                    ...user,
                    displayName: fullName
                });
                
                setMessage({ type: 'success', content: 'Name updated successfully!' })
            } else {
                throw new Error('No user is signed in');
            }
        } catch (error) {
            console.error('Error updating name:', error);
            setMessage({ type: 'error', content: error.message || 'Failed to update name' })
        } finally {
            setUpdating(false)
        }
    }

    const handlePasswordUpdate = async (e) => {
        e.preventDefault()
        
        if (password !== confirmPassword) {
            setMessage({ type: 'error', content: 'Passwords do not match' })
            return
        }

        if (password.length < 8) {
            setMessage({ type: 'error', content: 'Password must be at least 8 characters' })
            return
        }

        setUpdating(true)
        setMessage({ type: '', content: '' })

        try {
            const auth = firebase.auth();
            const currentUser = auth.currentUser;
            
            if (currentUser) {
                // Firebase requires recent authentication before updating password
                // You may need to re-authenticate the user in a production app
                await currentUser.updatePassword(password);
                
                setMessage({ type: 'success', content: 'Password updated successfully!' })
                setPassword('')
                setConfirmPassword('')
            } else {
                throw new Error('No user is signed in');
            }
        } catch (error) {
            console.error('Error updating password:', error);
            
            // Handle specific Firebase auth errors
            if (error.code === 'auth/requires-recent-login') {
                setMessage({ 
                    type: 'error', 
                    content: 'For security reasons, please sign out and sign in again before changing your password.' 
                });
            } else {
                setMessage({ type: 'error', content: error.message || 'Failed to update password' });
            }
        } finally {
            setUpdating(false)
        }
    }

    if (loading) {
        return <div className="p-4 w-full flex justify-center items-center h-screen dark:bg-zinc-900 dark:text-white">Loading...</div>
    }

    const getInitial = (name) => {
        return name && name.length > 0 ? name.charAt(0).toUpperCase() : '?'
    }

    return (
        <div className="p-4 w-full mx-auto dark:bg-zinc-900">
            <div className="bg-white dark:bg-zinc-800 rounded-lg shadow-md overflow-hidden border border-zinc-200 dark:border-zinc-700">
                {/* Top Navigation */}
                <div className="flex border-b border-zinc-200 dark:border-zinc-700 sticky top-0 bg-white dark:bg-zinc-800 z-10">
                    <button
                        className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ${
                            activeTab === 'profile' 
                                ? 'text-primary border-b-2 border-primary' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                        onClick={() => setActiveTab('profile')}
                    >
                        <UserIcon size={18} />
                        Profile
                    </button>
                    <button
                        className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ${
                            activeTab === 'security' 
                                ? 'text-primary border-b-2 border-primary' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                        onClick={() => setActiveTab('security')}
                    >
                        <ShieldIcon size={18} />
                        Security
                    </button>
                    <button
                        className={`px-6 py-4 font-medium text-sm flex items-center gap-2 ml-auto mr-4 ${
                            activeTab === 'appearance' 
                                ? 'text-primary border-b-2 border-primary' 
                                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                        }`}
                        onClick={() => setActiveTab('appearance')}
                    >
                        {isDarkMode ? <Moon size={18} /> : <SunMedium size={18} />}
                        Appearance
                    </button>
                </div>

                {/* Message Display */}
                {message.content && (
                    <div className={`p-4 ${
                        message.type === 'error' 
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' 
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                    }`}>
                        {message.content}
                    </div>
                )}

                {/* Profile Section */}
                {activeTab === 'profile' && (
                    <div className="p-6">
                        <div className="flex items-center mb-6">
                            <div className="h-16 w-16 rounded-full bg-black flex items-center justify-center text-white text-xl font-bold mr-4">
                                {getInitial(user?.displayName)}
                            </div>
                            <div>
                                <h3 className="text-lg font-medium dark:text-white">{user?.displayName || 'User'}</h3>
                                <p className="text-zinc-500 dark:text-zinc-400">{user?.email}</p>
                            </div>
                        </div>

                        <form onSubmit={handleNameUpdate}>
                            <div className="mb-4">
                                <label htmlFor="fullName" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    id="fullName"
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm 
                                    focus:outline-none focus:ring-primary focus:border-primary
                                    bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 
                                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
                                focus:ring-offset-white dark:focus:ring-offset-zinc-800 disabled:opacity-50"
                                disabled={updating}
                            >
                                {updating ? 'Updating...' : 'Update Name'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Security Section */}
                {activeTab === 'security' && (
                    <div className="p-6">
                        <h3 className="text-lg font-medium mb-4 dark:text-white">Change Password</h3>
                        <form onSubmit={handlePasswordUpdate}>
                            <div className="mb-4">
                                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    id="password"
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm 
                                    focus:outline-none focus:ring-primary focus:border-primary
                                    bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="mb-4">
                                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    id="confirmPassword"
                                    className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-600 rounded-md shadow-sm 
                                    focus:outline-none focus:ring-primary focus:border-primary
                                    bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                />
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
                                Password must be at least 8 characters long.
                            </div>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 
                                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 
                                focus:ring-offset-white dark:focus:ring-offset-zinc-800 disabled:opacity-50"
                                disabled={updating}
                            >
                                {updating ? 'Updating...' : 'Update Password'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Appearance Section */}
                {activeTab === 'appearance' && (
                    <div className="p-6">
                        <h3 className="text-lg font-medium mb-4 dark:text-white">Theme Settings</h3>
                        <div className="flex flex-col space-y-4">
                            <button
                                onClick={toggleTheme}
                                className="flex items-center justify-between w-full p-4 border border-zinc-200 dark:border-zinc-700 
                                rounded-md hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors group"
                            >
                                <div className="flex items-center gap-3">
                                    {isDarkMode ? (
                                        <Moon size={20} className="text-zinc-600 dark:text-zinc-300" />
                                    ) : (
                                        <SunMedium size={20} className="text-zinc-600 dark:text-zinc-300" />
                                    )}
                                    <span className="font-medium text-zinc-800 dark:text-zinc-200">
                                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                    </span>
                                </div>
                                <div className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none 
                                bg-zinc-200 dark:bg-primary">
                                    <span 
                                        className={`inline-block h-5 w-5 transform rounded-full transition-transform bg-white 
                                        ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </div>
                            </button>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Choose between light and dark mode for the app interface. Your preference will be remembered.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default SettingsPage
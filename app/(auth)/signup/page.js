"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpWithEmail, signInWithGoogle, isAuthenticated } from "@/lib/auth-service";
import { HeartPulse, ArrowRight, Mail, Lock, User, AlertTriangle, Loader2, Check } from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    hasMinLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const { isAuthenticated: isAuth } = await isAuthenticated();
      if (isAuth) {
        const returnUrl = searchParams.get("returnUrl") || "/dashboard";
        router.push(returnUrl);
      }
    };

    checkAuth();
  }, [router, searchParams]);

  // Initialize theme
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    setIsDarkMode(savedTheme === "dark" || (!savedTheme && systemPrefersDark));
    document.documentElement.classList.toggle("dark", savedTheme === "dark" || (!savedTheme && systemPrefersDark));
  }, []);

  // Check password strength
  useEffect(() => {
    const hasMinLength = password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    let score = 0;
    if (hasMinLength) score++;
    if (hasUpperCase) score++;
    if (hasLowerCase) score++;
    if (hasNumber) score++;
    if (hasSpecialChar) score++;
    
    setPasswordStrength({
      score,
      hasMinLength,
      hasUpperCase,
      hasLowerCase,
      hasNumber,
      hasSpecialChar,
    });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please try again.");
      toast.error("Passwords do not match. Please try again.");
      return;
    }

    // Validate password strength
    if (passwordStrength.score < 3) {
      setError("Please choose a stronger password.");
      toast.error("Please choose a stronger password.");
      return;
    }

    // Validate input is not empty
    if (fullName.trim() === "" || email.trim() === "" || password.trim() === "") {
      setError("All fields are required.");
      toast.error("All fields are required.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await signUpWithEmail(email, password, fullName);

      if (error) {
        let errorMessage = "An error occurred during signup. Please try again.";
        
        if (error.code === "auth/email-already-in-use") {
          errorMessage = "This email is already registered. Please use a different email or sign in.";
        } else if (error.code === "auth/invalid-email") {
          errorMessage = "Invalid email address. Please check and try again.";
        } else if (error.code === "auth/weak-password") {
          errorMessage = "Password is too weak. Please choose a stronger password.";
        } else {
          errorMessage = error.message || "An error occurred during signup. Please try again.";
        }
        
        setError(errorMessage);
        toast.error(errorMessage);
      } else {
        toast.success("Account created successfully!");
        // Successful signup - redirect to dashboard or onboarding
        const returnUrl = searchParams.get("returnUrl") || "/dashboard";
        router.push(returnUrl);
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Signup error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setIsLoading(true);

    try {
      const { data, error } = await signInWithGoogle();

      if (error) {
        const errorMessage = error.message || "Failed to sign up with Google. Please try again.";
        setError(errorMessage);
        toast.error(errorMessage);
      } else {
        toast.success("Signed up successfully with Google!");
        const returnUrl = searchParams.get("returnUrl") || "/dashboard";
        router.push(returnUrl);
      }
    } catch (err) {
      const errorMessage = "An unexpected error occurred. Please try again.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Google sign-in error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex flex-col bg-gray-50 dark:bg-zinc-900`}>
      {/* Add Toast Container */}
      <ToastContainer 
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme={isDarkMode ? "dark" : "light"}
      />
      
      <div className="flex-1 flex items-center justify-center p-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex justify-center">
                <HeartPulse size={40} className="text-indigo-500" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">MediPredict</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Create your account to get started
              </p>
            </div>

            {error && (
              <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-start">
                <AlertTriangle className="text-red-500 h-5 w-5 mr-2 mt-0.5" />
                <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                    placeholder="your.email@example.com"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                    placeholder="••••••••"
                  />
                </div>
                
                {/* Password strength indicator */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <div className="flex space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <div 
                          key={i} 
                          className={`h-1 flex-1 rounded-full ${
                            i < passwordStrength.score 
                              ? passwordStrength.score <= 2 
                                ? "bg-red-500" 
                                : passwordStrength.score <= 3 
                                  ? "bg-yellow-500" 
                                  : "bg-green-500"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-xs">
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordStrength.hasMinLength ? "text-green-500" : "text-gray-400"}`}>
                          {passwordStrength.hasMinLength ? <Check size={12} /> : "•"}
                        </span>
                        <span className={passwordStrength.hasMinLength ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          At least 8 characters
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordStrength.hasUpperCase ? "text-green-500" : "text-gray-400"}`}>
                          {passwordStrength.hasUpperCase ? <Check size={12} /> : "•"}
                        </span>
                        <span className={passwordStrength.hasUpperCase ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          Uppercase letter
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordStrength.hasLowerCase ? "text-green-500" : "text-gray-400"}`}>
                          {passwordStrength.hasLowerCase ? <Check size={12} /> : "•"}
                        </span>
                        <span className={passwordStrength.hasLowerCase ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          Lowercase letter
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className={`mr-1 ${passwordStrength.hasNumber ? "text-green-500" : "text-gray-400"}`}>
                          {passwordStrength.hasNumber ? <Check size={12} /> : "•"}
                        </span>
                        <span className={passwordStrength.hasNumber ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          Number
                        </span>
                      </div>
                      <div className="flex items-center col-span-2">
                        <span className={`mr-1 ${passwordStrength.hasSpecialChar ? "text-green-500" : "text-gray-400"}`}>
                          {passwordStrength.hasSpecialChar ? <Check size={12} /> : "•"}
                        </span>
                        <span className={passwordStrength.hasSpecialChar ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}>
                          Special character (!@#$%^&*...)
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mb-6">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-600"
                    placeholder="••••••••"
                  />
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">Passwords do not match</p>
                )}
              </div>

              <div className="mb-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center px-4 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-zinc-800 transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Create Account <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-zinc-800 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-zinc-800 transition-colors"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign up with Google
              </button>
            </div>

            <p className="text-center text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-4 text-xs text-center text-gray-500 dark:text-gray-400">
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>

      <footer className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
        &copy; {new Date().getFullYear()} MediPredict. All rights reserved.
      </footer>
    </div>
  );
}
import "@/styles/globals.css";
import { Link } from "@heroui/link";
import clsx from "clsx";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import { ToastContainer, toast } from 'react-toastify';


export const viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};




export default function RootLayout({
  children,
}) {

  
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body>

        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="h-full w-full">
            {children}
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
              theme="dark"
            />
          </div>
        </Providers>
      </body>
    </html>
  );
}
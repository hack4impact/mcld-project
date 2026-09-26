import type { Metadata } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
   subsets: ["latin"],
   variable: "--font-jakarta",
});

const outfit = Outfit({
   subsets: ["latin"],
   variable: "--font-outfit",
});

export const metadata: Metadata = {
   title: {
      default: "Montréal Centre for Learning Disabilities",
      template: "%s · MCLD",
   },
   description:
      "Programs, private lessons and resources from the Montréal Centre for Learning Disabilities.",
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html
         lang="en"
         className={cn("h-full antialiased", jakarta.variable, outfit.variable)}
         suppressHydrationWarning
      >
         <body className="flex min-h-full flex-col">
            <ThemeProvider
               attribute="class"
               defaultTheme="light"
               forcedTheme="light"
            >
               {children}
            </ThemeProvider>
         </body>
      </html>
   );
}

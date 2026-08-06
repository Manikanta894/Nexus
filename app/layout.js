import './globals.css'
import { Inter, Sora, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/sonner'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' })
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains', display: 'swap' })

export const metadata = {
  title: 'NEXUS — AI Content Command Center',
  description: 'Private, production-grade AI social media & content automation command center.',
  manifest: '/manifest.webmanifest',
}

export const viewport = {
  themeColor: '#09090B',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${sora.variable} ${grotesk.variable} ${jetbrains.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
        <script dangerouslySetInnerHTML={{__html:'if("serviceWorker"in navigator){window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})})}'}} />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Toaster richColors position="top-right" theme="dark" />
      </body>
    </html>
  )
}

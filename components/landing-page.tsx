"use client"

import { Button } from "@/components/ui/button"
import BeamsBackground from "@/components/kokonutui/beams-background"
import { ThemeToggle } from "@/components/theme-toggle"
import { useTheme } from "@/components/theme-provider"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  MessageCircle,
  FileCheck2,
  BadgeCheck,
  Shield,
  Check,
  Linkedin,
  Twitter,
  LogIn,
  UserPlus,
  User as UserIcon,
  LogOut,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Inter'] transition-colors">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <img
                src="/covernow-logo-dark.png"
                alt="CoverNow"
                className="h-40 w-auto dark:hidden block"
              />
              <img
                src="/covernow-logo-light.png"
                alt="CoverNow"
                className="h-40 w-auto dark:block hidden"
              />
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              <a href="/products" className="text-gray-900 dark:text-gray-100 hover:text-[#22C55E] transition-colors">
                Products
              </a>
              <a
                href="#how-it-works"
                className="text-gray-900 dark:text-gray-100 hover:text-[#22C55E] transition-colors"
              >
                How It Works
              </a>
              <a href="#about" className="text-gray-900 dark:text-gray-100 hover:text-[#22C55E] transition-colors">
                About Us
              </a>
            </nav>

            {/* Auth & Theme Toggle */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {user.user_metadata?.first_name} {user.user_metadata?.last_name || user.email}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-gray-900 dark:text-gray-100">
                    <UserIcon className="w-4 h-4 mr-2" />
                    <Link href="/chat">Back to Aria</Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="text-gray-900 dark:text-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="sm" className="text-gray-900 dark:text-gray-100">
                    <LogIn className="w-4 h-4 mr-2" />
                    <Link href="/auth">Login</Link>
                  </Button>
                  <Button size="sm" className="bg-[#22C55E] hover:bg-[#16A34A] text-white">
                    <UserPlus className="w-4 h-4 mr-2" />
                    <Link href="/auth">Sign Up</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16">
        <BeamsBackground intensity="strong" className="bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="text-center space-y-8">
              <h1 className="text-6xl lg:text-7xl font-bold text-slate-700 dark:text-white leading-tight transition-colors">
                AI Powered Insurance
                <br />
                Solutions for Modern
                <br />
                India
              </h1>
              <h2 className="text-2xl lg:text-3xl font-semibold text-gray-700 dark:text-gray-300 transition-colors">
                Simple, effective, easy insurance solutions.
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-4xl mx-auto transition-colors">
                Experience the future of insurance with our AI-powered platform that makes finding, comparing, and
                purchasing insurance as simple as having a conversation.
              </p>
              <div className="pt-8 relative z-10">
                <Link href={user ? "/chat" : "/auth"}>
                  <button
                    className="inline-flex items-center bg-[#22C55E] hover:bg-[#16A34A] text-white px-8 py-6 text-lg rounded-full shadow-lg hover:shadow-xl transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-6 h-6 mr-3" />
                    Chat with Aria
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </BeamsBackground>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8">
            {/* Step 1 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-[#22C55E]">1</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Chat with Aria</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tell our AI what you need. She asks the right questions to understand your unique situation.
              </p>
            </div>

            {/* Step 2 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto">
                <FileCheck2 className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-[#22C55E]">2</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Compare & Choose</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Aria analyzes policies to find your best matches. Compare top options side-by-side.
              </p>
            </div>

            {/* Step 3 */}
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-[#22C55E] rounded-full flex items-center justify-center mx-auto">
                <BadgeCheck className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-medium text-[#22C55E]">3</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Get Covered Instantly</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Select your policy, complete the process online, and get your coverage in minutes. It's that simple.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-gray-950 text-white py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Logo & Tagline */}
            <div className="space-y-4">
              <img src="/covernow-logo-light.png" alt="CoverNow" className="h-32 w-auto" />
              <p className="text-gray-400">
                Making insurance simple, accessible, and intelligent for modern India.
              </p>
            </div>

            {/* Products */}
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Health Insurance
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Life Insurance
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Motor Insurance
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Fire Insurance
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Travel Insurance
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-[#22C55E] transition-colors">
                    IRDAI License
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">© 2024 CoverNow. All Rights Reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-[#22C55E] transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-[#22C55E] transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import BeamsBackground from "@/components/kokonutui/beams-background"
import { ThemeToggle } from "@/components/theme-toggle"
import { createClient } from "@/utils/supabase/client"
import { useEffect, useState } from "react"
import type { User } from "@supabase/supabase-js"
import {
  HeartPulse,
  ShieldCheck,
  Car,
  Flame,
  Plane,
  CheckCircle,
  Users,
  Calendar,
  Globe,
  Home,
  Linkedin,
  Twitter,
  LogIn,
  UserPlus,
  User as UserIcon,
  LogOut,
  MessageCircle,
} from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

export default function ProductsPage() {
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
    <div className="min-h-screen bg-white dark:bg-gray-900 font-['Inter'] transition-colors text-slate-600">
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
              <a href="/" className="text-gray-900 dark:text-gray-100 hover:text-green-500 transition-colors">
                Home
              </a>
              <a href="/products" className="text-green-500 font-medium">
                Products
              </a>
              <a
                href="/#how-it-works"
                className="text-gray-900 dark:text-gray-100 hover:text-green-500 transition-colors"
              >
                How It Works
              </a>
              <a href="/#about" className="text-gray-900 dark:text-gray-100 hover:text-green-500 transition-colors">
                About Us
              </a>
            </nav>

            {/* Auth & Theme Toggle */}
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center">
                    <UserIcon className="w-4 h-4 mr-2" />
                    {user.user_metadata?.first_name || 'User'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => router.push('/chat')} className="text-gray-900 dark:text-gray-100">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Back to Aria
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-900 dark:text-gray-100">
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
                  <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white">
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
            <div className="text-center space-y-6">
              <h1 className="text-5xl lg:text-6xl font-bold text-slate-500 dark:text-white leading-tight transition-colors">
                All Your Insurance Needs, One Simple Platform
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto transition-colors">
                Comprehensive coverage options designed for modern India. From health to travel, we've got you covered
                with AI-powered recommendations.
              </p>
            </div>
          </div>
        </BeamsBackground>
      </section>

      {/* Products Grid */}
      <section className="py-20 bg-white dark:bg-gray-900 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Health Insurance */}
            <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <HeartPulse className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">
                      Health Insurance
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                      Comprehensive medical coverage for you and your family's well-being.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Cashless treatment at 10,000+ hospitals
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Coverage up to ₹1 Crore
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Pre & post hospitalization expenses
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <Users className="w-4 h-4 text-green-500 mr-2" />
                        Family floater options available
                      </li>
                    </ul>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Get Quote</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Life Insurance */}
            <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <ShieldCheck className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">
                      Life Insurance
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                      Secure your loved ones' financial future with comprehensive life coverage.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Term & whole life insurance options
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Coverage up to ₹10 Crores
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Tax benefits under Section 80C
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <Calendar className="w-4 h-4 text-green-500 mr-2" />
                        Flexible premium payment terms
                      </li>
                    </ul>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Get Quote</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Motor Insurance */}
            <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <Car className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">
                      Motor Insurance
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                      Comprehensive protection for your vehicle on the road.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Third-party & comprehensive coverage
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Cashless garage network
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        24/7 roadside assistance
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Zero depreciation add-on available
                      </li>
                    </ul>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Get Quote</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fire & Property Insurance */}
            <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="flex items-start space-x-4">
                  <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                    <Flame className="w-8 h-8 text-green-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3 transition-colors">
                      Fire & Property Insurance
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4 transition-colors">
                      Safeguard your home and assets from unexpected events.
                    </p>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Fire, flood & natural disaster coverage
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Theft & burglary protection
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <Home className="w-4 h-4 text-green-500 mr-2" />
                        Home contents & structure coverage
                      </li>
                      <li className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Temporary accommodation expenses
                      </li>
                    </ul>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Get Quote</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Travel Insurance - Full Width */}
          <div className="mt-12">
            <Card className="group hover:shadow-xl transition-all duration-300 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
              <CardContent className="p-8">
                <div className="grid lg:grid-cols-2 gap-8 items-center">
                  <div>
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-green-500/10 rounded-xl flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                        <Plane className="w-8 h-8 text-green-500" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
                          Travel Insurance
                        </h3>
                        <p className="text-gray-600 dark:text-gray-300 transition-colors">
                          Travel with peace of mind, anywhere in the world.
                        </p>
                      </div>
                    </div>
                    <Button className="bg-green-500 hover:bg-green-600 text-white">Get Quote</Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Medical emergency coverage
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Trip cancellation protection
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <Globe className="w-4 h-4 text-green-500 mr-2" />
                        Worldwide coverage
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Lost baggage compensation
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        24/7 emergency assistance
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-300 transition-colors">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                        Adventure sports coverage
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 dark:bg-black text-white py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Column 1 - Brand */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <img src="/covernow-logo-light.png" alt="CoverNow" className="h-40 w-auto" />
              </div>
              <p className="text-gray-400">Making insurance simple, accessible, and intelligent for modern India.</p>
            </div>

            {/* Column 2 - Products */}
            <div>
              <h4 className="font-semibold mb-4">Products</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="/products" className="hover:text-white transition-colors">
                    Health Insurance
                  </a>
                </li>
                <li>
                  <a href="/products" className="hover:text-white transition-colors">
                    Life Insurance
                  </a>
                </li>
                <li>
                  <a href="/products" className="hover:text-white transition-colors">
                    Motor Insurance
                  </a>
                </li>
                <li>
                  <a href="/products" className="hover:text-white transition-colors">
                    Fire Insurance
                  </a>
                </li>
                <li>
                  <a href="/products" className="hover:text-white transition-colors">
                    Travel Insurance
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 3 - Company */}
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
              </ul>
            </div>

            {/* Column 4 - Legal */}
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    IRDAI License
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400">© 2024 CoverNow. All Rights Reserved.</p>
            <div className="flex space-x-4 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import BeamsBackground from '@/components/kokonutui/beams-background'
import { ThemeToggle } from '@/components/theme-toggle'
import { ArrowLeft, Eye, EyeOff, Car, HeartPulse, Shield, Plane, Home, Check, Loader2, AlertCircle } from 'lucide-react'

const slides = [
  {
    icon: HeartPulse,
    title: 'Health Insurance',
    description: 'Comprehensive medical coverage for your peace of mind',
    features: [
      'Cashless treatment at 10,000+ hospitals',
      'Coverage up to ₹1 Crore',
      'Pre & post hospitalization expenses',
    ],
    gradient: 'from-green-100 to-green-200',
    iconBg: 'bg-green-500',
  },
  {
    icon: Car,
    title: 'Motor Insurance',
    description: 'Drive with confidence and complete protection',
    features: ['Zero depreciation coverage', '24/7 roadside assistance', 'Quick claim settlement'],
    gradient: 'from-blue-100 to-blue-200',
    iconBg: 'bg-blue-500',
  },
  {
    icon: Shield,
    title: 'Life Insurance',
    description: 'Secure your loved ones\' financial future',
    features: ['Coverage up to ₹10 Crores', 'Tax benefits under Section 80C', 'Flexible premium payment terms'],
    gradient: 'from-purple-100 to-purple-200',
    iconBg: 'bg-purple-500',
  },
  {
    icon: Plane,
    title: 'Travel Insurance',
    description: 'Travel with peace of mind, anywhere in the world',
    features: ['Medical emergency coverage', 'Trip cancellation protection', 'Lost baggage compensation'],
    gradient: 'from-orange-100 to-orange-200',
    iconBg: 'bg-orange-500',
  },
  {
    icon: Home,
    title: 'Fire & Property Insurance',
    description: 'Safeguard your home and assets from unexpected events',
    features: [
      'Fire, flood & natural disaster coverage',
      'Theft & burglary protection',
      'Temporary accommodation expenses',
    ],
    gradient: 'from-red-100 to-red-200',
    iconBg: 'bg-red-500',
  },
]

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isSignUp, setIsSignUp] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCheckEmail, setShowCheckEmail] = useState(false)

  // Auto-advance slideshow
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear errors when user starts typing
    if (error) setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      if (isSignUp) {
        // Validate passwords match
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match')
          setLoading(false)
          return
        }

        // Validate password length
        if (formData.password.length < 8) {
          setError('Password must be at least 8 characters long')
          setLoading(false)
          return
        }

        // Sign up
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              first_name: formData.firstName,
              last_name: formData.lastName
            }
          }
        })

        if (error) throw error
        
        // Show email confirmation message
        setShowCheckEmail(true)
      } else {
        // Sign in
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password
        })

        if (error) throw error
        
        // Redirect to chat page
        router.push('/chat')
      }
    } catch (error: any) {
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const currentSlideData = slides[currentSlide]
  const IconComponent = currentSlideData.icon

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex font-['Inter'] transition-colors">
      {/* Left Side - Slideshow with Beams Background */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <BeamsBackground intensity="medium" className="bg-gray-50 dark:bg-gray-800 transition-colors">
          <div className="relative z-10 flex flex-col justify-center items-center text-center px-16 py-20 h-full">
            {/* Icon */}
            <div className="mb-8">
              <div
                className={`w-20 h-20 ${currentSlideData.iconBg} rounded-2xl flex items-center justify-center shadow-lg`}
              >
                <IconComponent className="w-10 h-10 text-white" />
              </div>
            </div>

            {/* Content */}
            <div className="max-w-md space-y-6">
              <h2 className="text-4xl font-bold text-slate-700 dark:text-white leading-tight transition-colors">
                {currentSlideData.title}
              </h2>

              <p className="text-lg text-slate-600 dark:text-gray-300 leading-relaxed transition-colors">
                {currentSlideData.description}
              </p>

              <div className="space-y-4 text-left">
                {currentSlideData.features.map((feature, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-5 h-5 bg-[#22C55E] rounded-full flex items-center justify-center mt-0.5">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-slate-600 dark:text-gray-300 leading-relaxed transition-colors">
                      {feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Slide Indicators */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 flex space-x-3">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === currentSlide
                      ? "bg-[#22C55E] scale-110"
                      : "bg-slate-300 dark:bg-gray-600 hover:bg-slate-400 dark:hover:bg-gray-500"
                  }`}
                />
              ))}
            </div>
          </div>
        </BeamsBackground>
      </div>

      {/* Right Side - Auth Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-12 lg:px-16 bg-white dark:bg-gray-900 transition-colors">
        <div className="w-full max-w-md mx-auto">
          {/* Header with Back Button and Theme Toggle */}
          <div className="flex items-center justify-between mb-8">
            <Link
              href="/"
              className="flex items-center text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to home
            </Link>
            <ThemeToggle />
          </div>

          {showCheckEmail ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-slate-700 dark:text-white mb-4 transition-colors">Check your email</h2>
              <p className="text-slate-500 dark:text-gray-400 mb-6 transition-colors">
                We've sent a confirmation link to <span className="text-slate-700 dark:text-white font-medium transition-colors">{formData.email}</span>
              </p>
              <p className="text-slate-500 dark:text-gray-400 mb-8 transition-colors">
                Click the link in the email to confirm your account and start using CoverNow.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCheckEmail(false)
                  setIsSignUp(false)
                }}
                className="text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              {/* Form Header */}
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-700 dark:text-white mb-2 transition-colors">
                  {isSignUp ? 'Create your account' : 'Welcome back'}
                </h1>
                <p className="text-slate-500 dark:text-gray-400 transition-colors">
                  {isSignUp ? 'Start your insurance journey with CoverNow' : 'Sign in to access your insurance dashboard'}
                </p>
              </div>

              {/* Error Messages */}
              {error && (
                <Alert className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <AlertDescription className="text-red-700 dark:text-red-300">{error}</AlertDescription>
                </Alert>
              )}

              {/* Auth Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label
                        htmlFor="firstName"
                        className="text-slate-700 dark:text-gray-200 mb-2 block font-medium transition-colors"
                      >
                        First Name
                      </Label>
                      <Input
                        id="firstName"
                        type="text"
                        name="firstName"
                        placeholder="John"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:border-[#22C55E] focus:ring-[#22C55E] h-12 transition-colors"
                        required={isSignUp}
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="lastName"
                        className="text-slate-700 dark:text-gray-200 mb-2 block font-medium transition-colors"
                      >
                        Last Name
                      </Label>
                      <Input
                        id="lastName"
                        type="text"
                        name="lastName"
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:border-[#22C55E] focus:ring-[#22C55E] h-12 transition-colors"
                        required={isSignUp}
                        disabled={loading}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <Label
                    htmlFor="email"
                    className="text-slate-700 dark:text-gray-200 mb-2 block font-medium transition-colors"
                  >
                    Email Address
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:border-[#22C55E] focus:ring-[#22C55E] h-12 transition-colors"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <Label
                    htmlFor="password"
                    className="text-slate-700 dark:text-gray-200 mb-2 block font-medium transition-colors"
                  >
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="••••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:border-[#22C55E] focus:ring-[#22C55E] h-12 pr-12 transition-colors"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                      disabled={loading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {isSignUp && (
                    <p className="text-sm text-slate-500 dark:text-gray-400 mt-2 transition-colors">
                      Must be at least 8 characters long
                    </p>
                  )}
                </div>

                {isSignUp && (
                  <div>
                    <Label
                      htmlFor="confirmPassword"
                      className="text-slate-700 dark:text-gray-200 mb-2 block font-medium transition-colors"
                    >
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        placeholder="••••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        className="bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-500 focus:border-[#22C55E] focus:ring-[#22C55E] h-12 pr-12 transition-colors"
                        required={isSignUp}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white py-3 h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isSignUp ? 'Creating Account...' : 'Signing In...'}
                    </>
                  ) : (
                    <>{isSignUp ? 'Create Account' : 'Sign In'}</>
                  )}
                </Button>
              </form>

              {/* Toggle Auth Mode */}
              <div className="mt-6 text-center">
                <p className="text-slate-500 dark:text-gray-400 transition-colors">
                  {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                  <button
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setError(null)
                      setFormData({
                        firstName: '',
                        lastName: '',
                        email: '',
                        password: '',
                        confirmPassword: ''
                      })
                    }}
                    className="text-[#22C55E] hover:text-[#16A34A] font-medium transition-colors"
                    disabled={loading}
                  >
                    {isSignUp ? 'Sign in' : 'Sign up'}
                  </button>
                </p>
              </div>

              {/* Terms and Privacy */}
              {isSignUp && (
                <div className="mt-8 text-center">
                  <p className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed transition-colors">
                    By creating an account, you agree to our{' '}
                    <Link href="#" className="text-[#22C55E] hover:text-[#16A34A] transition-colors">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" className="text-[#22C55E] hover:text-[#16A34A] transition-colors">
                      Privacy Policy
                    </Link>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
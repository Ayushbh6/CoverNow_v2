'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isSignUp, setIsSignUp] = useState(true)
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
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

  return (
    <div className="min-h-screen bg-[#0a0e27] flex">
      {/* Left Section - Motor Insurance Info */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-md">
          <div className="w-20 h-20 mb-8 relative">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <path 
                d="M20 60 C20 50, 30 40, 50 40 C70 40, 80 50, 80 60 L80 70 C80 75, 75 80, 70 80 L30 80 C25 80, 20 75, 20 70 Z" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3"
              />
              <circle cx="35" cy="70" r="8" fill="none" stroke="#10b981" strokeWidth="3"/>
              <circle cx="65" cy="70" r="8" fill="none" stroke="#10b981" strokeWidth="3"/>
              <path 
                d="M30 50 L40 30 L60 30 L70 50" 
                fill="none" 
                stroke="#10b981" 
                strokeWidth="3"
              />
            </svg>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-4">Motor Insurance</h1>
          <p className="text-gray-300 text-lg mb-8">Drive with confidence and complete protection</p>
          
          <div className="space-y-4">
            <div className="flex items-center text-gray-300">
              <span className="text-green-500 mr-3">•</span>
              <span>Zero depreciation</span>
            </div>
            <div className="flex items-center text-gray-300">
              <span className="text-green-500 mr-3">•</span>
              <span>24/7 roadside assistance</span>
            </div>
            <div className="flex items-center text-gray-300">
              <span className="text-green-500 mr-3">•</span>
              <span>Quick claims</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Auth Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="text-gray-400 text-sm mb-8 inline-flex items-center hover:text-gray-300">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to home
          </Link>

          {showCheckEmail ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Check your email</h2>
              <p className="text-gray-400 mb-6">
                We've sent a confirmation link to <span className="text-white font-medium">{formData.email}</span>
              </p>
              <p className="text-gray-400 mb-8">
                Click the link in the email to confirm your account and start using CoverNow.
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowCheckEmail(false)
                  setIsSignUp(false)
                }}
                className="text-green-500 hover:text-green-400 font-medium"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-3xl font-bold text-white mb-2">
                {isSignUp ? 'Create your account' : 'Welcome back'}
              </h2>
              <p className="text-gray-400 mb-8">
                {isSignUp ? 'Start your insurance journey with CoverNow' : 'Sign in to manage your policies'}
              </p>

              <form onSubmit={handleSubmit} className="space-y-6">
                {isSignUp && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="John"
                    required
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Doe"
                    required
                    className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="you@example.com"
                required
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              )}
            </div>

            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Confirm Password
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-[#1a1f3a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
                />
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-500 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-[#0a0e27] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-gray-400">
                  {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
                </span>
                <button
                  type="button"
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
                  className="text-green-500 hover:text-green-400 font-medium"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </div>

              {isSignUp && (
                <p className="mt-6 text-xs text-gray-500 text-center">
                  By creating an account, you agree to our{' '}
                  <a href="#" className="text-green-500 hover:text-green-400">Terms of Service</a>{' '}
                  and{' '}
                  <a href="#" className="text-green-500 hover:text-green-400">Privacy Policy</a>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
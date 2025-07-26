'use client'

import { useState } from 'react'
import { InsuranceProduct } from '@/app/api/chat/tools/showLifeInsuranceRecommendations'

interface LifeInsuranceRecommendationsProps {
  recommendations: InsuranceProduct[];
  userData: any;
}

export default function LifeInsuranceRecommendations({ 
  recommendations, 
  userData 
}: LifeInsuranceRecommendationsProps) {
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null)

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Format coverage amount for display
  const formatCoverage = (amount: number) => {
    if (amount >= 10000000) { // 1 crore or more
      return `${(amount / 10000000).toFixed(1)} Cr`
    } else if (amount >= 100000) { // 1 lakh or more
      return `${(amount / 100000).toFixed(0)} Lakhs`
    }
    return formatCurrency(amount)
  }

  // Calculate savings percentage (dummy calculation)
  const calculateSavings = (index: number) => {
    const savingsPercentages = [15, 10, 12, 8, 20]
    return savingsPercentages[index % savingsPercentages.length]
  }

  // Calculate default term based on age (matching backend logic)
  const calculateDefaultTerm = (userData: any): number => {
    const age = userData.age || (userData.dob ? new Date().getFullYear() - new Date(userData.dob).getFullYear() : 30);
    
    if (age <= 25) return 30;
    if (age <= 35) return 25;
    if (age <= 45) return 20;
    if (age <= 55) return 15;
    return 10;
  }

  return (
    <div className="w-full max-w-7xl mx-auto px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-3xl flex items-center justify-center shadow-xl">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight mb-1">
              Premium Plans for {userData.first_name}
            </h3>
            <p className="text-gray-600 dark:text-white/60 font-medium">
              Curated recommendations based on your profile
            </p>
          </div>
        </div>

      </div>

      {/* Key Details Summary */}
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 p-8 mb-12 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 via-purple-600/5 to-indigo-600/5 rounded-3xl"></div>
        <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-3 tracking-wide">Coverage Amount</p>
            <div className="flex flex-col items-center">
              <p className="text-2xl font-bold text-white tracking-tight">
                {formatCoverage(recommendations[0]?.coverageAmount || 5000000)}
              </p>
              {!userData.coverage_amount && (
                <span className="text-xs text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full mt-2 font-medium">
                  Smart Default
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-3 tracking-wide">Policy Term</p>
            <div className="flex flex-col items-center">
              <p className="text-2xl font-bold text-white tracking-tight">
                {userData.policy_term || calculateDefaultTerm(userData)} years
              </p>
              {!userData.policy_term && (
                <span className="text-xs text-blue-400 bg-blue-500/20 px-3 py-1 rounded-full mt-2 font-medium">
                  Smart Default
                </span>
              )}
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-3 tracking-wide">Your Age</p>
            <p className="text-2xl font-bold text-white tracking-tight">
              {userData.age || (userData.dob ? new Date().getFullYear() - new Date(userData.dob).getFullYear() : 'Not provided')}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-white/60 mb-3 tracking-wide">Smoker Status</p>
            <div className="flex items-center justify-center gap-2">
              <div className={`w-3 h-3 rounded-full ${userData.smoking_status ? 'bg-red-400' : 'bg-green-400'}`}></div>
              <p className="text-2xl font-bold text-white tracking-tight">
                {userData.smoking_status ? 'Yes' : 'No'}
              </p>
            </div>
          </div>
        </div>
      </div>



      {/* Insurance Product Cards - Horizontal Scroll */}
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto pb-6 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {recommendations.map((product, index) => (
            <div
              key={product.id}
              className={`min-w-[420px] relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border transition-all duration-500 cursor-pointer group ${
                selectedProduct === product.id
                  ? 'border-orange-500/50 shadow-2xl shadow-orange-500/20 scale-[1.02]'
                  : 'border-white/10 hover:border-white/20 hover:shadow-xl'
              }`}
              onClick={() => setSelectedProduct(product.id)}
            >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-red-500/5 to-pink-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="relative p-8">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
                    {product.logo}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white tracking-tight">{product.name}</h4>
                    <p className="text-sm text-white/60 font-medium">{product.company}</p>
                  </div>
                </div>
                {index === 0 && (
                  <div className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-orange-500 to-red-500 rounded-full shadow-lg">
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" />
                    </svg>
                    <span className="text-xs font-bold text-white tracking-wide">RECOMMENDED</span>
                  </div>
                )}
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-4">
                {/* Premium Information */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Monthly Premium</p>
                  {product.premiumRange ? (
                    <div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(product.premiumRange.min / 12)} - {formatCurrency(product.premiumRange.max / 12)}
                      </p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-white">{formatCurrency(product.monthlyPremium)}</p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                  )}
                </div>

                {/* Annual Premium */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Annual Premium</p>
                  {product.premiumRange ? (
                    <div>
                      <p className="text-xl font-bold text-white">
                        {formatCurrency(product.premiumRange.min)} - {formatCurrency(product.premiumRange.max)}
                      </p>
                      <p className="text-xs text-gray-500">per year</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xl font-bold text-white">{formatCurrency(product.annualPremium)}</p>
                      <p className="text-xs text-gray-500">per year</p>
                    </div>
                  )}
                </div>

                {/* Claim Settlement */}
                <div>
                  <p className="text-sm text-gray-400 mb-1">Claim Settlement Ratio</p>
                  <p className="text-xl font-bold text-green-400">{product.claimSettlementRatio}</p>
                  <p className="text-xs text-gray-500">Industry avg: 97.5%</p>
                </div>
              </div>

              {/* Features */}
              <div className="border-t border-gray-700 pt-4">
                <p className="text-sm text-gray-400 mb-2">Key Features</p>
                <div className="grid md:grid-cols-2 gap-2">
                  {product.features.map((feature, fIndex) => (
                    <div key={fIndex} className="flex items-start gap-2">
                      <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg font-semibold text-white hover:from-orange-600 hover:to-orange-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // In production, this would initiate the actual purchase flow
                    alert('In production, this would take you to the insurance provider\'s website to complete your purchase.')
                  }}
                >
                  Get Quote
                </button>
                <button
                  className="px-4 py-2 bg-gray-700 rounded-lg font-semibold text-gray-300 hover:bg-gray-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    // In production, this would show more details
                    alert('More details about ' + product.name)
                  }}
                >
                  View Details
                </button>
              </div>

              {/* Savings Badge */}
              {index < 3 && (
                <div className="mt-3 flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-500/20 rounded text-xs text-green-400">
                    Save {calculateSavings(index)}% with annual payment
                  </span>
                  {userData.age && userData.age < 30 && (
                    <span className="px-2 py-1 bg-blue-500/20 rounded text-xs text-blue-400">
                      Young age discount applied
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        </div>
      </div>

      {/* Footer Information */}
      <div className="mt-8 space-y-4">
        {/* Smart Defaults Information */}
        {(!userData.coverage_amount || !userData.policy_term) && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-400 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              About Smart Defaults
            </h4>
            <div className="space-y-1 text-xs text-blue-300">
              {!userData.coverage_amount && (
                <p>• <strong>Coverage Amount:</strong> Calculated as 12x your annual income (₹{(userData.annual_income * 12 / 10000000).toFixed(1)} Cr), following industry best practices</p>
              )}
              {!userData.policy_term && (
                <p>• <strong>Policy Term:</strong> {calculateDefaultTerm(userData)} years based on your age for optimal retirement planning</p>
              )}
              <p>• You can customize these values anytime during the application process</p>
            </div>
          </div>
        )}

        {/* General Information */}
        <div className="p-6 bg-[#2a2a2a] rounded-xl border border-gray-800">
          <h4 className="text-lg font-semibold text-white mb-3">Important Information</h4>
          <div className="space-y-2 text-sm text-gray-400">
            <p>• Premiums shown are indicative and may vary based on underwriting</p>
            <p>• All plans include tax benefits under Section 80C up to ₹1.5 lakhs</p>
            <p>• Medical tests may be required based on age and coverage amount</p>
            <p>• Pre-existing conditions may have waiting periods</p>
            <p>• Actual premiums will be confirmed by the insurance provider</p>
          </div>
        </div>
      </div>

    </div>
  )
}
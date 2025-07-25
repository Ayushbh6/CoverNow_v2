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

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-bold text-white mb-2">
          Life Insurance Recommendations for {userData.first_name}
        </h3>
        <p className="text-gray-400">
          Based on your profile, here are our top 5 life insurance plans
        </p>
        {recommendations[0]?.accuracyNote && (
          <p className="text-sm text-orange-400 mt-2">
            {recommendations[0].accuracyNote}
          </p>
        )}
      </div>

      {/* Key Details Summary */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-gray-800 p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-400">Coverage Amount</p>
            <p className="text-lg font-semibold text-white">
              {formatCoverage(recommendations[0]?.coverageAmount || 5000000)}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Policy Term</p>
            <p className="text-lg font-semibold text-white">
              {userData.policy_term || '20'} years
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Your Age</p>
            <p className="text-lg font-semibold text-white">
              {userData.age || 'Not provided'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-400">Smoker Status</p>
            <p className="text-lg font-semibold text-white">
              {userData.smoking_status ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>

      {/* Insurance Product Cards - Horizontal Scroll */}
      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {recommendations.map((product, index) => (
            <div
              key={product.id}
              className={`min-w-[380px] bg-gradient-to-br from-[#2a2a2a] to-[#1f1f1f] rounded-xl border transition-all cursor-pointer transform hover:scale-[1.02] hover:shadow-2xl ${
                selectedProduct === product.id
                  ? 'border-orange-500 shadow-lg shadow-orange-500/30 scale-[1.02]'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
              onClick={() => setSelectedProduct(product.id)}
            >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-2xl">
                    {product.logo}
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-white">{product.name}</h4>
                    <p className="text-sm text-gray-400">{product.company}</p>
                  </div>
                </div>
                {index === 0 && (
                  <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full text-xs font-semibold text-white">
                    Recommended
                  </span>
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
      <div className="mt-8 p-6 bg-[#2a2a2a] rounded-xl border border-gray-800">
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
  )
}
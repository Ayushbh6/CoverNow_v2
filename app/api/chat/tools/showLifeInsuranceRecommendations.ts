import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

// Schema for the tool - no parameters needed
export const showLifeInsuranceRecommendationsSchema = jsonSchema({
  type: 'object',
  properties: {},
  additionalProperties: false,
  description: 'Show personalized life insurance recommendations based on user profile data'
});

export interface InsuranceProduct {
  id: string;
  name: string;
  company: string;
  logo?: string;
  coverageAmount: number;
  monthlyPremium: number;
  annualPremium: number;
  premiumRange?: {
    min: number;
    max: number;
  };
  features: string[];
  claimSettlementRatio: string;
  accuracyNote?: string;
}

export interface ShowRecommendationsResult {
  success: boolean;
  status: 'ready' | 'incomplete_profile' | 'error';
  recommendations?: InsuranceProduct[];
  userData?: any;
  missingFields?: string[];
  error?: string;
}

// Helper function to check if we have minimum required fields
function hasMinimumRequiredFields(data: any): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  // Required field 1: Smoking Status
  if (data.smoking_status === undefined || data.smoking_status === null) {
    missing.push('smoking status');
  }
  
  // Required field 2: Occupation
  if (!data.occupation) {
    missing.push('occupation');
  }
  
  // Required field 3: Annual Income
  if (!data.annual_income || data.annual_income <= 0) {
    missing.push('annual income');
  }
  
  // Required field 4: Date of birth
  if (!data.dob) {
    missing.push('date of birth');
  }
  
  return { valid: missing.length === 0, missing };
}

// Helper function to calculate premium
function calculatePremium(data: any): { monthly: number; annual: number; min?: number; max?: number } {
  // Base premium calculation
  let basePremium = 5000; // Base annual premium
  
  // Age factor
  if (data.dob) {
    const age = new Date().getFullYear() - new Date(data.dob).getFullYear();
    basePremium += (age - 25) * 200; // Increase by 200 per year above 25
  } else {
    // Default age assumption if DOB not available
    basePremium += (30 - 25) * 200;
  }

  // Smoking factor
  if (data.smoking_status === true) {
    basePremium *= 1.5; // 50% increase for smokers
  }

  // Health issues factor
  if (data.issues && data.issues.length > 0) {
    basePremium *= (1 + data.issues.length * 0.15); // 15% increase per health issue
  }

  // Coverage amount factor
  if (data.coverage_amount) {
    basePremium = (data.coverage_amount / 1000000) * (basePremium / 5); // Adjust based on coverage
  }

  // Policy term factor
  if (data.policy_term) {
    const termMultiplier: Record<string, number> = {
      '5': 0.8,
      '10': 0.9,
      '15': 1.0,
      '20': 1.1,
      '25': 1.2,
      '30': 1.3
    };
    basePremium *= termMultiplier[data.policy_term] || 1.0;
  }

  // If we have incomplete data, return a range
  const hasCompleteData = data.dob && data.annual_income && data.city && data.coverage_amount;
  
  if (!hasCompleteData) {
    return {
      monthly: Math.round(basePremium / 12),
      annual: Math.round(basePremium),
      min: Math.round(basePremium * 0.7),
      max: Math.round(basePremium * 1.3)
    };
  }

  return {
    monthly: Math.round(basePremium / 12),
    annual: Math.round(basePremium)
  };
}

// Helper function to calculate smart coverage amount based on income
function calculateSmartCoverageAmount(userData: any): number {
  if (!userData.annual_income || userData.annual_income <= 0) {
    return 5000000; // Fallback to 50 lakhs if no income
  }
  
  // Industry standard: 10-15x annual income, we'll use 12x as default
  const recommendedCoverage = userData.annual_income * 12;
  
  // Ensure minimum coverage of 10 lakhs and maximum practical limit of 10 crores
  const minCoverage = 1000000; // 10 lakhs
  const maxCoverage = 100000000; // 10 crores
  
  return Math.max(minCoverage, Math.min(maxCoverage, recommendedCoverage));
}

// Helper function to calculate smart policy term based on age
function calculateSmartPolicyTerm(userData: any): number {
  const age = userData.dob ? new Date().getFullYear() - new Date(userData.dob).getFullYear() : 30;
  
  // Age-based term recommendations for retirement planning
  if (age <= 25) return 30; // Young professionals - longest term
  if (age <= 35) return 25; // Early career - long term
  if (age <= 45) return 20; // Mid career - medium term
  if (age <= 55) return 15; // Later career - shorter term
  return 10; // Near retirement - minimum term
}

// Helper function to generate insurance products
function generateInsuranceProducts(userData: any): InsuranceProduct[] {
  // Calculate smart defaults for coverage amount and policy term
  const coverageAmount = userData.coverage_amount || calculateSmartCoverageAmount(userData);
  const policyTerm = userData.policy_term || calculateSmartPolicyTerm(userData);
  
  const products = [
    {
      name: 'SecureLife Plus',
      company: 'HDFC Life',
      logo: '🏦',
      claimSettlementRatio: '98.01%',
      baseFeatures: [
        'No medical checkup till 45 years',
        'Tax benefits under Section 80C',
        'Critical illness rider available',
        'Accidental death benefit'
      ]
    },
    {
      name: 'iProtect Smart',
      company: 'ICICI Prudential',
      logo: '🏛️',
      claimSettlementRatio: '97.82%',
      baseFeatures: [
        'Life stage protection benefit',
        'Terminal illness benefit',
        'Premium waiver option',
        '34 critical illnesses covered'
      ]
    },
    {
      name: 'Smart Term Plan',
      company: 'Max Life',
      logo: '🛡️',
      claimSettlementRatio: '99.35%',
      baseFeatures: [
        'Comprehensive life cover',
        'Monthly income benefit option',
        'Return of premium option',
        'Online discount available'
      ]
    },
    {
      name: 'Saral Jeevan Bima',
      company: 'LIC',
      logo: '🏢',
      claimSettlementRatio: '98.74%',
      baseFeatures: [
        'Simple and affordable',
        'Government backed insurer',
        'Loan facility available',
        'Maturity benefits'
      ]
    },
    {
      name: 'DigiShield Plan',
      company: 'Bajaj Allianz',
      logo: '🚀',
      claimSettlementRatio: '98.48%',
      baseFeatures: [
        '100% online process',
        'Instant policy issuance',
        'Flexible premium payment',
        'Women get discounted rates'
      ]
    }
  ];

  return products.map((product, index) => {
    const premium = calculatePremium({
      ...userData,
      coverage_amount: coverageAmount,
      policy_term: policyTerm,
      // Add some variation for different products
      variation: index * 0.1
    });

    // Adjust features based on user data
    const features = [...product.baseFeatures];
    if (userData.issues && userData.issues.length > 0) {
      features[0] = 'Pre-existing diseases covered after 4 years';
    }
    if (userData.smoking_status === true) {
      features.push('Higher premium due to smoking');
    }

    const hasCompleteData = userData.dob && userData.annual_income && userData.city;

    return {
      id: randomUUID(),
      name: product.name,
      company: product.company,
      logo: product.logo,
      coverageAmount,
      monthlyPremium: premium.monthly + (index * 500), // Add variation
      annualPremium: premium.annual + (index * 6000), // Add variation
      premiumRange: !hasCompleteData ? {
        min: premium.min! + (index * 500),
        max: premium.max! + (index * 500)
      } : undefined,
      features,
      claimSettlementRatio: product.claimSettlementRatio,
      accuracyNote: hasCompleteData ? 
        'Accurate quote based on your profile' : 
        'Estimated range - provide more details for accurate pricing'
    };
  });
}

// Main tool implementation
export const showLifeInsuranceRecommendationsTool = tool({
  description: 'STEP 2 of 2: Show personalized life insurance recommendations based on the user profile data. This should be called AFTER collectLifeInsuranceInfo when the user has provided their information.',
  parameters: showLifeInsuranceRecommendationsSchema,
  execute: async () => {
    try {
      // Get authenticated user
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return {
          success: false,
          status: 'error' as const,
          error: 'User not authenticated'
        };
      }

      // Fetch user profile with all fields including new insurance fields
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profile')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (profileError || !userProfile) {
        return {
          success: false,
          status: 'error' as const,
          error: 'Unable to fetch user profile'
        };
      }

      // Check if we have minimum required fields
      const { valid, missing } = hasMinimumRequiredFields(userProfile);
      
      if (!valid) {
        return {
          success: false,
          status: 'incomplete_profile' as const,
          missingFields: missing,
          error: `Please provide your ${missing.join(' and ')} first using the life insurance form.`
        };
      }

      // Generate recommendations
      const recommendations = generateInsuranceProducts(userProfile);

      return {
        success: true,
        status: 'ready' as const,
        userData: userProfile,
        recommendations
      };

    } catch (error) {
      console.error('[showLifeInsuranceRecommendations] Error:', error);
      
      return {
        success: false,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
});

// Export the tool
export default showLifeInsuranceRecommendationsTool;
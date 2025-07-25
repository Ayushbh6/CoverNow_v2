import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { createClient } from '@/utils/supabase/server';
import { randomUUID } from 'crypto';

// Schema for the tool - no parameters needed
export const collectLifeInsuranceInfoSchema = jsonSchema({
  type: 'object',
  properties: {},
  additionalProperties: false,
  description: 'Collect life insurance information from user through a comprehensive form'
});

// Type definitions
export interface UserProfileData {
  first_name: string;
  last_name: string;
  age?: number | null;
  dob?: string | null;
  gender?: string | null;
  is_married?: boolean | null;
  issues?: string[];
  annual_income?: number | null;
  city?: string | null;
  smoking_status?: boolean | null;
  occupation?: string | null;
  coverage_amount?: number | null;
  policy_term?: number | null;
}

export interface FormFieldDefinition {
  fieldName: string;
  fieldType: 'text' | 'number' | 'boolean' | 'date' | 'select' | 'array';
  required: boolean;
  currentValue: any;
  helpText: string;
  placeholder?: string;
  options?: string[] | { value: string; label: string }[];
}

export interface CollectLifeInsuranceResult {
  success: boolean;
  status: 'needs_input' | 'error';
  userData?: UserProfileData;
  fieldsToShow?: FormFieldDefinition[];
  sessionId?: string;
  error?: string;
}

// Helper function to generate form fields
function generateFormFields(userData: UserProfileData): FormFieldDefinition[] {
  const fields: FormFieldDefinition[] = [];

  // Database fields (optional, show if null/empty)
  if (userData.age === null && userData.dob === null) {
    fields.push({
      fieldName: 'dob',
      fieldType: 'date',
      required: false,
      currentValue: null,
      helpText: 'Your date of birth helps us calculate accurate premiums',
      placeholder: 'YYYY-MM-DD'
    });
  }

  if (!userData.gender) {
    fields.push({
      fieldName: 'gender',
      fieldType: 'select',
      required: false,
      currentValue: userData.gender || null,
      helpText: 'Gender can affect premium rates',
      options: [
        { value: '', label: 'Prefer not to say' },
        { value: 'Male', label: 'Male' },
        { value: 'Female', label: 'Female' },
        { value: 'Other', label: 'Other' }
      ]
    });
  }

  if (userData.annual_income === null) {
    fields.push({
      fieldName: 'annual_income',
      fieldType: 'number',
      required: false,
      currentValue: null,
      helpText: 'Helps determine appropriate coverage amount',
      placeholder: 'e.g., 1000000'
    });
  }

  if (!userData.city) {
    fields.push({
      fieldName: 'city',
      fieldType: 'text',
      required: false,
      currentValue: userData.city || null,
      helpText: 'Location affects available plans and pricing',
      placeholder: 'e.g., Mumbai, Delhi, Bangalore'
    });
  }

  if (userData.is_married === null) {
    fields.push({
      fieldName: 'is_married',
      fieldType: 'boolean',
      required: false,
      currentValue: null,
      helpText: 'Marital status helps in recommending suitable coverage',
      options: [
        { value: 'true', label: 'Married' },
        { value: 'false', label: 'Single' },
        { value: 'null', label: 'Prefer not to say' }
      ]
    });
  }

  // Health issues - special handling
  fields.push({
    fieldName: 'issues',
    fieldType: 'array',
    required: false,
    currentValue: userData.issues || [],
    helpText: userData.issues?.length === 0 ? 
      'No health issues recorded. Add any pre-existing conditions that may affect your premium.' :
      'Current health conditions recorded',
    placeholder: 'Add health conditions'
  });

  // Insurance specific fields (always show)
  // Smoking status - REQUIRED
  if (userData.smoking_status === undefined || userData.smoking_status === null) {
    fields.push({
      fieldName: 'smoking_status',
      fieldType: 'boolean',
      required: true,
      currentValue: userData.smoking_status,
      helpText: 'Smoking status significantly affects life insurance premiums',
      options: [
        { value: 'false', label: 'No, I don\'t smoke' },
        { value: 'true', label: 'Yes, I smoke' }
      ]
    });
  }

  // Occupation - REQUIRED
  if (!userData.occupation) {
    fields.push({
      fieldName: 'occupation',
      fieldType: 'text',
      required: true,
      currentValue: userData.occupation || null,
      helpText: 'Your occupation helps assess risk and determine premiums',
      placeholder: 'e.g., Software Engineer, Doctor, Business Owner'
    });
  }

  // Coverage amount - OPTIONAL
  fields.push({
    fieldName: 'coverage_amount',
    fieldType: 'number',
    required: false,
    currentValue: userData.coverage_amount || null,
    helpText: 'Recommended: 10-15 times your annual income',
    placeholder: 'e.g., 5000000'
  });

  // Policy term - OPTIONAL
  fields.push({
    fieldName: 'policy_term',
    fieldType: 'select',
    required: false,
    currentValue: userData.policy_term || null,
    helpText: 'Choose how long you want coverage',
    options: [
      { value: '', label: 'Select policy term' },
      { value: '5', label: '5 years' },
      { value: '10', label: '10 years' },
      { value: '15', label: '15 years' },
      { value: '20', label: '20 years' },
      { value: '25', label: '25 years' },
      { value: '30', label: '30 years' }
    ]
  });

  return fields;
}

// Main tool implementation
export const collectLifeInsuranceInfoTool = tool({
  description: 'STEP 1 of 2: Show a form to collect life insurance information from the user. This must be called BEFORE showLifeInsuranceRecommendations. The form will save data directly to the user profile.',
  parameters: collectLifeInsuranceInfoSchema,
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

      // Fetch user profile
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

      // Generate form fields based on current data
      const fieldsToShow = generateFormFields(userProfile);
      const sessionId = randomUUID();

      return {
        success: true,
        status: 'needs_input' as const,
        userData: userProfile,
        fieldsToShow,
        sessionId
      };

    } catch (error) {
      console.error('[collectLifeInsuranceInfo] Error:', error);
      
      return {
        success: false,
        status: 'error' as const,
        error: error instanceof Error ? error.message : 'An unexpected error occurred'
      };
    }
  }
});

// Export the tool
export default collectLifeInsuranceInfoTool;
import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { createClient } from '@/utils/supabase/server';

// Schema definitions for tool parameters - Using explicit JSON Schema for OpenRouter Anthropic compatibility
export const getUserProfileSchema = jsonSchema({
  type: 'object',
  properties: {},
  required: [],
  additionalProperties: false,
  description: "Get the current user's profile information"
});

export const updateUserProfileSchema = jsonSchema({
  type: 'object',
  properties: {
    dob: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: "User's date of birth in YYYY-MM-DD format. Always prefer collecting this over 'age'."
    },
    gender: {
      type: 'string',
      description: "User's gender identity. Capture this exactly as the user states it."
    },
    isMarried: {
      type: 'boolean',
      description: "User's marital status. Use true for 'married' and false for 'single' or 'unmarried'."
    },
    annualIncome: {
      type: 'number',
      minimum: 0,
      description: "User's annual income in their local currency (e.g., Rupees). Do not include currency symbols or commas."
    },
    city: {
      type: 'string',
      description: "User's city of residence"
    },
    smokingStatus: {
      type: 'boolean',
      description: "Whether the user smokes. True for smoker, false for non-smoker. Important for insurance premiums."
    },
    occupation: {
      type: 'string',
      description: "User's occupation/profession. Important for risk assessment in insurance."
    },
    coverageAmount: {
      type: 'number',
      minimum: 0,
      description: "Desired life insurance coverage amount in INR (e.g., 7500000 for 75 lakhs). Do not include currency symbols or commas."
    },
    policyTerm: {
      type: 'number',
      minimum: 5,
      maximum: 40,
      description: "Desired insurance policy term in years (e.g., 10, 15, 20, 25, 30)."
    }
  },
  required: [],
  additionalProperties: false,
  description: "Update user profile information including insurance preferences (excluding health issues)"
});

export const manageUserIssuesSchema = jsonSchema({
  type: 'object',
  properties: {
    operation: {
      type: 'string',
      enum: ['add', 'remove', 'clear'],
      description: "The operation to perform: 'add' a new issue, 'remove' an existing one, or 'clear' all issues."
    },
    issue: {
      type: 'string',
      description: "The specific health issue to add or remove (e.g., 'Diabetes', 'High Blood Pressure'). Required for 'add' and 'remove' operations."
    }
  },
  required: ['operation'],
  additionalProperties: false,
  description: "Manage user's health issues list"
});


// Zod schemas for internal validation
const updateUserProfileZodSchema = z.object({
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date of birth must be in YYYY-MM-DD format.").optional(),
  gender: z.string().optional(),
  isMarried: z.boolean().optional(),
  annualIncome: z.number().min(0).optional(),
  city: z.string().optional(),
  smokingStatus: z.boolean().optional(),
  occupation: z.string().optional(),
  coverageAmount: z.number().min(0).optional(),
  policyTerm: z.number().min(5).max(40).optional()
});

const manageUserIssuesZodSchema = z.object({
  operation: z.enum(['add', 'remove', 'clear']),
  issue: z.string().optional()
}).refine(data => {
    if ((data.operation === 'add' || data.operation === 'remove')) {
      return data.issue && data.issue.trim().length > 0;
    }
    return true;
  }, {
    message: "An issue description is required for 'add' and 'remove' operations.",
    path: ['issue'],
});

// Type definitions
type UserProfile = {
  firstName: string;
  lastName: string;
  dob: string | null;
  gender: string | null;
  isMarried: boolean | null;
  hasIssues: boolean | null;
  issues: string[];
  annualIncome: number | null;
  city: string | null;
  smokingStatus: boolean | null;
  occupation: string | null;
};

// Tool: Get user profile
export const getUserProfileTool = tool({
  description: "CRITICAL: Get the current user's profile information. This MUST be called first in every conversation before any other response.",
  parameters: getUserProfileSchema,
  execute: async () => {
    try {
      const supabase = await createClient();
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Get user profile with automatic RLS filtering
      const { data: profile, error } = await supabase
        .from('user_profile')
        .select('first_name, last_name, dob, gender, is_married, has_issues, issues, annual_income, city, smoking_status, occupation')
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { 
            success: false, 
            error: 'Profile not found. User needs to create a profile first.' 
          };
        }
        throw error;
      }

      // Calculate age from DOB if available
      let calculatedAge: number | null = null;
      if (profile.dob) {
        const birthDate = new Date(profile.dob);
        const today = new Date();
        calculatedAge = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          calculatedAge--;
        }
      }

      // Transform snake_case to camelCase and format response
      const userProfile: UserProfile & { age: number | null } = {
        firstName: profile.first_name,
        lastName: profile.last_name,
        age: calculatedAge,
        dob: profile.dob,
        gender: profile.gender,
        isMarried: profile.is_married,
        hasIssues: profile.has_issues,
        issues: profile.issues || [],
        annualIncome: profile.annual_income,
        city: profile.city,
        smokingStatus: profile.smoking_status,
        occupation: profile.occupation
      };

      return { success: true, data: userProfile };
    } catch (error) {
      return { 
        success: false, 
        error: 'Failed to fetch user profile' 
      };
    }
  }
});

// Tool: Update user profile
export const updateUserProfileTool = tool({
  description: "Update user profile fields (excluding health issues). Automatically handles confirmation for existing values.",
  parameters: updateUserProfileSchema,
  execute: async (params) => {
    try {
      // Validate parameters using Zod
      const validatedParams = updateUserProfileZodSchema.parse(params);
      
      const supabase = await createClient();
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Check if any parameters were provided
      if (Object.keys(validatedParams).length === 0) {
        return { 
          success: false, 
          error: 'No fields to update. Please provide at least one field.',
          updatedFields: []
        };
      }
      
      // Get current profile to check existing values
      const { data: currentProfile, error: fetchError } = await supabase
        .from('user_profile')
        .select('dob, gender, is_married, annual_income, city, smoking_status, occupation, coverage_amount, policy_term')
        .eq('user_id', user.id)
        .single();
        
      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { 
            success: false, 
            error: 'Profile not found. User needs to create a profile first.' 
          };
        }
        throw fetchError;
      }
      
      // Check if any fields already have values and need confirmation
      const fieldsNeedingConfirmation: Array<{
        field: string;
        currentValue: any;
        newValue: any;
        displayName: string;
      }> = [];
      
      // Check each field
      if (validatedParams.dob !== undefined && currentProfile.dob !== null) {
        fieldsNeedingConfirmation.push({
          field: 'dob',
          currentValue: currentProfile.dob,
          newValue: validatedParams.dob,
          displayName: 'date of birth'
        });
      }
      
      if (validatedParams.gender !== undefined && currentProfile.gender !== null) {
        fieldsNeedingConfirmation.push({
          field: 'gender',
          currentValue: currentProfile.gender,
          newValue: validatedParams.gender,
          displayName: 'gender'
        });
      }
      
      if (validatedParams.isMarried !== undefined && currentProfile.is_married !== null) {
        fieldsNeedingConfirmation.push({
          field: 'isMarried',
          currentValue: currentProfile.is_married ? 'married' : 'single',
          newValue: validatedParams.isMarried ? 'married' : 'single',
          displayName: 'marital status'
        });
      }
      
      if (validatedParams.annualIncome !== undefined && currentProfile.annual_income !== null) {
        fieldsNeedingConfirmation.push({
          field: 'annualIncome',
          currentValue: currentProfile.annual_income,
          newValue: validatedParams.annualIncome,
          displayName: 'annual income'
        });
      }
      
      if (validatedParams.city !== undefined && currentProfile.city !== null) {
        fieldsNeedingConfirmation.push({
          field: 'city',
          currentValue: currentProfile.city,
          newValue: validatedParams.city,
          displayName: 'city'
        });
      }
      
      if (validatedParams.smokingStatus !== undefined && currentProfile.smoking_status !== null) {
        fieldsNeedingConfirmation.push({
          field: 'smokingStatus',
          currentValue: currentProfile.smoking_status ? 'smoker' : 'non-smoker',
          newValue: validatedParams.smokingStatus ? 'smoker' : 'non-smoker',
          displayName: 'smoking status'
        });
      }
      
      if (validatedParams.occupation !== undefined && currentProfile.occupation !== null) {
        fieldsNeedingConfirmation.push({
          field: 'occupation',
          currentValue: currentProfile.occupation,
          newValue: validatedParams.occupation,
          displayName: 'occupation'
        });
      }
      
      if (validatedParams.coverageAmount !== undefined && currentProfile.coverage_amount !== null) {
        fieldsNeedingConfirmation.push({
          field: 'coverageAmount',
          currentValue: currentProfile.coverage_amount,
          newValue: validatedParams.coverageAmount,
          displayName: 'coverage amount'
        });
      }
      
      if (validatedParams.policyTerm !== undefined && currentProfile.policy_term !== null) {
        fieldsNeedingConfirmation.push({
          field: 'policyTerm',
          currentValue: currentProfile.policy_term,
          newValue: validatedParams.policyTerm,
          displayName: 'policy term'
        });
      }
      
      // If fields need confirmation, store in conversations table and trigger confirmation flow
      if (fieldsNeedingConfirmation.length > 0) {
        // Get the most recent conversation for this user to store pending confirmation
        const { data: recentConversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!convError && recentConversation) {
          // Store the pending confirmation data
          await supabase
            .from('conversations')
            .update({
              pending_confirmation: validatedParams,
              pending_confirmation_created_at: new Date().toISOString()
            })
            .eq('id', recentConversation.id);
        }
        
        return {
          success: false,
          requiresConfirmation: true,
          confirmationData: validatedParams, // Still include for backward compatibility
          conflictingFields: fieldsNeedingConfirmation,
          confirmationMessage: generateConfirmationMessage(fieldsNeedingConfirmation),
          // This tells the AI to automatically ask for confirmation
          autoConfirmationPrompt: `I need to confirm some changes with you. ${generateConfirmationMessage(fieldsNeedingConfirmation)} Would you like me to make these updates?`
        };
      }
      
      // No conflicts, proceed with normal update
      return await performProfileUpdate(validatedParams, supabase, user.id);
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to update user profile' 
      };
    }
  }
});

// Helper function to generate confirmation message
function generateConfirmationMessage(fields: Array<{field: string, currentValue: any, newValue: any, displayName: string}>): string {
  if (fields.length === 1) {
    const field = fields[0];
    return `I see your ${field.displayName} is currently recorded as "${field.currentValue}". You want to change it to "${field.newValue}".`;
  } else {
    const changes = fields.map(f => `${f.displayName} from "${f.currentValue}" to "${f.newValue}"`);
    return `I see you want to update: ${changes.join(', ')}.`;
  }
}

// Helper function to perform the actual profile update
async function performProfileUpdate(validatedParams: any, supabase: any, userId: string) {
  // Build update object with snake_case fields
  const updateData: Record<string, any> = {};
  
  // Handle DOB
  if (validatedParams.dob) {
    // Validate date format and ensure it's in the past
    const dobDate = new Date(validatedParams.dob);
    const today = new Date();
    
    if (isNaN(dobDate.getTime())) {
      return { success: false, error: 'Invalid date format. Use YYYY-MM-DD' };
    }
    
    if (dobDate >= today) {
      return { success: false, error: 'Date of birth must be in the past' };
    }
    
    updateData.dob = validatedParams.dob;
  }
  
  // Add other fields if provided
  if (validatedParams.gender !== undefined) updateData.gender = validatedParams.gender;
  if (validatedParams.isMarried !== undefined) updateData.is_married = validatedParams.isMarried;
  if (validatedParams.annualIncome !== undefined) updateData.annual_income = validatedParams.annualIncome;
  if (validatedParams.city !== undefined) updateData.city = validatedParams.city;
  if (validatedParams.smokingStatus !== undefined) updateData.smoking_status = validatedParams.smokingStatus;
  if (validatedParams.occupation !== undefined) updateData.occupation = validatedParams.occupation;
  if (validatedParams.coverageAmount !== undefined) updateData.coverage_amount = validatedParams.coverageAmount;
  if (validatedParams.policyTerm !== undefined) updateData.policy_term = validatedParams.policyTerm;
  
  // Check if we have any fields to update after processing
  if (Object.keys(updateData).length === 0) {
    return { 
      success: false, 
      error: 'No valid fields to update after validation.',
      updatedFields: []
    };
  }
  
  // Update profile with automatic RLS filtering
  const { error } = await supabase
    .from('user_profile')
    .update(updateData)
    .eq('user_id', userId);

  if (error) {
    if (error.code === 'PGRST116') {
      return { 
        success: false, 
        error: 'Profile not found. User needs to create a profile first.' 
      };
    }
    throw error;
  }

  return { 
    success: true, 
    message: 'Profile updated successfully',
    updatedFields: Object.keys(updateData)
  };
}

// Tool: Manage user issues
export const manageUserIssuesTool = tool({
  description: "Manage user's health issues list",
  parameters: manageUserIssuesSchema,
  execute: async (params) => {
    try {
      // Validate parameters using Zod
      const validatedParams = manageUserIssuesZodSchema.parse(params);
      const { operation, issue } = validatedParams;
      
      const supabase = await createClient();
      
      // Get authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      // Get current issues
      const { data: profile, error: fetchError } = await supabase
        .from('user_profile')
        .select('issues')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          return { 
            success: false, 
            error: 'Profile not found. User needs to create a profile first.' 
          };
        }
        throw fetchError;
      }

      let updatedIssues: string[] = profile?.issues || [];
      
      // Perform operation
      switch (operation) {
        case 'add':
          // Check for duplicates (case-insensitive)
          const isDuplicate = updatedIssues.some(
            existingIssue => existingIssue.toLowerCase() === issue!.toLowerCase()
          );
          
          if (!isDuplicate) {
            updatedIssues.push(issue!);
          } else {
            return { 
              success: true, 
              message: 'Issue already exists in the list',
              issues: updatedIssues 
            };
          }
          break;
          
        case 'remove':
          updatedIssues = updatedIssues.filter(
            existingIssue => existingIssue.toLowerCase() !== issue!.toLowerCase()
          );
          break;
          
        case 'clear':
          updatedIssues = [];
          break;
      }
      
      // Update issues and has_issues flag
      const { error: updateError } = await supabase
        .from('user_profile')
        .update({ 
          issues: updatedIssues,
          has_issues: updatedIssues.length > 0
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw updateError;
      }

      return { 
        success: true, 
        message: `Successfully ${operation === 'clear' ? 'cleared' : operation + 'ed'} issue${operation === 'clear' ? 's' : ''}`,
        issues: updatedIssues
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        return { 
          success: false, 
          error: `Validation error: ${error.issues.map((e: any) => e.message).join(', ')}` 
        };
      }
      return { 
        success: false, 
        error: 'Failed to manage user issues' 
      };
    }
  }
});

// Schema for handling confirmation response
export const handleConfirmationResponseSchema = jsonSchema({
  type: 'object',
  properties: {
    confirmed: {
      type: 'boolean',
      description: "Whether the user confirmed (true) or declined (false) the update"
    },
    confirmationData: {
      type: 'object',
      description: "The original data that was pending confirmation"
    }
  },
  required: ['confirmed'],
  additionalProperties: false,
  description: "Handle user's response to profile update confirmation"
});

// Tool: Handle confirmation response
export const handleConfirmationResponseTool = tool({
  description: "INTERNAL: Handle user's yes/no response to profile update confirmation. Called automatically after user responds to confirmation prompt.",
  parameters: handleConfirmationResponseSchema,
  execute: async (params) => {
    try {
      const { confirmed, confirmationData } = params as { confirmed: boolean; confirmationData?: any };
      
      const supabase = await createClient();
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        return { success: false, error: 'User not authenticated' };
      }
      
      if (!confirmed) {
        // Clear pending confirmation
        const { data: recentConversation } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
          
        if (recentConversation) {
          await supabase
            .from('conversations')
            .update({
              pending_confirmation: null,
              pending_confirmation_created_at: null
            })
            .eq('id', recentConversation.id);
        }
        
        return {
          success: true,
          message: "No problem! I've kept your existing information unchanged.",
          action: 'cancelled'
        };
      }

      // User confirmed, retrieve pending confirmation from DB
      const { data: recentConversation, error: convError } = await supabase
        .from('conversations')
        .select('id, pending_confirmation, pending_confirmation_created_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();
        
      if (convError || !recentConversation || !recentConversation.pending_confirmation) {
        // Fallback to confirmationData if provided (backward compatibility)
        if (!confirmationData) {
          return {
            success: false,
            error: "No pending confirmation found. Please try updating your profile again."
          };
        }
        // Use the provided confirmationData as fallback
        const result = await performProfileUpdate(confirmationData, supabase, user.id);
        
        if (result.success) {
          return {
            ...result,
            message: "Perfect! I've updated your profile with the new information.",
            action: 'updated'
          };
        } else {
          return result;
        }
      }
      
      // Check if confirmation is expired (5 minutes)
      const createdAt = new Date(recentConversation.pending_confirmation_created_at);
      const now = new Date();
      const diffMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
      
      if (diffMinutes > 5) {
        // Clear expired confirmation
        await supabase
          .from('conversations')
          .update({
            pending_confirmation: null,
            pending_confirmation_created_at: null
          })
          .eq('id', recentConversation.id);
          
        return {
          success: false,
          error: "The confirmation has expired. Please try updating your profile again."
        };
      }

      // Perform the update with the stored confirmation data
      const result = await performProfileUpdate(recentConversation.pending_confirmation, supabase, user.id);
      
      if (result.success) {
        // Clear the pending confirmation after successful update
        await supabase
          .from('conversations')
          .update({
            pending_confirmation: null,
            pending_confirmation_created_at: null
          })
          .eq('id', recentConversation.id);
          
        return {
          ...result,
          message: "Perfect! I've updated your profile with the new information.",
          action: 'updated'
        };
      } else {
        return result;
      }

    } catch (error) {
      return {
        success: false,
        error: 'Failed to handle confirmation response'
      };
    }
  }
});
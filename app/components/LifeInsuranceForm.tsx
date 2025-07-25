'use client'

import { useState, useEffect } from 'react'
import { FormFieldDefinition, UserProfileData } from '@/app/api/chat/tools/collectLifeInsuranceInfo'

interface LifeInsuranceFormProps {
  userData: UserProfileData & {
    smoking_status?: boolean;
    occupation?: string;
    coverage_amount?: number;
    policy_term?: number;
  };
  fieldsToShow: FormFieldDefinition[];
  sessionId: string;
  onSubmit: (data: any) => void;
}

export default function LifeInsuranceForm({ 
  userData, 
  fieldsToShow, 
  sessionId, 
  onSubmit 
}: LifeInsuranceFormProps) {
  const [formData, setFormData] = useState<any>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showHealthIssues, setShowHealthIssues] = useState(false)
  const [newHealthIssue, setNewHealthIssue] = useState('')

  // Initialize form data with existing values
  useEffect(() => {
    const initialData: any = {}
    fieldsToShow.forEach(field => {
      if (field.currentValue !== null && field.currentValue !== undefined) {
        initialData[field.fieldName] = field.currentValue
      }
    })
    setFormData(initialData)
  }, [fieldsToShow])

  // Check if we can proceed (have required fields)
  const canProceed = () => {
    const requiredFields = fieldsToShow.filter(f => f.required)
    return requiredFields.every(field => {
      const value = formData[field.fieldName]
      return value !== undefined && value !== null && value !== ''
    })
  }

  // Validate a single field
  const validateField = (fieldName: string, value: any, required: boolean) => {
    if (required && (value === undefined || value === null || value === '')) {
      return 'This field is required'
    }
    return ''
  }

  // Handle field change
  const handleFieldChange = (fieldName: string, value: any, required: boolean) => {
    setFormData((prev: any) => ({ ...prev, [fieldName]: value }))
    
    // Validate on change for required fields
    if (required) {
      const error = validateField(fieldName, value, required)
      setErrors(prev => ({ ...prev, [fieldName]: error }))
    }
  }

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validate all required fields
    const newErrors: Record<string, string> = {}
    fieldsToShow.forEach(field => {
      if (field.required) {
        const error = validateField(field.fieldName, formData[field.fieldName], field.required)
        if (error) {
          newErrors[field.fieldName] = error
        }
      }
    })

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Submit form data
    onSubmit({
      sessionId,
      formData: {
        ...formData,
        // Ensure boolean values are properly formatted
        smoking_status: formData.smoking_status === 'true' ? true : formData.smoking_status === 'false' ? false : formData.smoking_status,
        is_married: formData.is_married === 'true' ? true : formData.is_married === 'false' ? false : formData.is_married === 'null' ? null : formData.is_married
      }
    })
  }

  // Handle adding health issues
  const handleAddHealthIssue = () => {
    if (newHealthIssue.trim()) {
      const currentIssues = formData.issues || []
      handleFieldChange('issues', [...currentIssues, newHealthIssue.trim()], false)
      setNewHealthIssue('')
    }
  }

  // Handle removing health issues
  const handleRemoveHealthIssue = (index: number) => {
    const currentIssues = formData.issues || []
    const newIssues = currentIssues.filter((_: any, i: number) => i !== index)
    handleFieldChange('issues', newIssues, false)
  }

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Render field based on type
  const renderField = (field: FormFieldDefinition) => {
    const baseInputClasses = "w-full px-4 py-3.5 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl text-white placeholder-white/40 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all duration-300 font-medium tracking-wide shadow-inner"
    
    switch (field.fieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.fieldName] || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field.required)}
            placeholder={field.placeholder}
            className={baseInputClasses}
          />
        )

      case 'number':
        return (
          <div className="relative">
            {field.fieldName.includes('amount') || field.fieldName.includes('income') ? (
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 font-medium">₹</span>
            ) : null}
            <input
              type="number"
              value={formData[field.fieldName] || ''}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value ? Number(e.target.value) : null, field.required)}
              placeholder={field.placeholder}
              className={`${baseInputClasses} ${
                field.fieldName.includes('amount') || field.fieldName.includes('income') ? 'pl-10' : ''
              }`}
            />
          </div>
        )

      case 'date':
        return (
          <input
            type="date"
            value={formData[field.fieldName] || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field.required)}
            max={new Date().toISOString().split('T')[0]}
            className={baseInputClasses}
          />
        )

      case 'boolean':
        return (
          <div className="flex gap-3">
            {field.options?.map((option: any) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleFieldChange(field.fieldName, option.value, field.required)}
                className={`flex-1 px-4 py-3.5 rounded-2xl border font-medium tracking-wide transition-all duration-300 ${
                  formData[field.fieldName] === option.value
                    ? 'bg-gradient-to-r from-orange-500 to-red-500 border-orange-500/50 text-white shadow-lg transform scale-[1.02]'
                    : 'bg-white/5 border-white/10 text-white/80 hover:border-white/20 hover:bg-white/10'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        )

      case 'select':
        return (
          <select
            value={formData[field.fieldName] || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field.required)}
            className={`${baseInputClasses} cursor-pointer`}
          >
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'array':
        // Special handling for health issues
        if (field.fieldName === 'issues') {
          const issues = formData.issues || []
          return (
            <div className="border border-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium">Pre-existing Health Conditions</label>
                <span className="text-xs text-gray-500">Optional</span>
              </div>
              
              {issues.length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">{field.helpText}</p>
              ) : (
                <div className="flex flex-wrap gap-2 mb-3">
                  {issues.map((issue: string, index: number) => (
                    <span key={index} className="px-3 py-1 bg-gray-700 rounded-full text-sm flex items-center gap-2">
                      {issue}
                      <button
                        type="button"
                        onClick={() => handleRemoveHealthIssue(index)}
                        className="text-gray-400 hover:text-red-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {!showHealthIssues ? (
                <button
                  type="button"
                  onClick={() => setShowHealthIssues(true)}
                  className="text-blue-400 text-sm hover:text-blue-300"
                >
                  + Add health conditions
                </button>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newHealthIssue}
                    onChange={(e) => setNewHealthIssue(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddHealthIssue())}
                    placeholder="e.g., Diabetes, Hypertension"
                    className="flex-1 px-3 py-1 bg-[#2a2a2a] border border-gray-700 rounded text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddHealthIssue}
                    className="px-3 py-1 bg-blue-500 rounded text-sm"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowHealthIssues(false)}
                    className="px-3 py-1 bg-gray-700 rounded text-sm"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          )
        }
        return null

      default:
        return null
    }
  }

  // Group fields by category
  const requiredFields = fieldsToShow.filter(f => f.required)
  const profileFields = fieldsToShow.filter(f => 
    !f.required && ['dob', 'gender', 'annual_income', 'city', 'is_married', 'issues'].includes(f.fieldName)
  )
  const coverageFields = fieldsToShow.filter(f => 
    !f.required && ['coverage_amount', 'policy_term'].includes(f.fieldName)
  )

  return (
    <div className="w-full max-w-4xl mx-auto px-4">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl p-8 rounded-3xl border border-white/10 mb-8 shadow-2xl">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-indigo-600/10 rounded-3xl"></div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.031 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white/90 tracking-tight">Life Insurance Consultation</h3>
              <p className="text-sm text-white/60">Personalized coverage for your future</p>
            </div>
          </div>

        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Required Fields Section */}
        {requiredFields.length > 0 && (
          <div className="relative bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-red-500/5 to-pink-500/5 rounded-3xl"></div>
            <div className="relative">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white tracking-tight">Essential Information</h4>
                  <p className="text-sm text-white/60">Four key details for accurate premium calculation</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                {requiredFields.map(field => (
                  <div key={field.fieldName} className="space-y-3">
                    <label className="block text-sm font-medium text-white/80 tracking-wide">
                      {field.fieldName.split('_').map(word => 
                        word.charAt(0).toUpperCase() + word.slice(1)
                      ).join(' ')}
                      <span className="text-orange-400 ml-1.5">•</span>
                    </label>
                    <div className="relative group">
                      {renderField(field)}
                      {errors[field.fieldName] && (
                        <div className="absolute -bottom-6 left-0 flex items-center gap-1">
                          <svg className="w-3 h-3 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" />
                          </svg>
                          <p className="text-xs text-red-400 font-medium">{errors[field.fieldName]}</p>
                        </div>
                      )}
                    </div>
                    {field.helpText && !errors[field.fieldName] && (
                      <p className="text-xs text-white/50 leading-relaxed">{field.helpText}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Optional Profile Fields */}
        {profileFields.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-800 p-6">
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Additional Information</h4>
            <p className="text-sm text-gray-500 mb-4">
              Provide more details for accurate quotes (all optional)
            </p>
            <div className="space-y-4">
              {profileFields.map(field => (
                <div key={field.fieldName}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.fieldName === 'dob' ? 'Date of Birth' :
                     field.fieldName === 'is_married' ? 'Marital Status' :
                     field.fieldName.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                    <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                  </label>
                  {renderField(field)}
                  {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Coverage Preferences */}
        {coverageFields.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-800 p-6">
            <h4 className="text-lg font-semibold text-gray-300 mb-2">Coverage Preferences</h4>
            <p className="text-sm text-gray-500 mb-3">
              Optional: We'll use smart defaults if you don't specify these
            </p>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-300">
                  <p className="font-medium mb-1">Smart Defaults:</p>
                  <p>• Coverage: 12x your annual income (industry standard)</p>
                  <p>• Term: Age-appropriate duration for retirement planning</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              {coverageFields.map(field => (
                <div key={field.fieldName}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.fieldName.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                    <span className="text-gray-500 text-xs ml-2">(Optional)</span>
                  </label>
                  {renderField(field)}
                  {field.helpText && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="relative">
          <button
            type="submit"
            disabled={!canProceed()}
            className={`w-full py-4 rounded-2xl font-semibold tracking-wide transition-all duration-300 shadow-lg ${
              canProceed()
                ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 hover:from-orange-600 hover:via-red-600 hover:to-pink-600 text-white transform hover:scale-[1.02] hover:shadow-xl'
                : 'bg-white/5 border border-white/10 text-white/40 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {canProceed() ? (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Get Premium Quotes
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Complete Required Fields
                </>
              )}
            </div>
          </button>
          
          {canProceed() && (
            <p className="text-xs text-white/50 text-center mt-4 font-medium">
              Enhanced accuracy with optional details above
            </p>
          )}
        </div>
      </form>
    </div>
  )
}
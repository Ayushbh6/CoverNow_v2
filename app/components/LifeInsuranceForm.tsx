'use client'

import { useState, useEffect } from 'react'
import { FormFieldDefinition, UserProfileData } from '@/app/api/chat/tools/bookLifeInsurance'

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
    setFormData(prev => ({ ...prev, [fieldName]: value }))
    
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
    const newIssues = currentIssues.filter((_, i) => i !== index)
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
    switch (field.fieldType) {
      case 'text':
        return (
          <input
            type="text"
            value={formData[field.fieldName] || ''}
            onChange={(e) => handleFieldChange(field.fieldName, e.target.value, field.required)}
            placeholder={field.placeholder}
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
          />
        )

      case 'number':
        return (
          <div className="relative">
            {field.fieldName.includes('amount') || field.fieldName.includes('income') ? (
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
            ) : null}
            <input
              type="number"
              value={formData[field.fieldName] || ''}
              onChange={(e) => handleFieldChange(field.fieldName, e.target.value ? Number(e.target.value) : null, field.required)}
              placeholder={field.placeholder}
              className={`w-full px-3 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400 ${
                field.fieldName.includes('amount') || field.fieldName.includes('income') ? 'pl-8' : ''
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
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
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
                className={`flex-1 px-4 py-2 rounded-lg border transition-colors ${
                  formData[field.fieldName] === option.value
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-[#2a2a2a] border-gray-700 text-gray-300 hover:border-gray-600'
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
            className="w-full px-3 py-2 bg-[#2a2a2a] border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-400"
          >
            {field.options?.map((option: any) => (
              <option key={option.value} value={option.value}>
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
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-6 rounded-xl border border-gray-800 mb-6">
        <h3 className="text-lg font-semibold text-gray-300 mb-2">Getting Life Insurance Quotes for:</h3>
        <p className="text-2xl font-bold text-white">{userData.first_name} {userData.last_name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Required Fields Section */}
        {requiredFields.length > 0 && (
          <div className="bg-[#2a2a2a] rounded-xl border border-gray-800 p-6">
            <h4 className="text-lg font-semibold text-orange-400 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Required Information
            </h4>
            <div className="space-y-4">
              {requiredFields.map(field => (
                <div key={field.fieldName}>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    {field.fieldName.split('_').map(word => 
                      word.charAt(0).toUpperCase() + word.slice(1)
                    ).join(' ')}
                    <span className="text-red-500 ml-1">*</span>
                  </label>
                  {renderField(field)}
                  {field.helpText && !errors[field.fieldName] && (
                    <p className="text-xs text-gray-500 mt-1">{field.helpText}</p>
                  )}
                  {errors[field.fieldName] && (
                    <p className="text-xs text-red-400 mt-1">{errors[field.fieldName]}</p>
                  )}
                </div>
              ))}
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
            <p className="text-sm text-gray-500 mb-4">
              Help us recommend the right coverage (optional)
            </p>
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
        <button
          type="submit"
          disabled={!canProceed()}
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            canProceed()
              ? 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white'
              : 'bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
        >
          {canProceed() ? 'Get Insurance Quotes' : 'Please fill required fields'}
        </button>

        {canProceed() && (
          <p className="text-xs text-gray-500 text-center">
            Fill more fields above for more accurate quotes
          </p>
        )}
      </form>
    </div>
  )
}
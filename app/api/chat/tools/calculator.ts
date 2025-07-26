import { z } from 'zod';
import { tool, jsonSchema } from 'ai';

// Schema for calculator parameters
export const calculatorSchema = jsonSchema({
  type: 'object',
  properties: {
    expression: {
      type: 'string',
      description: 'The mathematical expression to evaluate. Supports: +, -, *, /, ^, %, (), sqrt(), sin(), cos(), tan(), log(), ln(), abs(), round(), floor(), ceil(), min(), max(), PI, E'
    },
    variables: {
      type: 'object',
      additionalProperties: { type: 'number' },
      description: 'Optional variables to use in the expression (e.g., {"x": 5, "y": 10} for expression "x + y")'
    }
  },
  required: ['expression'],
  additionalProperties: false,
  description: 'Perform complex mathematical calculations with support for various operations and functions'
});

// Zod schema for validation
const calculatorZodSchema = z.object({
  expression: z.string().min(1, 'Expression cannot be empty'),
  variables: z.record(z.string(), z.number()).optional()
});

// Type for calculator response
export interface CalculatorResponse {
  expression: string;
  result: number;
  formattedResult: string;
  steps?: string[];
  error?: string;
}

// Safe math evaluator - prevents code injection
function safeMathEval(expression: string, variables?: Record<string, number>): number {
  // Replace variables in expression
  let processedExpression = expression;
  if (variables) {
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      processedExpression = processedExpression.replace(regex, value.toString());
    });
  }

  // Define allowed math functions
  const mathFunctions = {
    sqrt: Math.sqrt,
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    log: Math.log10,
    ln: Math.log,
    abs: Math.abs,
    round: Math.round,
    floor: Math.floor,
    ceil: Math.ceil,
    min: Math.min,
    max: Math.max,
    pow: Math.pow,
    PI: Math.PI,
    E: Math.E
  };

  // Replace power operator
  processedExpression = processedExpression.replace(/\^/g, '**');

  // Replace math functions and constants
  Object.entries(mathFunctions).forEach(([func, impl]) => {
    if (typeof impl === 'function') {
      const regex = new RegExp(`\\b${func}\\s*\\(`, 'g');
      processedExpression = processedExpression.replace(regex, `mathFunctions.${func}(`);
    } else {
      const regex = new RegExp(`\\b${func}\\b`, 'g');
      processedExpression = processedExpression.replace(regex, impl.toString());
    }
  });

  // Validate expression contains only allowed characters
  if (!/^[\d\s\+\-\*\/\%\^\(\)\.\,mathFunctions]*$/.test(processedExpression)) {
    throw new Error('Invalid characters in expression');
  }

  try {
    // Create a function that only has access to Math functions
    const func = new Function('mathFunctions', `return ${processedExpression}`);
    return func(mathFunctions);
  } catch (error) {
    throw new Error('Invalid mathematical expression');
  }
}

// Format number for display
function formatNumber(num: number): string {
  if (Number.isInteger(num)) {
    return num.toLocaleString('en-IN');
  }
  
  // For decimals, show up to 6 decimal places, but remove trailing zeros
  const formatted = num.toFixed(6).replace(/\.?0+$/, '');
  
  // Add Indian number formatting
  const parts = formatted.split('.');
  parts[0] = parseInt(parts[0]).toLocaleString('en-IN');
  return parts.join('.');
}

export const calculatorTool = tool({
  schema: calculatorZodSchema,
  name: 'calculator',
  description: 'Perform complex mathematical calculations including basic arithmetic, trigonometry, logarithms, and more',
  execute: async (params): Promise<CalculatorResponse> => {
    const { expression, variables } = params;
    
    try {
      const result = safeMathEval(expression, variables);
      
      // Check for invalid results
      if (!isFinite(result)) {
        throw new Error('Result is not a finite number');
      }
      
      return {
        expression: expression,
        result: result,
        formattedResult: formatNumber(result)
      };
    } catch (error) {
      return {
        expression: expression,
        result: 0,
        formattedResult: '0',
        error: error instanceof Error ? error.message : 'Calculation error'
      };
    }
  }
});
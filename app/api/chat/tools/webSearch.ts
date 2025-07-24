import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { tavily } from '@tavily/core';

// Schema for web search parameters
export const webSearchFastSchema = jsonSchema({
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The search query to find information on the web. IMPORTANT: Always include the current year (e.g., 2025) for current/latest information queries'
    },
    searchDepth: {
      type: 'string',
      enum: ['basic', 'advanced'],
      default: 'advanced',
      description: 'The depth of search - advanced provides more comprehensive results'
    },
    topic: {
      type: 'string',
      enum: ['general', 'news'],
      default: 'general',
      description: 'The type of search - general or news'
    }
  },
  required: ['query'],
  additionalProperties: false,
  description: 'Search the web for information using Tavily advanced search'
});

// Zod schema for validation
const webSearchFastZodSchema = z.object({
  query: z.string().min(1, 'Search query cannot be empty'),
  searchDepth: z.enum(['basic', 'advanced']).default('advanced'),
  topic: z.enum(['general', 'news']).default('general')
});

// Type for search results
export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
  author?: string;
  images?: string[];
}

export interface WebSearchResponse {
  success: boolean;
  query: string;
  results: SearchResult[];
  answer?: string;
  error?: string;
}

// Function to determine relevant domains based on query context
function getIncludeDomains(query: string): string[] | undefined {
  const lowerQuery = query.toLowerCase();
  
  // Insurance-related domains
  if (lowerQuery.includes('insurance') || lowerQuery.includes('policy') || lowerQuery.includes('premium')) {
    const domains = [
      'irdai.gov.in',
      'policybazaar.com',
      'coverfox.com',
      'bankbazaar.com',
      'acko.com',
      'licindia.in',
      'hdfclife.com',
      'iciciprulife.com',
      'maxlifeinsurance.com',
      'bajajallianz.com',
      'tataaig.com',
      'economictimes.indiatimes.com',
      'moneycontrol.com',
      'financialexpress.com',
      'livemint.com'
    ];
    
    // Add specific company domains if mentioned
    if (lowerQuery.includes('hdfc')) domains.push('hdfcergo.com', 'hdfclife.com');
    if (lowerQuery.includes('icici')) domains.push('icicilombard.com', 'iciciprulife.com');
    if (lowerQuery.includes('bajaj')) domains.push('bajajallianz.com', 'bajajfinserv.in');
    if (lowerQuery.includes('tata')) domains.push('tataaig.com');
    if (lowerQuery.includes('max')) domains.push('maxlifeinsurance.com', 'maxbupa.com');
    
    return domains;
  }
  
  // Health/medical domains
  if (lowerQuery.includes('health') || lowerQuery.includes('medical') || lowerQuery.includes('disease') || lowerQuery.includes('diabetes') || lowerQuery.includes('hypertension')) {
    return [
      'healthline.com',
      'webmd.com',
      'mayoclinic.org',
      'nih.gov',
      'who.int',
      'apollohospitals.com',
      'fortishealthcare.com',
      'maxhealthcare.in',
      'nhp.gov.in',
      'mohfw.gov.in'
    ];
  }
  
  // Government/regulatory domains
  if (lowerQuery.includes('irdai') || lowerQuery.includes('regulation') || lowerQuery.includes('government')) {
    return [
      'irdai.gov.in',
      'india.gov.in',
      'mygov.in',
      'pib.gov.in',
      'financialservices.gov.in'
    ];
  }
  
  // Financial/investment domains
  if (lowerQuery.includes('investment') || lowerQuery.includes('mutual fund') || lowerQuery.includes('tax')) {
    return [
      'sebi.gov.in',
      'nseindia.com',
      'bseindia.com',
      'amfiindia.com',
      'incometaxindia.gov.in',
      'cleartax.in',
      'taxguru.in',
      'economictimes.indiatimes.com',
      'moneycontrol.com',
      'valueresearchonline.com'
    ];
  }
  
  // Default to undefined to let Tavily search broadly
  return undefined;
}

// Tool: Web Search Fast
export const webSearchFastTool = tool({
  description: 'Search the web for current information, news, facts, or any topic using Tavily advanced search. Use this when you need up-to-date information or when asked about topics beyond your knowledge cutoff.',
  parameters: webSearchFastSchema,
  execute: async (params) => {
    try {
      // Validate parameters
      const validatedParams = webSearchFastZodSchema.parse(params);
      
      // Check for API key
      const apiKey = process.env.TAVILY_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          query: validatedParams.query,
          results: [],
          error: 'Tavily API key not configured. Please set TAVILY_API_KEY in environment variables.'
        };
      }

      // Initialize Tavily client
      const tvly = tavily({ apiKey });

      // Get relevant domains based on query
      const includeDomains = getIncludeDomains(validatedParams.query);

      // Perform search with advanced mode and fixed 5 results
      const response = await tvly.search(validatedParams.query, {
        search_depth: validatedParams.searchDepth,
        max_results: 5, // Fixed at 5 results
        topic: validatedParams.topic as 'general' | 'news',
        include_answer: true,
        include_raw_content: true,
        include_images: true,
        ...(includeDomains && { include_domains: includeDomains })
      });

      // Transform results into our format
      const results: SearchResult[] = response.results.map((result: {
        title: string;
        url: string;
        content?: string;
        raw_content?: string;
        score?: number;
        published_date?: string;
        author?: string;
      }) => ({
        title: result.title,
        url: result.url,
        content: result.content || result.raw_content || '',
        score: result.score || 0,
        publishedDate: result.published_date,
        author: result.author,
        images: response.images?.filter((img: { url: string }) => 
          result.url === img.url || result.content?.includes(img.url)
        ).map((img: { url: string }) => img.url) || []
      }));

      // Add general images if no specific images found
      if (results.every(r => !r.images?.length) && response.images?.length) {
        // Distribute images across results
        response.images.forEach((img: { url: string }, idx: number) => {
          const resultIdx = idx % results.length;
          if (results[resultIdx]) {
            results[resultIdx].images = results[resultIdx].images || [];
            results[resultIdx].images!.push(img.url);
          }
        });
      }

      return {
        success: true,
        query: validatedParams.query,
        results,
        answer: response.answer
      } as WebSearchResponse;

    } catch (error) {
      console.error('Web search error:', error);
      
      if (error instanceof z.ZodError) {
        return {
          success: false,
          query: typeof params === 'object' && params !== null && 'query' in params ? params.query : '',
          results: [],
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        query: typeof params === 'object' && params !== null && 'query' in params ? params.query : '',
        results: [],
        error: error instanceof Error ? error.message : 'Failed to perform web search'
      };
    }
  }
});
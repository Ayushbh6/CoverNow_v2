import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { tavily } from '@tavily/core';

// Schema for web search parameters
export const webSearchFastSchema = jsonSchema({
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The search query to find information on the web'
    },
    searchDepth: {
      type: 'string',
      enum: ['basic', 'advanced'],
      default: 'advanced',
      description: 'The depth of search - advanced provides more comprehensive results'
    },
    maxResults: {
      type: 'number',
      minimum: 1,
      maximum: 5,
      default: 5,
      description: 'Maximum number of search results to return'
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
  maxResults: z.number().min(1).max(10).default(5),
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

      // Perform search with advanced mode
      const response = await tvly.search(validatedParams.query, {
        search_depth: validatedParams.searchDepth,
        max_results: validatedParams.maxResults,
        topic: validatedParams.topic as 'general' | 'news',
        include_answer: true,
        include_raw_content: true,
        include_images: true,
      });

      // Transform results into our format
      const results: SearchResult[] = response.results.map((result: any) => ({
        title: result.title,
        url: result.url,
        content: result.content || result.raw_content || '',
        score: result.score || 0,
        publishedDate: result.published_date,
        author: result.author,
        images: response.images?.filter((img: any) => 
          result.url === img.url || result.content?.includes(img.url)
        ).map((img: any) => img.url) || []
      }));

      // Add general images if no specific images found
      if (results.every(r => !r.images?.length) && response.images?.length) {
        // Distribute images across results
        response.images.forEach((img: any, idx: number) => {
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
          query: (params as any).query || '',
          results: [],
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        query: (params as any).query || '',
        results: [],
        error: error instanceof Error ? error.message : 'Failed to perform web search'
      };
    }
  }
});
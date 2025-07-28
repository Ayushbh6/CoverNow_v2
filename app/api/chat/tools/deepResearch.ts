import { z } from 'zod';
import { tool, jsonSchema } from 'ai';
import { tavily } from '@tavily/core';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { generateObject, generateText } from 'ai';
import { randomUUID } from 'crypto';

// Research session state management
const researchSessions = new Map<string, ResearchSession>();

// Schema for deep research initialization
export const deepResearchInitSchema = jsonSchema({
  type: 'object',
  properties: {
    query: {
      type: 'string',
      description: 'The main research topic or question that needs comprehensive investigation'
    },
    breadth: {
      type: 'number',
      minimum: 2,
      maximum: 4,
      default: 3,
      description: 'Number of search queries per level (AI will optimize between 2-4)'
    }
  },
  required: ['query'],
  additionalProperties: false,
  description: 'Initialize deep research session and perform reconnaissance phase'
});

// Schema for continuing research with session ID
export const deepResearchContinueSchema = jsonSchema({
  type: 'object',
  properties: {
    sessionId: {
      type: 'string',
      description: 'The research session ID from initialization'
    }
  },
  required: ['sessionId'],
  additionalProperties: false
});

// Zod schemas for validation
const deepResearchInitZodSchema = z.object({
  query: z.string().min(1, 'Research query cannot be empty'),
  breadth: z.number().min(2).max(4).default(3)
});

const deepResearchContinueZodSchema = z.object({
  sessionId: z.string().uuid('Invalid session ID')
});

// Types for research tracking
export interface ResearchNode {
  query: string;
  level: number;
  results: SearchResult[];
  learnings: Learning[];
  status: 'pending' | 'searching' | 'analyzing' | 'completed';
  timestamp: number;
}

export interface Learning {
  insight: string;
  followUpQuestions: string[];
  confidence: number;
  source: string;
}

export interface SearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  publishedDate?: string;
}

export interface ResearchAccumulator {
  originalQuery: string;
  reconnaissance: SearchResult[];
  researchNodes: ResearchNode[];
  visitedUrls: Set<string>;
  keyInsights: string[];
  recommendations: string[];
  totalSearches: number;
  startTime: number;
}

export interface DeepResearchResponse {
  success: boolean;
  query: string;
  totalSearches: number;
  duration: number;
  findings: {
    keyInsights: string[];
    recommendations: string[];
    comparisons?: any[];
    sources: {
      title: string;
      url: string;
      relevance: number;
    }[];
  };
  report: string;
  researchPath: string[];
  error?: string;
}

// Progress update for streaming
export interface DeepResearchProgress {
  sessionId: string;
  phase: 'reconnaissance' | 'level1' | 'level2' | 'synthesis';
  currentQuery?: string;
  status: string;
  progress: number;
  insights: number;
  totalSearches: number;
  duration: number;
}

// Research session state
export interface ResearchSession {
  id: string;
  accumulator: ResearchAccumulator;
  breadth: number;
  currentPhase: 'init' | 'reconnaissance' | 'level1' | 'level2' | 'synthesis' | 'completed';
  level1Queries?: string[];
  level2Queries?: string[];
  createdAt: number;
  lastUpdated: number;
}

// Initialize OpenRouter for GPT-4o-mini model
const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!
});

const model = openrouter.chat('openai/gpt-4.1-mini');

// Helper function to perform Tavily search
async function performSearch(
  query: string,
  searchDepth: 'basic' | 'advanced',
  maxResults: number = 5
): Promise<SearchResult[]> {
  const startTime = Date.now();
  console.log(`[DeepResearch] Starting search: "${query}" (depth: ${searchDepth}, max: ${maxResults})`);
  
  try {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      console.error('[DeepResearch] ERROR: Tavily API key not configured');
      throw new Error('Tavily API key not configured');
    }

    const tvly = tavily({ apiKey });
    
    console.log(`[DeepResearch] Calling Tavily API...`);
    const response = await tvly.search(query, {
      search_depth: searchDepth,
      max_results: maxResults,
      topic: 'general',
      include_answer: true,
      include_raw_content: true,
      include_images: false
    });
    
    const duration = Date.now() - startTime;
    console.log(`[DeepResearch] Search completed in ${duration}ms, got ${response.results?.length || 0} results`);
    
    return response.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.content || result.raw_content || '',
      score: result.score || 0,
      publishedDate: result.published_date
    }));
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[DeepResearch] ERROR in performSearch after ${duration}ms:`, error);
    console.error(`[DeepResearch] Error stack:`, error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

// Generate search queries based on context
async function generateSearchQueries(
  mainQuery: string,
  context: string,
  breadth: number
): Promise<string[]> {
  const { object } = await generateObject({
    model,
    system: `You are an expert insurance research assistant. Generate ${breadth} specific search queries based on the main query and context provided. 
    Focus on:
    - Current year (2025) information
    - Indian insurance market specifics
    - Regulatory aspects (IRDAI)
    - Practical consumer information
    Each query should explore a different aspect of the topic.`,
    prompt: `Main research topic: ${mainQuery}\n\nContext from initial search:\n${context}\n\nGenerate ${breadth} targeted search queries that will help build comprehensive knowledge about this topic.`,
    schema: z.object({
      queries: z.array(z.string()).length(breadth)
    })
  });
  
  return object.queries;
}

// Evaluate search results for relevance
async function evaluateRelevance(
  result: SearchResult,
  query: string,
  visitedUrls: Set<string>
): Promise<boolean> {
  // Skip if already visited
  if (visitedUrls.has(result.url)) {
    return false;
  }

  const { object } = await generateObject({
    model,
    prompt: `Evaluate if this search result is relevant for the query "${query}".
    
    Title: ${result.title}
    URL: ${result.url}
    Content preview: ${result.content.substring(0, 500)}
    
    Consider:
    - Is it about insurance in India?
    - Is the information current and accurate?
    - Does it provide valuable insights for the query?`,
    schema: z.object({
      relevant: z.boolean(),
      reason: z.string()
    })
  });

  return object.relevant;
}

// Extract learnings from search results
async function extractLearnings(
  result: SearchResult,
  query: string,
  mainTopic: string
): Promise<Learning> {
  const { object } = await generateObject({
    model,
    system: 'You are an expert at extracting key insurance insights and generating follow-up questions.',
    prompt: `Extract key learning from this search result about "${query}" (main topic: "${mainTopic}").
    
    Title: ${result.title}
    Content: ${result.content}
    
    Provide:
    1. One key insight that directly helps answer the research question
    2. 2-3 follow-up questions that would deepen understanding
    3. Confidence score (0-1) based on source authority and content quality`,
    schema: z.object({
      insight: z.string(),
      followUpQuestions: z.array(z.string()).min(2).max(3),
      confidence: z.number().min(0).max(1)
    })
  });

  return {
    ...object,
    source: result.url
  };
}

// Generate final research report
async function generateReport(accumulator: ResearchAccumulator): Promise<string> {
  const { text } = await generateText({
    model,
    system: `You are an expert insurance analyst creating a research output. Today is ${new Date().toLocaleDateString('en-IN')}.
    
    CRITICAL: Analyze the user's original query to determine the BEST output format:
    
    1. If user asks for "comparison" or "compare" → Create a comparison table/matrix
    2. If user asks about "options" or "alternatives" → Create a structured list with pros/cons
    3. If user asks "which is best" or "recommend" → Create a ranked recommendation list
    4. If user asks "how to" or process questions → Create a step-by-step guide
    5. If user asks about costs/premiums → Create a pricing breakdown table
    6. If user asks general questions → Create a comprehensive report
    
    Use rich markdown formatting:
    - Tables for comparisons
    - Bullet points for lists
    - Bold for important points
    - Headers for sections
    - Blockquotes for key insights
    - Code blocks for calculations/formulas if needed
    
    Make the output visually appealing and easy to scan.`,
    prompt: `Original User Query: "${accumulator.originalQuery}"
    
    Based on this query, create the output in the MOST APPROPRIATE FORMAT that directly answers what the user is asking for.
    
    Key Insights Found:
    ${accumulator.keyInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}
    
    Recommendations:
    ${accumulator.recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\n')}
    
    Research Details:
    ${accumulator.researchNodes.map(node => 
      `- ${node.query}: Found ${node.results.length} relevant results with key findings`
    ).join('\n')}
    
    Important: The user asked "${accumulator.originalQuery}" - make sure your output format directly addresses this specific need.`
  });

  return text;
}

// Session cleanup - remove sessions older than 30 minutes
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of researchSessions.entries()) {
    if (now - session.lastUpdated > 30 * 60 * 1000) {
      researchSessions.delete(id);
    }
  }
}, 5 * 60 * 1000); // Run every 5 minutes

// Helper to get current progress for a session
// Currently unused but keeping for future monitoring features
/* function getSessionProgress(session: ResearchSession): DeepResearchProgress {
  const duration = Math.round((Date.now() - session.accumulator.startTime) / 1000);
  const phaseMap: Record<string, DeepResearchProgress['phase']> = {
    'reconnaissance': 'reconnaissance',
    'level1': 'level1',
    'level2': 'level2',
    'synthesis': 'synthesis'
  };
  
  // Calculate completed searches based on phase
  let completedSearches = 0;
  if (session.currentPhase !== 'init') {
    completedSearches = session.accumulator.totalSearches;
  }
  
  return {
    sessionId: session.id,
    phase: phaseMap[session.currentPhase] || 'reconnaissance',
    status: 'In progress...',
    progress: 0,
    insights: session.accumulator.keyInsights.length,
    totalSearches: completedSearches,
    duration
  };
} */

// Phase 1: Initialize and Reconnaissance
async function initializeAndReconnaissance(
  query: string,
  breadth: number
): Promise<{ sessionId: string; progress: DeepResearchProgress; reconContext: string }> {
  const sessionId = randomUUID();
  const startTime = Date.now();
  console.log(`\n[DeepResearch] === PHASE 1: INIT & RECONNAISSANCE ===`);
  console.log(`[DeepResearch] Session ID: ${sessionId}`);
  console.log(`[DeepResearch] Query: "${query}"`);
  console.log(`[DeepResearch] Breadth: ${breadth}`);
  
  const accumulator: ResearchAccumulator = {
    originalQuery: query,
    reconnaissance: [],
    researchNodes: [],
    visitedUrls: new Set(),
    keyInsights: [],
    recommendations: [],
    totalSearches: 0,
    startTime
  };

  const session: ResearchSession = {
    id: sessionId,
    accumulator,
    breadth,
    currentPhase: 'reconnaissance',
    createdAt: startTime,
    lastUpdated: startTime
  };

  researchSessions.set(sessionId, session);

  try {
    console.log(`[DeepResearch] Starting reconnaissance search...`);
    const reconResults = await performSearch(query, 'basic', 5);
    
    accumulator.reconnaissance = reconResults;
    accumulator.totalSearches += 1;
    console.log(`[DeepResearch] Reconnaissance complete: ${reconResults.length} results`);

    // Mark reconnaissance URLs as visited
    reconResults.forEach(r => accumulator.visitedUrls.add(r.url));

    // Build context from reconnaissance
    const reconContext = reconResults
      .map(r => `${r.title}: ${r.content.substring(0, 200)}`)
      .join('\n\n');

    // Generate Level 1 queries based on reconnaissance
    console.log(`[DeepResearch] Generating Level 1 queries...`);
    const level1Queries = await generateSearchQueries(
      query,
      reconContext,
      breadth
    );
    console.log(`[DeepResearch] Generated ${level1Queries.length} queries:`, level1Queries);

    session.level1Queries = level1Queries;
    session.currentPhase = 'level1';
    session.lastUpdated = Date.now();

    const progress: DeepResearchProgress = {
      sessionId,
      phase: 'reconnaissance',
      status: 'Reconnaissance complete. Ready for Level 1 research.',
      progress: 10,
      insights: 0,
      totalSearches: accumulator.totalSearches,
      duration: Math.round((Date.now() - startTime) / 1000)
    };

    return { sessionId, progress, reconContext };
  } catch (error) {
    researchSessions.delete(sessionId);
    throw error;
  }
}

// Phase 2: Level 1 Research
async function performLevel1Research(sessionId: string): Promise<DeepResearchProgress> {
  console.log(`\n[DeepResearch] === PHASE 2: LEVEL 1 RESEARCH ===`);
  console.log(`[DeepResearch] Session ID: ${sessionId}`);
  
  const session = researchSessions.get(sessionId);
  if (!session) {
    console.error(`[DeepResearch] ERROR: Session ${sessionId} not found`);
    throw new Error('Research session not found. Please start with deepResearchInit.');
  }

  if (session.currentPhase !== 'level1') {
    throw new Error(`Invalid phase transition. Expected level1, but session is in ${session.currentPhase}`);
  }

  if (!session.level1Queries) {
    throw new Error('Level 1 queries not generated. Session may be corrupted.');
  }

  const { accumulator } = session;

  try {
    // Execute Level 1 searches
    console.log(`[DeepResearch] Starting ${session.level1Queries.length} Level 1 searches...`);
    for (let i = 0; i < session.level1Queries.length; i++) {
      const query = session.level1Queries[i];
      console.log(`[DeepResearch] Level 1 Search ${i + 1}/${session.level1Queries.length}: "${query}"`);
      
      const node: ResearchNode = {
        query,
        level: 1,
        results: [],
        learnings: [],
        status: 'searching',
        timestamp: Date.now()
      };

      const searchResults = await performSearch(query, 'advanced', 5);
      accumulator.totalSearches += 1;
      console.log(`[DeepResearch] Got ${searchResults.length} results for query ${i + 1}`);

      // Filter for relevance
      node.status = 'analyzing';
      console.log(`[DeepResearch] Analyzing relevance of ${searchResults.length} results...`);
      let relevantCount = 0;
      for (const result of searchResults) {
        const isRelevant = await evaluateRelevance(
          result,
          query,
          accumulator.visitedUrls
        );

        if (isRelevant) {
          relevantCount++;
          node.results.push(result);
          accumulator.visitedUrls.add(result.url);

          // Extract learnings
          console.log(`[DeepResearch] Extracting learnings from: ${result.title}`);
          const learning = await extractLearnings(result, query, accumulator.originalQuery);
          node.learnings.push(learning);
          
          // Add high-confidence insights
          if (learning.confidence > 0.7) {
            accumulator.keyInsights.push(learning.insight);
            console.log(`[DeepResearch] Added high-confidence insight (${learning.confidence}): ${learning.insight.substring(0, 50)}...`);
          }
        }
      }

      node.status = 'completed';
      accumulator.researchNodes.push(node);
      console.log(`[DeepResearch] Query ${i + 1} complete: ${relevantCount}/${searchResults.length} relevant results`);
    }

    // Collect all follow-up questions from Level 1
    const allFollowUpQuestions = accumulator.researchNodes
      .flatMap(node => node.learnings.flatMap(l => l.followUpQuestions))
      .filter((q, i, arr) => arr.indexOf(q) === i) // Remove duplicates
      .slice(0, session.breadth); // Limit to breadth parameter

    session.level2Queries = allFollowUpQuestions;
    session.currentPhase = 'level2';
    session.lastUpdated = Date.now();

    const progress: DeepResearchProgress = {
      sessionId,
      phase: 'level1',
      status: 'Level 1 research complete. Ready for Level 2 deep dive.',
      progress: 40,
      insights: accumulator.keyInsights.length,
      totalSearches: accumulator.totalSearches,
      duration: Math.round((Date.now() - accumulator.startTime) / 1000)
    };

    return progress;
  } catch (error) {
    const duration = Math.round((Date.now() - accumulator.startTime) / 1000);
    console.error(`[DeepResearch] ERROR in Level 1 after ${duration}s:`, error);
    console.error(`[DeepResearch] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

// Phase 3: Level 2 Research
async function performLevel2Research(sessionId: string): Promise<DeepResearchProgress> {
  console.log(`\n[DeepResearch] === PHASE 3: LEVEL 2 RESEARCH ===`);
  console.log(`[DeepResearch] Session ID: ${sessionId}`);
  
  const session = researchSessions.get(sessionId);
  if (!session) {
    console.error(`[DeepResearch] ERROR: Session ${sessionId} not found`);
    throw new Error('Research session not found. Please start with deepResearchInit.');
  }

  if (session.currentPhase !== 'level2') {
    throw new Error(`Invalid phase transition. Expected level2, but session is in ${session.currentPhase}`);
  }

  if (!session.level2Queries) {
    throw new Error('Level 2 queries not generated. Session may be corrupted.');
  }

  const { accumulator } = session;

  try {
    // Execute Level 2 searches
    console.log(`[DeepResearch] Starting ${session.level2Queries.length} Level 2 searches...`);
    for (let i = 0; i < session.level2Queries.length; i++) {
      const query = session.level2Queries[i];
      console.log(`[DeepResearch] Level 2 Search ${i + 1}/${session.level2Queries.length}: "${query}"`);
      
      const node: ResearchNode = {
        query,
        level: 2,
        results: [],
        learnings: [],
        status: 'searching',
        timestamp: Date.now()
      };

      const searchResults = await performSearch(query, 'advanced', 3);
      accumulator.totalSearches += 1;
      console.log(`[DeepResearch] Got ${searchResults.length} results for query ${i + 1}`);

      node.status = 'analyzing';
      console.log(`[DeepResearch] Analyzing relevance of ${searchResults.length} results...`);
      let relevantCount = 0;
      for (const result of searchResults) {
        const isRelevant = await evaluateRelevance(
          result,
          query,
          accumulator.visitedUrls
        );

        if (isRelevant) {
          relevantCount++;
          node.results.push(result);
          accumulator.visitedUrls.add(result.url);

          console.log(`[DeepResearch] Extracting learnings from: ${result.title}`);
          const learning = await extractLearnings(result, query, accumulator.originalQuery);
          node.learnings.push(learning);
          
          if (learning.confidence > 0.7) {
            accumulator.keyInsights.push(learning.insight);
            console.log(`[DeepResearch] Added high-confidence insight (${learning.confidence}): ${learning.insight.substring(0, 50)}...`);
          }
        }
      }

      node.status = 'completed';
      accumulator.researchNodes.push(node);
      console.log(`[DeepResearch] Query ${i + 1} complete: ${relevantCount}/${searchResults.length} relevant results`);
    }

    session.currentPhase = 'synthesis';
    session.lastUpdated = Date.now();

    const progress: DeepResearchProgress = {
      sessionId,
      phase: 'level2',
      status: 'Level 2 research complete. Ready for synthesis.',
      progress: 70,
      insights: accumulator.keyInsights.length,
      totalSearches: accumulator.totalSearches,
      duration: Math.round((Date.now() - accumulator.startTime) / 1000)
    };

    return progress;
  } catch (error) {
    const duration = Math.round((Date.now() - accumulator.startTime) / 1000);
    console.error(`[DeepResearch] ERROR in Level 2 after ${duration}s:`, error);
    console.error(`[DeepResearch] Stack trace:`, error instanceof Error ? error.stack : 'No stack trace available');
    throw error;
  }
}

// Phase 4: Synthesis and Report Generation
async function synthesizeResearch(sessionId: string): Promise<DeepResearchResponse> {
  console.log(`\n[DeepResearch] === PHASE 4: SYNTHESIS ===`);
  console.log(`[DeepResearch] Session ID: ${sessionId}`);
  
  const session = researchSessions.get(sessionId);
  if (!session) {
    console.error(`[DeepResearch] ERROR: Session ${sessionId} not found`);
    throw new Error('Research session not found. Please start with deepResearchInit.');
  }

  if (session.currentPhase !== 'synthesis') {
    throw new Error(`Invalid phase transition. Expected synthesis, but session is in ${session.currentPhase}`);
  }

  const { accumulator } = session;

  try {
    // Generate recommendations based on all findings
    console.log(`[DeepResearch] Generating recommendations from ${accumulator.keyInsights.length} insights...`);
    const { object: recommendations } = await generateObject({
      model,
      prompt: `Based on these research insights about "${accumulator.originalQuery}", provide 3-5 actionable recommendations:
      
      ${accumulator.keyInsights.join('\n')}`,
      schema: z.object({
        recommendations: z.array(z.string()).min(3).max(5)
      })
    });

    accumulator.recommendations = recommendations.recommendations;

    // Generate final report
    console.log(`[DeepResearch] Generating final report...`);
    const report = await generateReport(accumulator);
    console.log(`[DeepResearch] Report generated: ${report.length} characters`);

    // Prepare response
    const duration = Math.round((Date.now() - accumulator.startTime) / 1000);
    const sources = accumulator.researchNodes
      .flatMap(node => node.results.map(r => ({
        title: r.title,
        url: r.url,
        relevance: r.score
      })))
      .sort((a, b) => b.relevance - a.relevance)
      .slice(0, 10); // Top 10 sources

    const researchPath = [
      'Initial reconnaissance search',
      ...accumulator.researchNodes.map(n => n.query)
    ];

    session.currentPhase = 'completed';
    session.lastUpdated = Date.now();

    // Clean up session after a delay
    setTimeout(() => {
      researchSessions.delete(sessionId);
    }, 5 * 60 * 1000); // Keep for 5 minutes after completion

    return {
      success: true,
      query: accumulator.originalQuery,
      totalSearches: accumulator.totalSearches,
      duration,
      findings: {
        keyInsights: accumulator.keyInsights,
        recommendations: accumulator.recommendations,
        sources
      },
      report,
      researchPath
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Synthesis failed';
    
    // Return partial results if available
    return {
      success: false,
      query: accumulator.originalQuery,
      totalSearches: accumulator.totalSearches,
      duration: Math.round((Date.now() - accumulator.startTime) / 1000),
      findings: {
        keyInsights: accumulator.keyInsights,
        recommendations: accumulator.recommendations,
        sources: accumulator.researchNodes
          .flatMap(node => node.results.map(r => ({
            title: r.title,
            url: r.url,
            relevance: r.score
          })))
          .slice(0, 10)
      },
      report: `# Research Error\n\nAn error occurred during synthesis: ${errorMessage}\n\n## Partial Results\n\nSearches completed: ${accumulator.totalSearches}\nInsights found: ${accumulator.keyInsights.length}`,
      researchPath: [
        'Initial reconnaissance search',
        ...accumulator.researchNodes.map(n => n.query)
      ],
      error: errorMessage
    };
  }
}

// Tool 1: Initialize Deep Research
export const deepResearchInitTool = tool({
  description: 'STEP 1 of 4: Initialize deep research session and perform reconnaissance. This MUST be called first before any other deep research tools. Returns a sessionId that MUST be used for subsequent steps.',
  parameters: deepResearchInitSchema,
  execute: async (params) => {
    try {
      const validatedParams = deepResearchInitZodSchema.parse(params);
      
      // Check for API key early
      if (!process.env.TAVILY_API_KEY) {
        return {
          success: false,
          error: 'Tavily API key not configured. Please set TAVILY_API_KEY in environment variables.'
        };
      }
      
      const { sessionId, progress, reconContext } = await initializeAndReconnaissance(
        validatedParams.query,
        validatedParams.breadth
      );
      
      return {
        success: true,
        sessionId,
        progress,
        message: `Research initialized. Session ID: ${sessionId}. Reconnaissance complete with ${progress.totalSearches} searches. Now proceed with deepResearchLevel1 using this sessionId.`,
        reconContext
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initialize research'
      };
    }
  }
});

// Tool 2: Level 1 Research
export const deepResearchLevel1Tool = tool({
  description: 'STEP 2 of 4: Perform Level 1 research using informed queries from reconnaissance. REQUIRES sessionId from deepResearchInit. This MUST be called after deepResearchInit and before deepResearchLevel2.',
  parameters: deepResearchContinueSchema,
  execute: async (params) => {
    try {
      const validatedParams = deepResearchContinueZodSchema.parse(params);
      
      const progress = await performLevel1Research(validatedParams.sessionId);
      
      return {
        success: true,
        sessionId: validatedParams.sessionId,
        progress,
        message: `Level 1 research complete. Found ${progress.insights} key insights from ${progress.totalSearches} total searches. Now proceed with deepResearchLevel2 using the same sessionId.`
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform Level 1 research'
      };
    }
  }
});

// Tool 3: Level 2 Research
export const deepResearchLevel2Tool = tool({
  description: 'STEP 3 of 4: Perform Level 2 deep dive research based on Level 1 findings. REQUIRES sessionId from previous steps. This MUST be called after deepResearchLevel1 and before deepResearchSynthesize.',
  parameters: deepResearchContinueSchema,
  execute: async (params) => {
    try {
      const validatedParams = deepResearchContinueZodSchema.parse(params);
      
      const progress = await performLevel2Research(validatedParams.sessionId);
      
      return {
        success: true,
        sessionId: validatedParams.sessionId,
        progress,
        message: `Level 2 research complete. Total ${progress.insights} insights gathered from ${progress.totalSearches} searches. Now proceed with deepResearchSynthesize to generate the final report.`
      };
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to perform Level 2 research'
      };
    }
  }
});

// Tool 4: Synthesize and Generate Report
export const deepResearchSynthesizeTool = tool({
  description: 'STEP 4 of 4: Synthesize all research findings and generate the final comprehensive report. REQUIRES sessionId from previous steps. This MUST be called last, after all research phases are complete.',
  parameters: deepResearchContinueSchema,
  execute: async (params) => {
    try {
      const validatedParams = deepResearchContinueZodSchema.parse(params);
      
      const result = await synthesizeResearch(validatedParams.sessionId);
      
      return result;
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          success: false,
          query: '',
          totalSearches: 0,
          duration: 0,
          findings: {
            keyInsights: [],
            recommendations: [],
            sources: []
          },
          report: '',
          researchPath: [],
          error: `Validation error: ${error.issues.map(e => e.message).join(', ')}`
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to synthesize research';
      return {
        success: false,
        query: '',
        totalSearches: 0,
        duration: 0,
        findings: {
          keyInsights: [],
          recommendations: [],
          sources: []
        },
        report: `# Research Error\n\n${errorMessage}`,
        researchPath: [],
        error: errorMessage
      };
    }
  }
});

// Export all tools for easy import
export const deepResearchTools = {
  init: deepResearchInitTool,
  level1: deepResearchLevel1Tool,
  level2: deepResearchLevel2Tool,
  synthesize: deepResearchSynthesizeTool
};
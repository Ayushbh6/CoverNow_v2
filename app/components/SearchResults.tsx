'use client'

import { useState } from 'react'
import { SearchResult } from '@/app/api/chat/tools/webSearch'

interface SearchResultsProps {
  query: string
  results: SearchResult[]
  answer?: string
}

export default function SearchResults({ query, results, answer }: SearchResultsProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  // Function to get domain from URL
  const getDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '')
      return domain
    } catch {
      return url
    }
  }

  // Function to get favicon URL
  const getFaviconUrl = (url: string) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return null
    }
  }

  // Truncate content for preview
  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.substring(0, maxLength).trim() + '...'
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-4 max-w-3xl mx-auto px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Information found</h3>
        </div>
      </div>

      {/* AI Answer if available */}
      {answer && (
        <div className="mb-4 max-w-3xl mx-auto px-4">
          <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start gap-2 mb-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-1">Quick Answer</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300">{answer}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Results Grid - Full Width */}
      <div className="relative">
        <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
          {results.map((result, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-80 group"
            >
              <div className="h-full bg-white dark:bg-[#2a2a2a] rounded-xl border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/10 dark:hover:shadow-black/20">
                {/* Image if available */}
                {result.images && result.images[0] && (
                  <div className="relative h-40 overflow-hidden rounded-t-xl">
                    <img
                      src={result.images[0]}
                      alt={result.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                  </div>
                )}

                <div className={`p-4 ${result.images && result.images[0] ? '' : 'pt-5'}`}>
                  {/* Source info */}
                  <div className="flex items-center gap-2 mb-2">
                    {getFaviconUrl(result.url) && (
                      <img
                        src={getFaviconUrl(result.url)!}
                        alt=""
                        className="w-4 h-4 rounded"
                        loading="lazy"
                      />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-500">{getDomain(result.url)}</span>
                    {result.publishedDate && (
                      <>
                        <span className="text-xs text-gray-500 dark:text-gray-600">•</span>
                        <span className="text-xs text-gray-600 dark:text-gray-500">
                          {new Date(result.publishedDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Title */}
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {result.title}
                  </h4>

                  {/* Content preview */}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-3">
                    {truncateContent(result.content, 120)}
                  </p>

                  {/* Action buttons */}
                  <div className="flex items-center justify-between">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                    >
                      <span>Visit site</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    {result.score > 0 && (
                      <div className="flex items-center gap-1">
                        <div className="w-1 h-1 bg-green-400 rounded-full" />
                        <span className="text-xs text-gray-600 dark:text-gray-500">
                          {(result.score * 100).toFixed(0)}% relevant
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Scroll indicators */}
        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-gray-50 dark:from-[#212121] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-gray-50 dark:from-[#212121] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Results count */}
      <div className="mt-3 text-xs text-gray-600 dark:text-gray-500 text-center max-w-3xl mx-auto px-4">
        Found {results.length} result{results.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}
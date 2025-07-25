# CoverNow AI Insurance Agent Platform

An AI-powered insurance advisory platform that democratizes insurance access in India by providing personalized, trustworthy, and accessible insurance guidance through conversational AI.

## 🚀 Overview

CoverNow is a Next.js-based platform featuring **Aria**, an AI insurance assistant powered by OpenAI GPT-4.1. The platform provides intelligent insurance recommendations, policy guidance, and personalized advice while maintaining strict data security and user privacy.

### Key Features

- 🤖 **AI-Powered Assistant**: Conversational AI that understands Indian insurance needs
- 🔐 **Secure Authentication**: Email-based authentication with robust security
- 💬 **Real-time Chat**: Streaming responses with conversation persistence
- 📊 **Smart Profiling**: Progressive user profile building through natural conversation
- 🏥 **Health-Aware**: Pre-existing condition support and medical history management
- 📋 **Life Insurance Quotes**: Personalized recommendations with smart defaults
- 🔍 **Intelligent Search**: Real-time web search with domain-specific filtering
- 📚 **Deep Research**: 90-second comprehensive analysis for complex topics
- 📱 **Responsive Design**: Modern UI built with Tailwind CSS
- 🛡️ **Privacy-First**: Enterprise-grade security and strict data protection

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Vercel AI SDK + OpenRouter + OpenAI GPT-4.1 (Deep Research: Google Gemini 2.5 Flash)
- **Authentication**: Supabase Auth with email confirmation
- **Deployment**: Vercel (recommended)

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm/yarn/pnpm
- Supabase account
- OpenRouter API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd covernow_v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create `.env.local` with the following variables:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENROUTER_API_KEY=your_openrouter_api_key
   TAVILY_API_KEY=your_tavily_api_key  # For web search functionality
   ```

4. **Set up your database**
   
   Configure your Supabase project with the required tables and security policies.

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🎯 Usage

### For Users

1. **Sign Up**: Create an account with email confirmation
2. **Chat with Aria**: Start a conversation about your insurance needs
3. **Profile Building**: Share information naturally through conversation
4. **Get Recommendations**: Receive personalized insurance advice
5. **Manage Conversations**: Access chat history and continue previous discussions

### For Developers

#### Available Scripts

```bash
# Development with Turbopack
npm run dev

# Production build
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## 🤖 AI Assistant Features

### Aria's Core Capabilities

1. **📋 Life Insurance Quotes & Recommendations**
   - Personalized quotes from 5 major insurers
   - Smart form that shows only missing information
   - Intelligent defaults: 12x annual income coverage, age-based terms
   - Premium ranges for incomplete profiles
   - Beautiful card-based UI with horizontal scrolling

2. **🔍 Intelligent Web Search**
   - Real-time search using Tavily advanced API
   - Smart domain filtering by context (IRDAI, PolicyBazaar, etc.)
   - Always includes current year (2025) in searches
   - Proactive searches without explicit user request
   - 5 results with relevance scores and publish dates

3. **📚 Deep Research System**
   - 4-step sequential research for complex topics
   - ~90 seconds for comprehensive analysis
   - Generates detailed reports with comparisons
   - Session-based with automatic cleanup
   - Used only when 10+ sources needed

4. **👤 Smart Profile Management**
   - Transparent initial greeting showing all data on file
   - Progressive profile building through conversation
   - Separate handling for health conditions (privacy)
   - Handles Indian formats (lakhs/crores, date formats)
   - Conflict resolution with confirmations

### Aria's Conversation Style

- **Initial Greeting**: Shows complete profile summary with 9 data points
- **Capabilities List**: Clear description of 4 main functions
- **Natural Language**: Strategic name usage, not repetitive
- **Empathetic**: Understanding responses to health conditions
- **Proactive**: Suggests relevant actions based on profile
- **Token Management**: Smart rolling window at 200k tokens

### Intelligent Tools System

- **Profile Tools**: `updateUserProfile`, `manageUserIssues`, `handleConfirmationResponse`
- **Search Tools**: `webSearchFast` (2-3 seconds), Deep Research suite (90 seconds)
- **Insurance Tools**: `collectLifeInsuranceInfo`, `showLifeInsuranceRecommendations`
- **Automatic Usage**: Tools activate based on conversation context
- **User-Friendly Status**: "Aria is finding information..." with green checkmarks

## 🔒 Security & Privacy

### Data Protection

- **Row-Level Security**: Enterprise-grade database security
- **User Isolation**: Complete data separation between users
- **Encrypted Communication**: All API calls use HTTPS
- **Privacy by Design**: No sensitive data exposure in conversations
- **Compliance**: Built with Indian data protection standards in mind

### Authentication

- Email/password authentication with confirmation
- Protected routes with middleware
- Automatic session management
- Secure user onboarding flow

## 📊 Platform Features

### Conversation Management

- Real-time streaming responses for better user experience
- Persistent conversation history across browser tabs
- Intelligent token usage tracking with 200k soft limit
- **Rolling Conversation Window**:
  - User-friendly warning at token limit instead of hard stop
  - Option to continue with automatic message pruning
  - Visual indicators for extended conversation mode
  - Maintains conversation quality while allowing continuity

### User Experience

- **Initial Profile Transparency**: Complete data summary on first interaction
- **Full-Width Results**: Web search and insurance quotes in horizontal cards
- **Progress Indicators**: Real-time status for deep research phases
- **Smart Forms**: Only show fields that need to be filled
- **Tool Status Messages**: User-friendly processing indicators
- Progressive web app capabilities
- Mobile-responsive design
- Intuitive chat interface
- Seamless authentication flow

### Data Management

- **User Profile Fields**: 
  - Personal: first_name, last_name, age, dob, gender, is_married
  - Location & Income: city, annual_income, occupation
  - Insurance: smoking_status, coverage_amount, policy_term
  - Health: has_issues, issues (JSONB array)
- **Automatic Calculations**: Age from DOB, smart insurance defaults
- **Privacy Separation**: Health conditions stored separately
- **Conflict Resolution**: Confirmation prompts for data updates

## 🛠️ Development

### Project Structure

```
covernow_v2/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/             # Authentication pages
│   ├── chat/             # Chat interface
│   └── layout.tsx        # Root layout
├── utils/                 # Utility functions
├── middleware.ts         # Auth middleware
└── public/              # Static assets
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Follow TypeScript strict mode
4. Ensure security best practices
5. Test authentication flows
6. Submit a pull request

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables for Production

Ensure all required environment variables are set:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `OPENROUTER_API_KEY`

## 📈 Roadmap

### Current Status ✅

- [x] AI-powered conversational insurance assistant (Aria)
- [x] Secure authentication and user management
- [x] Intelligent user profiling system with 13 data fields
- [x] Real-time chat with conversation persistence
- [x] Context-aware response generation
- [x] Health condition and personal data management
- [x] Rolling conversation window for extended chats (200k+ tokens)
- [x] Life insurance quotes with 5 personalized recommendations
- [x] Intelligent web search with domain filtering (Tavily)
- [x] Deep research system for complex topics (4-step, 90s)
- [x] Smart forms showing only missing fields
- [x] Full-width card layouts for results
- [x] User-friendly tool status messages
- [x] Initial greeting with complete profile transparency

### Upcoming Features 🚧

- [ ] Insurance product catalog integration
- [ ] Policy management and tracking
- [ ] Claims assistance and tracking
- [ ] Premium calculation tools
- [ ] Document upload and processing
- [ ] Multi-language support for Indian languages
- [ ] Mobile application

## 📞 Support

For questions about the platform:

- Review the codebase for implementation details
- Check the Supabase documentation for database setup
- Ensure proper security configurations are in place

## 📄 License

**CoverNow Insurance Brokers Pvt Ltd**  

---

*Built with ❤️ to democratize insurance access in India*

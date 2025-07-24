# CoverNow AI Insurance Agent Platform

An AI-powered insurance advisory platform that democratizes insurance access in India by providing personalized, trustworthy, and accessible insurance guidance through conversational AI.

## 🚀 Overview

CoverNow is a Next.js-based platform featuring **Aria**, an AI insurance assistant powered by Google Gemini 2.5 Flash. The platform provides intelligent insurance recommendations, policy guidance, and personalized advice while maintaining strict data security and user privacy.

### Key Features

- 🤖 **AI-Powered Assistant**: Conversational AI that understands Indian insurance needs
- 🔐 **Secure Authentication**: Email-based authentication with robust security
- 💬 **Real-time Chat**: Streaming responses with conversation persistence
- 📊 **Smart Profiling**: Progressive user profile building through natural conversation
- 🏥 **Health-Aware**: Pre-existing condition support and medical history management
- 📱 **Responsive Design**: Modern UI built with Tailwind CSS
- 🛡️ **Privacy-First**: Enterprise-grade security and strict data protection

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **AI**: Vercel AI SDK + OpenRouter + Google Gemini 2.5 Flash
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

### Aria's Capabilities

- **Profile Management**: Automatically collects and updates user information
- **Health History**: Manages pre-existing conditions separately for privacy
- **Income Processing**: Handles Indian currency formats (lakhs/crores)
- **Date Intelligence**: Converts various date formats accurately
- **Contextual Memory**: Remembers user preferences within conversations
- **Token Management**: Tracks usage with intelligent conversation limits

### Intelligent Conversation Flow

- Progressive information collection through natural dialogue
- Context-aware responses based on user profile
- Automatic data validation and confirmation
- Multi-step insurance advisory workflows

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
- Persistent conversation history
- Intelligent token usage tracking
- Context-aware conversation limits

### User Experience

- Progressive web app capabilities
- Mobile-responsive design
- Intuitive chat interface
- Seamless authentication flow

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

- [x] AI-powered conversational insurance assistant
- [x] Secure authentication and user management
- [x] Intelligent user profiling system
- [x] Real-time chat with conversation persistence
- [x] Context-aware response generation
- [x] Health condition and personal data management

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

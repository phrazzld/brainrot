# Brainrot Publishing House - System Architecture

## Overview

Brainrot Publishing House is a Turborepo-based monorepo that publishes Gen Z "brainrot" translations of classic literature across multiple channels (web, ebook, print). This document provides visual representations of the system architecture.

## Monorepo Structure

```mermaid
graph TB
    subgraph "Monorepo Root"
        Root[brainrot/]
    end
    
    subgraph "Applications"
        Web[apps/web<br/>Next.js 15 Web App]
        Publisher[apps/publisher<br/>CLI Publishing Tool]
        Studio[apps/studio<br/>Translation Editor<br/>Future]
    end
    
    subgraph "Content"
        Translations[content/translations<br/>Book Translations<br/>10 Books]
        Generated[generated/<br/>Processed Output<br/>124 Text Files]
    end
    
    subgraph "Shared Packages"
        Types[packages/@brainrot/types<br/>TypeScript Definitions]
        Converter[packages/@brainrot/converter<br/>MD→TXT/EPUB/PDF]
        BlobClient[packages/@brainrot/blob-client<br/>Vercel Blob Storage]
        Metadata[packages/@brainrot/metadata<br/>Book Metadata & ISBN]
        Templates[packages/@brainrot/templates<br/>Publishing Templates]
    end
    
    Root --> Web
    Root --> Publisher
    Root --> Studio
    Root --> Translations
    Root --> Generated
    Root --> Types
    Root --> Converter
    Root --> BlobClient
    Root --> Metadata
    Root --> Templates
    
    Web --> Types
    Web --> BlobClient
    Publisher --> Types
    Publisher --> Converter
    Publisher --> Metadata
    Publisher --> Templates
    Converter --> Types
    BlobClient --> Types
    Metadata --> Types
    
    style Web fill:#4ade80
    style Publisher fill:#4ade80
    style Types fill:#60a5fa
    style Converter fill:#60a5fa
    style BlobClient fill:#60a5fa
    style Metadata fill:#60a5fa
    style Templates fill:#60a5fa
    style Translations fill:#fbbf24
    style Generated fill:#fbbf24
    style Studio fill:#9ca3af
```

## Content Processing Pipeline

```mermaid
flowchart LR
    subgraph "Source Content"
        MD[Markdown Files<br/>translations/books/]
    end
    
    subgraph "Processing"
        Parse[Parse Markdown]
        Strip[Strip Formatting]
        Convert[Generate Formats]
    end
    
    subgraph "Output Formats"
        TXT[Plain Text<br/>.txt files]
        EPUB[EPUB<br/>E-readers]
        PDF[PDF<br/>Print-ready]
        MOBI[Kindle<br/>Amazon]
    end
    
    subgraph "Storage & Distribution"
        Blob[Vercel Blob<br/>Web Content]
        KDP[Amazon KDP<br/>Kindle Store]
        Lulu[Lulu API<br/>Print on Demand]
        Ingram[IngramSpark<br/>Bookstores]
    end
    
    MD --> Parse
    Parse --> Strip
    Strip --> Convert
    Convert --> TXT
    Convert --> EPUB
    Convert --> PDF
    Convert --> MOBI
    
    TXT --> Blob
    MOBI --> KDP
    PDF --> Lulu
    PDF --> Ingram
    EPUB --> KDP
    
    style MD fill:#fbbf24
    style TXT fill:#4ade80
    style EPUB fill:#4ade80
    style PDF fill:#4ade80
    style MOBI fill:#4ade80
    style Blob fill:#60a5fa
    style KDP fill:#a78bfa
    style Lulu fill:#a78bfa
    style Ingram fill:#a78bfa
```

## Publishing Pipeline

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant CLI as Publisher CLI
    participant Pre as Pre-flight Checks
    participant Lulu as Lulu API
    participant KDP as Amazon KDP
    participant Web as Web App
    
    Dev->>CLI: pnpm publish:book great-gatsby
    CLI->>Pre: Run pre-flight checks
    Pre->>Pre: Verify files exist
    Pre->>Pre: Validate metadata
    Pre->>Pre: Check credentials
    Pre-->>CLI: Checks passed ✓
    
    par Lulu Publishing
        CLI->>Lulu: OAuth2 Authentication
        Lulu-->>CLI: Access Token
        CLI->>Lulu: Upload PDF + Cover
        Lulu-->>CLI: Product Created
        CLI->>Lulu: Set Pricing & Distribution
        Lulu-->>CLI: Published ✓
    and KDP Publishing  
        CLI->>KDP: Playwright Automation
        KDP-->>CLI: Login Page
        CLI->>KDP: Enter Credentials + 2FA
        KDP-->>CLI: Dashboard
        CLI->>KDP: Fill Book Details
        CLI->>KDP: Upload Files
        CLI->>KDP: Set Pricing
        KDP-->>CLI: Published ✓
    and Web Publishing
        CLI->>Web: Upload to Blob Storage
        Web-->>CLI: Files Uploaded
        CLI->>Web: Update Metadata
        Web-->>CLI: Available Online ✓
    end
    
    CLI-->>Dev: Publishing Complete 🚀
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development"
        LocalDev[Local Development<br/>pnpm dev]
        Tests[Test Suite<br/>Jest + Vitest]
    end
    
    subgraph "Version Control"
        GitHub[GitHub Repository<br/>github.com/phrazzld/brainrot]
        Actions[GitHub Actions<br/>CI/CD Workflows]
    end
    
    subgraph "Build & Deploy"
        Turbo[Turborepo<br/>Build Orchestration]
        Vercel[Vercel Platform<br/>Edge Network]
    end
    
    subgraph "Production Services"
        NextApp[Next.js App<br/>brainrot.vercel.app]
        BlobStore[Vercel Blob Storage<br/>Content CDN]
        Analytics[Vercel Analytics<br/>Performance Monitoring]
    end
    
    subgraph "External Services"
        LuluAPI[Lulu Print API<br/>Print on Demand]
        KDPSite[Amazon KDP<br/>Kindle Publishing]
        Sentry[Sentry<br/>Error Tracking<br/>Future]
    end
    
    LocalDev --> GitHub
    GitHub --> Actions
    Actions --> Turbo
    Turbo --> Vercel
    Vercel --> NextApp
    NextApp --> BlobStore
    NextApp --> Analytics
    NextApp -.-> LuluAPI
    NextApp -.-> KDPSite
    NextApp -.-> Sentry
    
    style GitHub fill:#333,color:#fff
    style Vercel fill:#000,color:#fff
    style NextApp fill:#4ade80
    style BlobStore fill:#60a5fa
    style LuluAPI fill:#a78bfa
    style KDPSite fill:#f97316
```

## Data Flow

```mermaid
flowchart TB
    subgraph "Content Creation"
        Author[Translation Authors]
        Editor[Content Editors]
    end
    
    subgraph "Storage Layer"
        Git[(Git Repository<br/>Source of Truth)]
        Blob[(Vercel Blob<br/>CDN Storage)]
        Meta[(Metadata YAML<br/>Book Information)]
    end
    
    subgraph "Processing Layer"
        Build[Build Pipeline<br/>Turborepo]
        Convert[Format Conversion<br/>Pandoc + Custom]
        Validate[Validation<br/>ISBN, Metadata]
    end
    
    subgraph "Application Layer"
        WebApp[Web Application<br/>Reader Interface]
        PublisherCLI[Publisher CLI<br/>Distribution Tool]
        StudioApp[Studio App<br/>Editor Interface<br/>Future]
    end
    
    subgraph "Distribution"
        Users[Web Readers]
        Kindle[Kindle Readers]
        Print[Print Readers]
    end
    
    Author --> Git
    Editor --> Git
    Git --> Build
    Build --> Convert
    Convert --> Validate
    Validate --> Blob
    Validate --> Meta
    
    Blob --> WebApp
    Meta --> WebApp
    Meta --> PublisherCLI
    
    WebApp --> Users
    PublisherCLI --> Kindle
    PublisherCLI --> Print
    
    StudioApp -.-> Git
    StudioApp -.-> Author
    StudioApp -.-> Editor
    
    style Git fill:#f97316
    style Blob fill:#60a5fa
    style WebApp fill:#4ade80
    style PublisherCLI fill:#4ade80
```

## Technology Stack

```mermaid
mindmap
  root((Brainrot<br/>Tech Stack))
    Frontend
      Next.js 15
      React 19
      TypeScript
      Tailwind CSS
      Framer Motion
    Backend
      Node.js 22
      Vercel Edge
      API Routes
    Build Tools
      Turborepo
      pnpm 8
      Vite
      SWC
    Storage
      Vercel Blob
      Git LFS
      CDN
    Publishing
      Pandoc
      LaTeX
      Playwright
      Commander CLI
    Platforms
      Lulu API
      Amazon KDP
      IngramSpark
      Vercel
    DevOps
      GitHub Actions
      Dependabot
      Husky
      ESLint/Prettier
    Monitoring
      Vercel Analytics
      Build Metrics
      Error Tracking
        Sentry (planned)
```

## Performance Metrics

```mermaid
graph LR
    subgraph "Build Performance"
        ColdBuild[Cold Build<br/>~7.5s]
        CachedBuild[Cached Build<br/>107ms]
        FullTurbo[Full Turbo<br/>99.9% cache hit]
    end
    
    subgraph "Content Metrics"
        Books[10 Books<br/>Translated]
        Files[124 Text Files<br/>Generated]
        Formats[4 Output Formats<br/>TXT/EPUB/PDF/MOBI]
    end
    
    subgraph "Scale Targets"
        Target1[100 Books<br/>Year 1]
        Target2[500 Books<br/>Year 2]
        Target3[1000+ Books<br/>Year 3]
    end
    
    ColdBuild --> CachedBuild
    CachedBuild --> FullTurbo
    Books --> Target1
    Target1 --> Target2
    Target2 --> Target3
    
    style CachedBuild fill:#4ade80
    style FullTurbo fill:#22c55e
    style Books fill:#60a5fa
    style Target3 fill:#fbbf24
```

## Security & Authentication

```mermaid
flowchart TB
    subgraph "Environment Variables"
        BlobToken[BLOB_READ_WRITE_TOKEN]
        LuluCreds[LULU_CLIENT_ID/SECRET]
        KDPCreds[KDP_EMAIL/PASSWORD]
        GitHubToken[GITHUB_TOKEN]
    end
    
    subgraph "Secret Management"
        DotenvVault[dotenv-vault<br/>Encrypted Secrets]
        GitHubSecrets[GitHub Secrets<br/>CI/CD Variables]
        VercelEnv[Vercel Environment<br/>Production Secrets]
    end
    
    subgraph "Access Control"
        BranchProtection[Branch Protection<br/>PR Reviews Required]
        CODEOWNERS[CODEOWNERS<br/>Review Requirements]
        DeployProtection[Deploy Protection<br/>Manual Approval]
    end
    
    BlobToken --> DotenvVault
    LuluCreds --> DotenvVault
    KDPCreds --> DotenvVault
    GitHubToken --> GitHubSecrets
    
    DotenvVault --> VercelEnv
    GitHubSecrets --> BranchProtection
    BranchProtection --> CODEOWNERS
    CODEOWNERS --> DeployProtection
    
    style DotenvVault fill:#ef4444
    style GitHubSecrets fill:#ef4444
    style VercelEnv fill:#ef4444
    style BranchProtection fill:#22c55e
```

## Future Architecture

```mermaid
graph TB
    subgraph "Current State"
        CurrentWeb[Web App]
        CurrentCLI[Publisher CLI]
        CurrentContent[Static Content]
    end
    
    subgraph "Phase 1: Studio"
        Studio[Translation Studio<br/>Web Editor]
        AIAssist[AI Assistant<br/>Translation Help]
        Collab[Collaboration<br/>Multi-user Editing]
    end
    
    subgraph "Phase 2: API & Mobile"
        PublicAPI[Public API<br/>Translation Access]
        MobileApp[Mobile App<br/>iOS/Android]
        Subscription[Subscription System<br/>Premium Content]
    end
    
    subgraph "Phase 3: Scale"
        MultiLang[Multi-language<br/>Global Translations]
        AudioBooks[Audio Books<br/>AI Narration]
        Marketplace[Marketplace<br/>User Submissions]
    end
    
    CurrentWeb --> Studio
    CurrentCLI --> PublicAPI
    CurrentContent --> AIAssist
    
    Studio --> Collab
    AIAssist --> MultiLang
    PublicAPI --> MobileApp
    MobileApp --> Subscription
    Subscription --> AudioBooks
    AudioBooks --> Marketplace
    
    style Studio fill:#fbbf24
    style PublicAPI fill:#fbbf24
    style MobileApp fill:#fbbf24
    style Marketplace fill:#4ade80
```

---

*Last Updated: 2025-08-21*  
*Generated with Mermaid.js - View these diagrams in any Markdown viewer that supports Mermaid*
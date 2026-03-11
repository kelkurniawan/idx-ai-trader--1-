# IDX AI Trader - System Design Documentation

This document outlines the architecture and workflows of the IDX AI Trader system. 

## 1. Use Case Diagram

This diagram maps out the primary actors within the IDX AI Trader application and the major interactions they can perform.

```mermaid
usecaseDiagram
    actor "Registered User" as User
    actor "System Administrator" as Admin
    actor "AI & Market API" as ExternalAPI

    rectangle "IDX AI Trader System" {
        usecase "Login & Manage Profile" as UC1
        usecase "View Dashboard & Indices" as UC2
        usecase "Analyze Stock (Technicals/News)" as UC3
        usecase "Manage Watchlist" as UC4
        usecase "Run Backtesting" as UC5
        usecase "Log Trades (Journal)" as UC6
        
        usecase "Override Stock Data" as UC7
        usecase "Curate News Articles" as UC8
        usecase "Import/Export System Data" as UC9
        
        usecase "Fetch Market Prices" as UC10
        usecase "Generate AI Predictions" as UC11
    }

    User --> UC1
    User --> UC2
    User --> UC3
    User --> UC4
    User --> UC5
    User --> UC6

    Admin --> UC1
    Admin --> UC7
    Admin --> UC8
    Admin --> UC9
    
    ExternalAPI --> UC10
    ExternalAPI --> UC11
    
    UC3 ..> UC10 : uses
    UC3 ..> UC11 : uses
```

---

## 2. Entity Relationship Diagram (ERD)

The following ERD describes the backend database architecture, defining how users, tokens, stocks, prices, and analyses are related and stored.

```mermaid
erDiagram
    USERS {
        string id PK
        string email UK
        string name
        string password_hash
        string auth_provider
        string google_id UK
        string profile_picture_url
        boolean profile_complete
        boolean mfa_enabled
        string mfa_type
        datetime created_at
    }

    REMEMBER_ME_TOKENS {
        string id PK
        string user_id FK
        string token_hash UK
        datetime expires_at
        datetime created_at
    }

    STOCKS {
        int id PK
        string ticker UK
        string name
        string sector
        string subsector
        float market_cap
        float listed_shares
        datetime updated_at
    }

    STOCK_PRICES {
        int id PK
        string ticker FK
        datetime date
        float open
        float high
        float low
        float close
        float volume
        float value
    }

    WATCHLIST {
        int id PK
        string ticker FK
        float target_price
        float stop_loss
        string note
        datetime added_at
    }

    ANALYSIS_CACHE {
        int id PK
        string ticker FK
        string analysis_type
        json data
        string signal
        float confidence
        datetime expires_at
    }

    USERS ||--o{ REMEMBER_ME_TOKENS : "owns"
    WATCHLIST }o--|| STOCKS : "references"
    STOCK_PRICES }o--|| STOCKS : "belongs to"
    ANALYSIS_CACHE }o--|| STOCKS : "analyzes"
```

---

## 3. Sequence Diagram (Stock Analysis Flow)

This sequence diagram illustrates the step-by-step process of how the system fetches, caches, and serves stock analysis to a user.

```mermaid
sequenceDiagram
    participant U as User (Frontend)
    participant API as Backend FastAPI
    participant DB as SQLite / PostgreSQL
    participant AI as Generative AI Service

    U->>API: GET /api/analysis/{ticker}
    API->>DB: Query AnalysisCache for ticker
    
    alt Cache is valid
        DB-->>API: Returns cached analysis
        API-->>U: Returns formatted analysis response
    else Cache is missing or expired
        DB-->>API: No valid cache
        API->>AI: Request technical/fundamental analysis context
        AI-->>API: Yields AI Insights (Signals + Details)
        API->>DB: Insert/Update AnalysisCache (JSON payload)
        API-->>U: Returns new formatted analysis response
    end
```

---

## 4. Flow Chart (Admin Data Override Process)

This flowchart dictates the decision-making process an administrator takes when managing overriding system data (news/stock data) to supplement automated API data.

```mermaid
flowchart TD
    A([Start Admin Session]) --> B{What to manage?}
    B -->|Stocks| C[View Stock Overrides Table]
    B -->|News| D[View News Manager]
    B -->|Import/Export| E[Data Import Menu]
    
    C --> F{Action?}
    F -->|Edit| G[Update Signal/Price Override]
    F -->|Create| H[Add New Manual Override]
    G --> I[Save to local config/DB]
    H --> I
    
    D --> J{Action?}
    J -->|Edit Article| K[Modify Title/URL/Source]
    J -->|Toggle Status| L[Enable/Disable Article]
    K --> M[Save News Metadata]
    L --> M
    
    E --> N{Action?}
    N -->|Export| O[Download JSON Archive]
    N -->|Import| P[Upload JSON Archive]
    P --> Q[Merge new definitions with existing overrides]
    
    I --> R([End Process / Return to Dashboard])
    M --> R
    O --> R
    Q --> R
```

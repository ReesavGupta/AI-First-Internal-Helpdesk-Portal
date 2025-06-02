# AI-First Internal Helpdesk Portal

This project is an AI-powered internal helpdesk portal designed to streamline ticket management, provide intelligent support, and automate various helpdesk tasks. It features a React frontend, a Node.js/Express backend, and integrates AI capabilities for enhanced functionality.

## Live Deployed Links

- **Frontend (Vercel):** [https://helpdesk-et0mro345-waglogy.vercel.app](https://helpdesk-et0mro345-waglogy.vercel.app)
- **Backend (Render):** [https://ai-first-internal-helpdesk-portal-ac4g.onrender.com](https://ai-first-internal-helpdesk-portal-ac4g.onrender.com)

## Features Overview

- **User Authentication:** Secure login and registration for users, agents, and admins.
- **Ticket Management:**
  - Create, view, update, and delete support tickets.
  - Assign tickets to agents or departments.
  - Track ticket status (Open, In Progress, Resolved, Closed).
  - Priority management (Low, Medium, High).
  - Add responses and attachments to tickets.
- **Role-Based Access Control (RBAC):** Different functionalities and views based on user roles (User, Agent, Admin).
- **Real-time Notifications:** WebSocket-based notifications for ticket updates, assignments, and new responses.
- **Department Management:** Admins can create and manage support departments.
- **User Management:** Admins can view and manage users.
- **FAQ Management:** Admins can create and manage Frequently Asked Questions.
- **AI-Powered Features:**
  - **Retrieval Augmented Generation (RAG) for Document Q&A:**
    - Admins can upload documents (PDF, DOCX, TXT).
    - The system processes and chunks these documents, generating embeddings.
    - Users can query the RAG system, which retrieves relevant document chunks and uses an LLM (e.g., OpenAI) to generate answers based on the document content.
  - **AI-Suggested Responses (Conceptual):** The system is structured to potentially provide AI-suggested responses to tickets based on historical data or FAQs (implementation details may vary).
  - **Automated Ticket Categorization/Tagging (Conceptual):** AI can be used to automatically categorize or tag incoming tickets based on their content.
  - **Intelligent Search:** Semantic search capabilities for FAQs and potentially tickets.

## Project Structure

```
.
├── backend/        # Node.js, Express, Prisma, TypeScript
│   ├── prisma/
│   ├── src/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── websocket/
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/       # React, Vite, TypeScript, Tailwind CSS
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Setup Instructions (How to Run Locally)

### Prerequisites

- Node.js (v18.x or higher recommended)
- npm or yarn
- Git
- A PostgreSQL database instance (e.g., local installation, Docker, or a cloud-hosted one)
- OpenAI API Key (for RAG and other AI features)

### 1. Clone the Repository

```bash
git clone <your-repository-url>
cd <your-repository-name>
```

### 2. Backend Setup

```bash
cd backend
npm install
```

- **Create a `.env` file** in the `backend` directory by copying `backend/.env.example` (if one exists) or by creating it from scratch.
- Populate the `.env` file with your specific configurations:

  ```env
  DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE_NAME" # Your PostgreSQL connection string
  JWT_SECRET="your_strong_jwt_secret"
  PORT=5000
  WS_PORT=5001
  FRONTEND_URL="http://localhost:5173" # Or your local frontend port

  # OpenAI API Key for RAG and other AI features
  OPENAI_API_KEY="your_openai_api_key"

  # Other necessary environment variables (e.g., for email, cloud storage if used)
  ```

- **Apply Prisma Migrations:**
  ```bash
  npx prisma migrate dev --name init
  ```
  (Or `npx prisma db push` if you prefer, but `migrate dev` is recommended for development workflow)
- **Generate Prisma Client:**
  ```bash
  npx prisma generate
  ```
- **Run the backend development server:**
  ```bash
  npm run dev
  ```
  The backend should now be running, typically on `http://localhost:5000`.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

- **Create a `.env` file** in the `frontend` directory.
- Add the following environment variable, pointing to your local backend:
  ```env
  VITE_API_BASE_URL="http://localhost:5000"
  VITE_WS_URL="ws://localhost:5001/ws"
  ```
  (Adjust the port numbers if your backend is running on different ports).
- **Run the frontend development server:**
  ```bash
  npm run dev
  ```
  The frontend should now be running, typically on `http://localhost:5173`.

### 4. Accessing the Application

- Open your browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
- You should be able to register as a new user and then log in. To test admin/agent functionalities, you might need to manually update a user's role in the database or implement a seeding script.

## AI Features Implemented

- **Retrieval Augmented Generation (RAG):**

  - **Document Upload & Processing:** Admins can upload documents (PDF, DOCX, TXT) through the UI. The backend processes these documents:
    - Extracts text content.
    - Splits text into manageable chunks.
    - Generates vector embeddings for each chunk using an OpenAI embedding model.
    - Stores the document metadata and chunks (with their embeddings) in the PostgreSQL database using Prisma.
  - **Querying:** Users can ask questions through a dedicated interface.
    - The query is converted into an embedding.
    - The system performs a similarity search (vector search) in the database to find the most relevant document chunks based on the query embedding.
    - The retrieved chunks, along with the original query, are passed to an OpenAI chat completion model (e.g., GPT-3.5-turbo or GPT-4).
    - The LLM generates a natural language answer based on the provided context from the documents.
  - **Workflow:** The document processing is handled asynchronously to prevent blocking API requests. Upload status is updated in the database.

- **AI Suggestions for Ticket Responses (Conceptual - requires further implementation):**

  - The groundwork exists for fetching AI suggestions (e.g., `apiClient.getAISuggestions(id!)` in the frontend).
  - This could be powered by an LLM looking at the ticket content, historical ticket data (if available and indexed), or relevant FAQ/document content to suggest potential responses for agents.

- **Other Potential AI Integrations (Conceptual):**
  - **Automated Ticket Categorization/Prioritization:** Using NLP to analyze new ticket descriptions and suggest or automatically set categories and priorities.
  - **Sentiment Analysis:** Analyzing user messages to gauge sentiment, which could flag tickets for urgent attention.
  - **Intelligent FAQ Search:** Enhancing FAQ search beyond keyword matching using semantic search on FAQ embeddings.

This README provides a comprehensive starting point. You can expand on specific AI feature details, add more troubleshooting tips, or include sections on testing, contribution guidelines, etc., as your project evolves.

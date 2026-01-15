# ClearThinker AI

ClearThinker is an AI-powered Socratic Decision Coach designed to help users vet their decisions, identify logical fallacies, and reduce cognitive bias. It acts as a "Check Engine Light" for your thinking.

## Features

-   **Real-time Decision Analysis**: Chat with an AI that analyzes your logic in real-time.
-   **Traffic Light Protocol**:
    -   🟢 **Green**: Validates data-driven logic.
    -   🟡 **Yellow**: Challenges intuition or missing perspectives.
    -   🔴 **Red**: Stops emotional reasoning or dangerous assumptions.
-   **Cognitive Profiling**: Builds a user profile (Role, Industry, Traits) to provide context-aware coaching.
-   **Logical Fallacy Detection**: Identifies over 50+ cognitive biases (e.g., Confirmation Bias, Sunk Cost Fallacy) from a curated reference library.

## Technology Stack

-   **Frontend**: React (Vite), Tailwind CSS, Lucide Icons.
-   **Backend**: AWS Lambda (Python 3.11).
-   **AI**: Amazon Bedrock (Anthropic Claude 3.5 Sonnet / OpenAI GPT-4 compatible models).
-   **Database**: Amazon DynamoDB.

## 🏃‍♂️ Getting Started

### Prerequisites

-   Node.js (v18+)
-   AWS Account (for backend deployment)

### 1. Frontend Setup

1.  Clone the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open `http://localhost:xxxx` in your browser.

> **Note**: To connect to your own custom backend, you need to deploy the backend and update `API_URL` in `src/App.jsx`.

### 2. Backend Deployment (AWS)

The backend code is located in the `backend/` directory.

1.  **Create DynamoDB Table**:
    -   Name: `ClearThinkerProfiles` (or set custom name in env vars).
    -   Partition Key: `UserId` (String).

2.  **Create AWS Lambda Function**:
    -   Runtime: Python 3.11.
    -   Code: Upload `lambda_function.py`, `prompts.py`, `constants.py`.
    -   **Important**: You must install dependencies (`boto3` is included in Lambda, but if you add others, you need a Lambda Layer).

3.  **Permissions**:
    -   Give the Lambda IAM role permissions for:
        -   `dynamodb:GetItem`, `dynamodb:UpdateItem` (for your table).
        -   `bedrock:InvokeModel`.

4.  **Environment Variables**:
    -   `DYNAMODB_TABLE`: Name of your DynamoDB table.

5.  **Enable Function URL**:
    -   Create a Function URL (Auth Type: `NONE` for dev, or `AWS_IAM` for prod).
    -   Copy the URL and paste it into `src/App.jsx` as `const API_URL`.

## Project Structure

```
├── src/                # React Frontend
│   ├── App.jsx         # Main UI & Chat Logic
│   └── index.css       # Tailwind Styles
├── backend/            # Serverless Backend
│   ├── lambda_function.py  # Main Handler
│   ├── prompts.py          # AI Prompts & Bias Library
│   └── constants.py        # Configuration
└── ...
```

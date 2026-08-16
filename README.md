# Panic at the Calendar!

An intelligent calendar management system powered by Google's Gemini AI and LangGraph. This application provides a conversational interface to manage Google Calendar events with an approval workflow for AI-suggested actions.

## Features

- **AI-Powered Chat Assistant**: Natural language interaction for calendar management using Gemini AI
- **Google Calendar Integration**: Full CRUD operations on calendar events with timezone awareness (Singapore/SGT)
- **Smart Approval System**: Two-stage architecture where AI creates approval requests that require human confirmation before execution
- **Context-Aware Agent**: AI understands dates, schedules, and calendar context with access to specialized tools
- **Real-time Updates**: Instant synchronization between frontend and backend
- **User Preferences**: Customizable preferences that the AI agent considers when making suggestions
- **Clean UI**: Modern, responsive Angular interface with tabbed navigation


## Architecture

### Approval-Based Workflow

This application implements a two-stage workflow for calendar modifications:

1. **Request Stage**: When the AI agent determines a calendar write action is needed (create, update, or delete), it calls a `request_*` tool that creates a pending approval record stored in `pending_calendar_approvals.json`. No changes are made to Google Calendar at this stage.

2. **Approval Stage**: The user reviews the proposed action in the Approvals tab and can either:
   - **Approve**: Execute the action against Google Calendar via the `/approve_*` endpoints
   - **Reject**: Discard the proposal without making any changes

This architecture ensures:
- No unintended calendar modifications
- Full transparency of AI-suggested actions
- User control over all calendar changes
- Audit trail of proposed actions

### Personal Preferences

The application includes a sophisticated preference management system that allows users to customize how the AI agent behaves:

1. **Preference Storage**: User preferences are stored in `server/preferences/preferences.md` as structured markdown text with bullet points.

2. **AI-Powered Updates**: When a user provides new preference input, a dedicated Gemini model (`preference_manager_model`) analyzes the current preferences and intelligently merges or updates them:
   - Prioritizes new input over existing preferences when conflicts arise
   - Detects when new input is already captured (returns null to avoid redundant updates)
   - Maintains clear, concise bullet-point formatting

3. **Agent Integration**: The LangGraph agent can access user preferences via the `get_user_preferences` tool, allowing it to:
   - Tailor event suggestions based on user habits and requirements
   - Consider user-specific constraints when proposing calendar modifications
   - Provide personalized recommendations aligned with user workflow

4. **Update Workflow**:
   - User submits preference input via the Preferences tab
   - `/update_preferences` endpoint invokes the preference manager
   - Gemini analyzes and merges the input with existing preferences
   - Updated preferences are saved to `preferences.md`
   - AI agent reads preferences when making future suggestions

This feature enables the calendar assistant to learn and adapt to individual user needs, creating a more personalized scheduling experience.

## Project Structure

```
panic-at-the-calendar/
├── server/                           # Backend application
│   ├── app.py                        # FastAPI main application
│   ├── config.py                     # Configuration management
│   ├── gemini.py                     # Gemini AI client setup
│   ├── requirements.txt              # Python dependencies
│   ├── pending_calendar_approvals.json  # Approval queue storage
│   ├── agents/
│   │   ├── agent.py                  # LangGraph agent definition
│   │   └── tools.py                  # Calendar and date tools
│   ├── google_calendar/
│   │   ├── calendar_utils.py         # Google Calendar API wrapper
│   │   ├── credentials.json          # Google API credentials
│   │   └── token.json                # OAuth tokens
│   └── preferences/
│       ├── preference_manager.py     # User preferences handler
│       └── preferences.md            # User preferences storage
│
└── web/                              # Frontend application
    ├── package.json                  # npm dependencies
    ├── angular.json                  # Angular configuration
    ├── tsconfig.json                 # TypeScript configuration
    └── src/
        ├── index.html
        ├── main.ts
        ├── styles.css
        └── app/
            ├── app.component.ts      # Root component with tabs
            ├── calendar.component.*  # Calendar view
            ├── calendar.service.ts   # Calendar API service
            ├── chat.component.*      # AI chat interface
            ├── chat.service.ts       # Chat API service
            ├── approvals.component.* # Approval management
            ├── approvals.service.ts  # Approvals API service
            └── preferences.component.ts  # User preferences
```

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 18+ and npm
- Google Cloud Project with Calendar API enabled
- Gemini API key (from Google AI Studio)

### Backend Setup

1. **Create and activate virtual environment** (from project root):
   ```bash
   python -m venv .venv
   .venv\Scripts\Activate.ps1  # Windows PowerShell
   # or
   source .venv/bin/activate    # Linux/Mac
   ```

2. **Install dependencies**:
   ```bash
   pip install -r server/requirements.txt
   ```

3. **Configure environment variables**:
   Create a `.env` file in the project root:
   ```
   gemini=your_gemini_api_key_here
   ```

4. **Set up Google Calendar credentials**:
   - Create a project in [Google Cloud Console](https://console.cloud.google.com/)
   - Enable Google Calendar API
   - Create OAuth 2.0 credentials (Desktop app type)
   - Download credentials and save as `server/google_calendar/credentials.json`
   - On first run, the application will open a browser for OAuth authorization
   - After authorization, a `token.json` file will be created automatically

5. **Run the backend server**:
   ```bash
   cd server
   python app.py
   ```
   Server runs on `http://localhost:8000`

### Frontend Setup

1. **Navigate to web directory**:
   ```bash
   cd web
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm start
   ```
   Application runs on `http://localhost:4200`

## Usage

### Calendar Tab
- View all your calendar events
- Create, update, and delete events manually
- Direct interaction with Google Calendar

### Chat Assistant
- Ask natural language questions:
  - "What meetings do I have today?"
  - "Schedule a team meeting tomorrow at 2 PM"
  - "Cancel my 3 PM appointment"
  - "What day is it today?"
- AI suggests actions that appear in the Approvals tab
- **Note**: Write actions (create/update/delete) only create approval requests; they don't directly modify the calendar

### Approvals Tab
- Review AI-suggested calendar actions before execution
- See complete event details including start, end, location, and description
- Approve or reject actions with one click
- Badge indicator shows pending approval count
- Actions are only executed against Google Calendar after approval

### Preferences Tab
- Configure user preferences
- Customize AI behavior and calendar settings

## API Endpoints

### Root
- `GET /` - API welcome message and metadata

### Calendar Operations
- `GET /events` - List calendar events within a date range
- `POST /create_event` - Create a new event
- `POST /update_event` - Update an existing event
- `POST /delete_event` - Delete an event

### Chat Interface
- `POST /chat` - Send message to AI agent
  ```json
  {
    "message": "Schedule lunch tomorrow at noon",
    "max_iterations": 10
  }
  ```

### Approval Management
- `GET /pending_approvals` - Get all pending approvals
- `POST /approve_create` - Approve event creation
- `POST /approve_update` - Approve event update
- `POST /approve_delete` - Approve event deletion
- `POST /reject_approval` - Reject any pending action

### Preferences
- `GET /preferences` - Get user preferences
- `POST /update_preferences` - Update preferences from new user input
- `POST /write_preferences` - Persist reviewed preferences

## AI Agent Tools

The LangGraph agent has access to the following tools for calendar management and approval workflow:

### Read-Only Calendar Tools
- `get_today_date_details` - Get current date context (day name, month, year, weekday)
- `get_calendar_event_by_id` - Retrieve a specific event by its ID
- `get_calendar_events_by_range` - Retrieve events between two date-time boundaries
- `get_today_calendar_events` - Get all events scheduled for today
- `get_upcoming_calendar_events` - Get events for the next N days

### Write Request Tools (Create Approval Requests)
- `request_create_calendar_event` - Request approval to create a new event
- `request_update_calendar_event` - Request approval to update an existing event
- `request_delete_calendar_event` - Request approval to delete an event
- `request_batch_calendar_operations` - Request approval for multiple operations

### Approval Management Tools
- `get_pending_calendar_approval` - Retrieve a specific pending approval by ID
- `list_pending_calendar_approvals` - List all currently pending approvals

### Preferences
- `get_user_preferences` - Retrieve saved user preferences

**Important**: Write-oriented tools (`request_*`) only create pending approval records. They do not directly modify the calendar. Human approval via the Approvals tab is required to execute calendar changes.

## Technologies

### Backend
- **FastAPI** - Modern Python web framework
- **LangGraph** - Agent orchestration and workflow management
- **Google Generative AI (Gemini)** - AI model (gemini-3-flash-preview)
- **Google Calendar API** - Calendar integration
- **Python-dotenv** - Environment variable management
- **Uvicorn** - ASGI server

### Frontend
- **Angular 18** - Modern web framework
- **TypeScript** - Type-safe JavaScript
- **RxJS** - Reactive programming
- **Angular HttpClient** - HTTP communication

## Development

### Running in Development Mode

1. Start backend: `cd server && python app.py`
2. Start frontend: `cd web && npm start`
3. Access application at `http://localhost:4200`

### Making Changes

- Backend changes: Restart `app.py`
- Frontend changes: Angular CLI auto-reloads

## Notes

### Timezone
All timestamps in this application use **Singapore Time (Asia/Singapore, UTC+8)**. If you need to change the timezone, update all occurrences of `timezone(timedelta(hours=8))` in the codebase.

### Approval Storage
Pending approvals are stored in `server/pending_calendar_approvals.json`. This file is created automatically and persists between server restarts.

### First-Time Setup
On the first backend run, you'll be prompted to authorize the application with your Google account. This creates a `token.json` file that stores your credentials for future use.

### API Documentation
Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation powered by FastAPI's Swagger UI.
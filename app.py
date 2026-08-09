from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
from google_calendar.calendar_utils import Calendar

app = FastAPI(title="Calendar AI API", description="API for retrieving Google Calendar events")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize the Calendar instance
calendar = Calendar()

@app.get("/")
def read_root():
    """Root endpoint with API information"""
    return {
        "message": "Welcome to Calendar AI API",
        "endpoints": {
            "/events": "Retrieve calendar events",
            "/docs": "API documentation"
        }
    }

@app.get("/events")
def get_events(start_date: Optional[str] = Query(None, description="Start date in ISO format (e.g., 2023-01-01T00:00:00Z)"),
               end_date: Optional[str] = Query(None, description="End date in ISO format (e.g., 2023-01-07T00:00:00Z)"),
):
    """
    Retrieve calendar events within a specified date range.
    
    Parameters:
    - start_date: Start date (defaults to now)
    - end_date: End date (optional, calculated from days if not provided)
    
    Returns:
    - List of calendar events with details
    """
    try:
        # Parse start_date or use now
        if start_date:
            start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start = datetime.now()
        
        # Parse end_date or calculate from days
        if end_date:
            end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end = start + timedelta(days=1)
        
        # Retrieve events
        events = calendar.get_events_by_date_range(start, end)
        
        return {
            "success": True,
            "count": len(events),
            "start_date": start.isoformat(),
            "end_date": end.isoformat(),
            "events": events
        }
    
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "events": []
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

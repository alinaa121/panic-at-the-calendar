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


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    """Normalize optional query text values from API calls.

    Treats empty strings and common null-like literals as missing values.
    """
    if value is None:
        return None

    normalized = value.strip()
    if not normalized:
        return None

    if normalized.lower() in {"null", "none", "undefined"}:
        return None

    return normalized

@app.get("/")
def read_root():
    """Return API welcome metadata and advertised endpoints.

    Returns:
        dict: A static payload with service name and key route hints.
    """
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
    Retrieve calendar events within a date range.

    Args:
        start_date (Optional[str]): ISO-8601 datetime string for the range start.
            If omitted, current time is used.
        end_date (Optional[str]): ISO-8601 datetime string for the range end.
            If omitted, defaults to 1 day after `start_date`.

    Returns:
        dict: Response object with success flag, range metadata, and
            an `events` array.

    Notes:
        Datetimes are parsed with support for trailing `Z` by replacing it
        with `+00:00` before `datetime.fromisoformat`.
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

@app.post("/create_event")
def create_event(start: str, end: str, location: Optional[str] = None, description: Optional[str] = None, summary: Optional[str] = None):
    """Create a Google Calendar event.

    Args:
        start (str): Event start datetime string.
        end (str): Event end datetime string.
        location (Optional[str]): Event location.
        description (Optional[str]): Event description.
        summary (Optional[str]): Event title.

    Returns:
        dict: Response with success flag and created event payload.
    """
    event = calendar.create_event(start, end, location, description, summary)
    return {
        "success": True,
        "event": event
    }

@app.post("/delete_event")
def delete_event(event_id: str):
    """Delete a Google Calendar event by event ID.

    Args:
        event_id (str): Google Calendar event identifier.

    Returns:
        dict: Response with success flag and deleted event ID.
    """
    result = calendar.delete_event_by_id(event_id)
    return {
        "success": result,
        "event_id": event_id
    }

@app.post("/update_event")
def update_event(event_id: str, start: Optional[str] = None, end: Optional[str] = None, location: Optional[str] = None, description: Optional[str] = None, summary: Optional[str] = None):
    """Update an event by replacing it with a newly created event.

    Args:
        event_id (str): Existing event ID to update.
        start (Optional[str]): New start datetime string.
        end (Optional[str]): New end datetime string.
        location (Optional[str]): New location.
        description (Optional[str]): New description.
        summary (Optional[str]): New event title.

    Returns:
        dict: Success payload with the original event data.

    Notes:
        This endpoint currently performs update as delete + create.
        If a field is omitted, it falls back to the original event value.
    """
    event = calendar.get_event_by_id(event_id)
    if not event:
        return {
            "success": False,
            "error": f"Event with ID {event_id} not found."
        }

    start = start or event['start']
    end = end or event['end']

    normalized_location = _normalize_optional_text(location)
    normalized_description = _normalize_optional_text(description)
    normalized_summary = _normalize_optional_text(summary)

    location = normalized_location if location is not None else event.get('location')
    description = normalized_description if description is not None else event.get('description')
    summary = normalized_summary if summary is not None else event.get('summary')

    # Ensure we never persist stringified null markers into calendar fields.
    if isinstance(location, str) and location.strip().lower() in {"null", "none", "undefined"}:
        location = None
    if isinstance(description, str) and description.strip().lower() in {"null", "none", "undefined"}:
        description = None
    if isinstance(summary, str) and summary.strip().lower() in {"null", "none", "undefined"}:
        summary = None
    
    calendar.delete_event_by_id(event_id)  # Delete the existing event
    calendar.create_event(start, end, location, description, summary)  # Create a new event with updated details
    return {
        "success": True,
        "event": event
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

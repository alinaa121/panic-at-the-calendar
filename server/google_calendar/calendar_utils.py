from datetime import datetime
from datetime import timedelta
from datetime import timezone
import os
from zoneinfo import ZoneInfo
from zoneinfo import ZoneInfoNotFoundError

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

class Calendar: 

    def __init__(self):
        """
        Initializes the Calendar class and sets up the Google Calendar API credentials.
        """
        self.SCOPES = [
            "https://www.googleapis.com/auth/calendar.events",
            "https://www.googleapis.com/auth/calendar.readonly",
        ]
        self.default_timezone = self._get_default_timezone()
        self.base_dir = os.path.dirname(os.path.abspath(__file__))
        self.token_path = os.path.join(self.base_dir, "token.json")
        self.credentials_path = os.path.join(self.base_dir, "credentials.json")
        self.creds = None
        self.service = None
        self.authenticate()

    def _get_default_timezone(self):
        """Returns Singapore timezone, with a fixed UTC+08:00 fallback."""
        try:
            return ZoneInfo("Asia/Singapore")
        except ZoneInfoNotFoundError:
            return timezone(timedelta(hours=8))

    def _invalidate_token(self, token_path):
        """Clears current credentials and removes a stale token file."""
        self.creds = None
        if os.path.exists(token_path):
            os.remove(token_path)

    def _persist_token(self):
        """Writes the current credentials back to disk when available."""
        if self.creds:
            with open(self.token_path, "w") as token:
                token.write(self.creds.to_json())

    def _to_rfc3339_utc(self, value):
        """Converts datetime-like input to an RFC3339 UTC string.

        Naive datetimes/strings are interpreted as Asia/Singapore time.
        """
        if isinstance(value, datetime):
            dt = value
        elif isinstance(value, str):
            normalized = value.strip().replace(" ", "T")
            if normalized.endswith("Z"):
                normalized = normalized.replace("Z", "+00:00")
            dt = datetime.fromisoformat(normalized)
        else:
            raise ValueError("start/end must be datetime or ISO datetime string")

        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=self.default_timezone)

        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    def _to_sgt_output(self, value):
        """Converts an RFC3339 datetime string to SGT for API responses.

        All-day date-only values are returned unchanged.
        """
        if not isinstance(value, str):
            return value

        normalized = value.strip()
        if "T" not in normalized:
            return normalized

        if normalized.endswith("Z"):
            normalized = normalized.replace("Z", "+00:00")

        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)

        return dt.astimezone(self.default_timezone).isoformat()

    def _normalize_optional_text(self, value):
        """Normalizes optional text values for event fields.

        Converts empty or null-like strings to None.
        """
        if value is None:
            return None

        if not isinstance(value, str):
            return value

        normalized = value.strip()
        if not normalized:
            return None

        if normalized.lower() in {"null", "none", "undefined"}:
            return None

        return normalized

    def _ensure_authenticated(self):
        """Restores missing token state or rebuilds auth before an API call."""
        if not self.creds or not self.service:
            self.authenticate()
            return

        if not os.path.exists(self.token_path):
            if self.creds.valid:
                self._persist_token()
            else:
                self.authenticate()

    def authenticate(self):
        """
        Handles authentication with Google Calendar API.
        Loads or creates credentials and builds the service.
        """
        # Load existing credentials from the module-local token file if it exists
        if os.path.exists(self.token_path):
            try:
                self.creds = Credentials.from_authorized_user_file(self.token_path, self.SCOPES)
            except Exception:
                self._invalidate_token(self.token_path)

        # A token created with different scopes can authenticate as anonymous for protected calls.
        if self.creds and not self.creds.has_scopes(self.SCOPES):
            self._invalidate_token(self.token_path)

        # If there are no (valid) credentials available, let the user log in
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                try:
                    self.creds.refresh(Request())
                except Exception as exc:
                    if "invalid_scope" in str(exc).lower() or "invalid_grant" in str(exc).lower():
                        self._invalidate_token(self.token_path)
                    else:
                        self._invalidate_token(self.token_path)

            if not self.creds or not self.creds.valid:
                flow = InstalledAppFlow.from_client_secrets_file(
                    self.credentials_path, self.SCOPES
                )
                self.creds = flow.run_local_server(port=0)

            # Save the credentials for the next run
            self._persist_token()

        # Build the service
        self.service = build("calendar", "v3", credentials=self.creds)

    def get_event_by_id(self, event_id):
        """
        Retrieves a single event from the user's Google Calendar by its ID.

        Args:
            event_id (str): The Google Calendar event ID.

        Returns:
            dict: Event payload if found, or None if not found.
                All datetime values in the returned event are in Singapore time
                (Asia/Singapore timezone).
        """
        try:
            self._ensure_authenticated()
            event = self.service.events().get(calendarId="primary", eventId=event_id).execute()
            return {
                "id": event.get("id"),
                "summary": event.get("summary"),
                "start": self._to_sgt_output(event["start"].get("dateTime", event["start"].get("date"))),
                "end": self._to_sgt_output(event["end"].get("dateTime", event["end"].get("date"))),
                "location": self._normalize_optional_text(event.get("location")),
                "description": self._normalize_optional_text(event.get("description")),
            }
        except HttpError as error:
            print(f"An error occurred while retrieving event {event_id}: {error}")
            return None
        
    def get_events_by_date_range(self, start_date=None, end_date=None):
        """
        Retrieves events from the user's Google Calendar between specified dates.

        Args:
            start_date (datetime | str): The start date/time for the event range.
                If None, defaults to current Singapore time.
            end_date (datetime | str): The end date/time for the event range.
                If None, defaults to 1 day after start_date in Singapore time.

        Returns:
            list: A list of events within the specified date range.
                All datetime values in returned events are in Singapore time
                (Asia/Singapore timezone).
        """
        # Default to Singapore time if not provided
        if start_date is None:
            start_date = datetime.now(self.default_timezone)
        if end_date is None:
            end_date = datetime.now(self.default_timezone) + timedelta(days=1)
        try:
            self._ensure_authenticated()

            # Convert range boundaries to UTC RFC3339, interpreting naive input as SGT.
            time_min = self._to_rfc3339_utc(start_date)
            time_max = self._to_rfc3339_utc(end_date)
            
            events_result = (
                self.service.events()
                .list(
                    calendarId="primary",
                    timeMin=time_min,
                    timeMax=time_max,
                    singleEvents=True,
                    orderBy="startTime",
                )
                .execute()
            )
            events = events_result.get("items", [])

            # Format events into a cleaner structure
            formatted_events = []
            for event in events:
                # Extract start and end times (can be dateTime or date)
                start_time = event['start'].get('dateTime', event['start'].get('date'))
                end_time = event['end'].get('dateTime', event['end'].get('date'))
                start_time = self._to_sgt_output(start_time)
                end_time = self._to_sgt_output(end_time)
                
                formatted_events.append({
                    'id': event['id'],
                    'summary': event.get('summary', 'No title'),
                    'start': start_time,
                    'end': end_time,
                    'location': self._normalize_optional_text(event.get('location')),
                    'description': self._normalize_optional_text(event.get('description')),
                    'colorId': event.get('colorId')
                })
            
            return formatted_events
        except HttpError as error:
            print(f"An error occurred: {error}")
            return []

    def create_event(self, start, end, location=None, description=None, summary=None):
        """
        Creates a new Google Calendar event on the primary calendar.

        Args:
            start (datetime | str): Event start date/time in Singapore time.
            end (datetime | str): Event end date/time in Singapore time.
            location (str): Optional event location.
            description (str): Optional event description.
            summary (str): Event title/summary.

        Returns:
            dict: The created event payload, or None if creation fails.
                All datetime values in the returned event are in Singapore time
                (Asia/Singapore timezone).
        """
        try:
            self._ensure_authenticated()

            start_iso = self._to_rfc3339_utc(start)
            end_iso = self._to_rfc3339_utc(end)
            normalized_location = self._normalize_optional_text(location)
            normalized_description = self._normalize_optional_text(description)
            normalized_summary = self._normalize_optional_text(summary)

            event_body = {
                "summary": normalized_summary or "New Event",
                "start": {
                    "dateTime": start_iso,
                    "timeZone": "UTC",
                },
                "end": {
                    "dateTime": end_iso,
                    "timeZone": "UTC",
                },
            }

            if normalized_location is not None:
                event_body["location"] = normalized_location
            if normalized_description is not None:
                event_body["description"] = normalized_description

            event = self.service.events().insert(
                calendarId="primary",
                body=event_body,
            ).execute()

            return event
        except HttpError as error:
            print(f"An error occurred while creating the event: {error}")
            return None

    def delete_event_by_id(self, event_id):
        """
        Deletes a single event by Google Calendar event ID.

        Args:
            event_id (str): The Google Calendar event ID.

        Returns:
            bool: True if the event was deleted, False otherwise.
        """
        try:
            self._ensure_authenticated()

            self.service.events().delete(
                calendarId="primary",
                eventId=event_id,
            ).execute()
            return True
        except HttpError as error:
            print(f"An error occurred while deleting event {event_id}: {error}")
            return False


    

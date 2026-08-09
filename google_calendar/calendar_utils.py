from datetime import datetime
from datetime import timedelta
import os.path

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
        self.SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]
        self.creds = None
        self.service = None
        self.authenticate()

    def authenticate(self):
        """
        Handles authentication with Google Calendar API.
        Loads or creates credentials and builds the service.
        """
        # Load existing credentials from token.json if it exists
        if os.path.exists("token.json"):
            self.creds = Credentials.from_authorized_user_file("token.json", self.SCOPES)
        
        # If there are no (valid) credentials available, let the user log in
        if not self.creds or not self.creds.valid:
            if self.creds and self.creds.expired and self.creds.refresh_token:
                self.creds.refresh(Request())
            else:
                flow = InstalledAppFlow.from_client_secrets_file(
                    "credentials.json", self.SCOPES
                )
                self.creds = flow.run_local_server(port=0)
            # Save the credentials for the next run
            with open("token.json", "w") as token:
                token.write(self.creds.to_json())
        
        # Build the service
        self.service = build("calendar", "v3", credentials=self.creds)

    def get_events_by_date_range(self, start_date=datetime.now(), end_date=datetime.now() + timedelta(days=1)):
        """
        Retrieves events from the user's Google Calendar between specified dates.

        Args:
            start_date (datetime): The start date/time for the event range.
            end_date (datetime): The end date/time for the event range.

        Returns:
            list: A list of events within the specified date range.
        """
        try:
            # Convert datetime objects to ISO format with timezone
            if isinstance(start_date, datetime):
                # If timezone-aware, convert to UTC; if naive, assume UTC
                time_min = start_date.isoformat().replace('+00:00', 'Z')
                if not time_min.endswith('Z'):
                    time_min += 'Z'
            else:
                time_min = start_date
                
            if isinstance(end_date, datetime):
                # If timezone-aware, convert to UTC; if naive, assume UTC
                time_max = end_date.isoformat().replace('+00:00', 'Z')
                if not time_max.endswith('Z'):
                    time_max += 'Z'
            else:
                time_max = end_date
            
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
                
                formatted_events.append({
                    'id': event['id'],
                    'summary': event.get('summary', 'No title'),
                    'start': start_time,
                    'end': end_time,
                    'location': event.get('location'),
                    'description': event.get('description'),
                    'colorId': event.get('colorId')
                })
            
            return formatted_events
        except HttpError as error:
            print(f"An error occurred: {error}")
            return []


    

"""LangGraph-compatible tools for calendar access and approval requests.

Read operations use the existing Calendar utility directly. Write operations
never touch Google Calendar from tool calls; they only create pending approval
records that a separate human-confirmed execution path can process later.
"""

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Optional
from uuid import uuid4
from zoneinfo import ZoneInfo

from langchain_core.tools import tool

from google_calendar.calendar_utils import Calendar
from preferences.preference_manager import PreferenceManager


_calendar: Optional[Calendar] = None
_APPROVALS_FILE = Path(__file__).resolve().parents[1] / "pending_calendar_approvals.json"


def _get_calendar() -> Calendar:
	"""Returns a shared Calendar instance for tool calls."""
	global _calendar
	if _calendar is None:
		_calendar = Calendar()
	return _calendar


def _load_pending_approvals() -> dict[str, dict[str, Any]]:
	"""Loads pending approval records from the workspace JSON file."""
	if not _APPROVALS_FILE.exists():
		return {}

	try:
		content = json.loads(_APPROVALS_FILE.read_text(encoding="utf-8"))
		if isinstance(content, dict):
			return content
	except (json.JSONDecodeError, OSError):
		pass

	return {}


def _save_pending_approvals(approvals: dict[str, dict[str, Any]]) -> None:
	"""Persists pending approval records to the workspace JSON file."""
	_APPROVALS_FILE.write_text(
		json.dumps(approvals, indent=2, ensure_ascii=True),
		encoding="utf-8",
	)


def _create_pending_approval(
	action: str,
	payload: dict[str, Any],
	summary: str,
	review_context: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
	"""Stores a pending approval request for a calendar write action."""
	approvals = _load_pending_approvals()
	approval_id = str(uuid4())
	record = {
		"approval_id": approval_id,
		"status": "pending_approval",
		"action": action,
		"summary": summary,
		"payload": payload,
		"review_context": review_context or {},
		"created_at": datetime.now(ZoneInfo("Asia/Singapore")).isoformat(),
	}
	approvals[approval_id] = record
	_save_pending_approvals(approvals)
	return record

@tool
def get_today_date_details() -> dict[str, Any]:
    """Get today's date with day and month details in Singapore time.

    Use this when the agent needs current date context (day name, month name,
    and related fields) without querying calendar events.

    Returns:
        A dictionary containing today's ISO date and day/month/year details
        in Singapore time (Asia/Singapore timezone).

    Safety:
        Read-only. This tool never modifies calendar or approval state.
    """
    now = datetime.now(ZoneInfo("Asia/Singapore"))
    return {
        "iso_date": now.date().isoformat(),
        "day_name": now.strftime("%A"),
        "day_of_month": now.day,
        "weekday_number": now.isoweekday(),  # Monday=1, Sunday=7
        "month_name": now.strftime("%B"),
        "month_number": now.month,
        "year": now.year,
    }

@tool
def get_user_preferences() -> str:
	"""Retrieve the user's currently saved preferences.

	Use this when the agent needs preference context before answering or before
	proposing preference updates.

	Returns:
		The full preferences markdown text stored in preferences.md. Returns an
		empty string if no preferences have been saved yet.

	Safety:
		Read-only. This tool never modifies preferences.
	"""
	preference_manager = PreferenceManager()
	return preference_manager.read_preferences()


@tool
def get_calendar_event_by_id(event_id: str) -> dict | None:
	"""Retrieve one calendar event by its Google Calendar event ID.

	Use this when you already know a specific event ID and need the current
	details for that event.

	Args:
		event_id: The Google Calendar event ID.

	Returns:
		A normalized event dictionary with fields such as id, summary, start,
		end, location, and description, or None if the event cannot be found.

	Safety:
		Read-only. This tool never modifies calendar state.
	"""
	calendar = _get_calendar()
	return calendar.get_event_by_id(event_id)


@tool
def get_calendar_events_by_range(start_date: str, end_date: str) -> list[dict]:
	"""Retrieve calendar events between two date-time boundaries.

	Use this as the primary retrieval tool when the agent can determine its own
	query window.

	Args:
		start_date: ISO datetime string for the range start. Naive values are
			treated as Singapore time.
		end_date: ISO datetime string for the range end. Naive values are treated
			as Singapore time.

	Returns:
		A list of normalized event dictionaries sorted by start time.

	Safety:
		Read-only. This tool never modifies calendar state.
	"""
	calendar = _get_calendar()
	return calendar.get_events_by_date_range(start_date, end_date)


@tool
def get_today_calendar_events() -> list[dict]:
	"""Retrieve all calendar events scheduled for today in Singapore time.

	Use this convenience tool for prompts specifically about today's schedule.

	Returns:
		A list of normalized event dictionaries for the current day in
		Singapore time (Asia/Singapore timezone). All datetime values in
		returned events are in Singapore time.

	Safety:
		Read-only. This tool never modifies calendar state.
	"""
	calendar = _get_calendar()
	now = datetime.now(ZoneInfo("Asia/Singapore"))
	start = now.replace(hour=0, minute=0, second=0, microsecond=0)
	end = now.replace(hour=23, minute=59, second=59, microsecond=999999)
	return calendar.get_events_by_date_range(start, end)


@tool
def get_upcoming_calendar_events(days: int = 7) -> list[dict]:
	"""Retrieve upcoming calendar events for the next N days in Singapore time.

	Use this convenience tool for forward-looking schedule questions when an
	exact date range is not necessary.

	Args:
		days: Number of days ahead to include, starting from current Singapore time.

	Returns:
		A list of normalized event dictionaries in the upcoming window.
		All datetime values in returned events are in Singapore time
		(Asia/Singapore timezone).

	Safety:
		Read-only. This tool never modifies calendar state.
	"""
	calendar = _get_calendar()
	start = datetime.now(ZoneInfo("Asia/Singapore"))
	end = start + timedelta(days=days)
	return calendar.get_events_by_date_range(start, end)


@tool
def request_create_calendar_event(
	start: str,
	end: str,
	summary: str,
	location: str = "",
	description: str = "",
) -> dict[str, Any]:
	"""Create a pending approval request for a new calendar event.

	Use this when the agent wants to create an event but must not write to the
	calendar without explicit human approval.

	Args:
		start: Proposed event start datetime string in Singapore time.
		end: Proposed event end datetime string in Singapore time.
		summary: Proposed event title.
		location: Optional proposed location.
		description: Optional proposed description.

	Returns:
		A pending approval record containing approval_id, status, action,
		summary, payload, and created_at (in Singapore time).

	Safety:
		Approval-only. This tool does not write to Google Calendar.
	"""
	payload = {
		"start": start,
		"end": end,
		"summary": summary,
		"location": location or None,
		"description": description or None,
	}
	summary_text = f"Create event '{summary}' from {start} to {end}."
	return _create_pending_approval("create_event", payload, summary_text)


@tool
def request_update_calendar_event(
	event_id: str,
	start: Optional[str] = None,
	end: Optional[str] = None,
	summary: Optional[str] = None,
	location: Optional[str] = None,
	description: Optional[str] = None,
) -> dict[str, Any]:
	"""Create a pending approval request to update a calendar event.

	Use this when the agent wants to change an existing event but must not write
	directly to Google Calendar. Current event data is included to support
	human review.

	Args:
		event_id: The existing event ID to update.
		start: Optional proposed replacement start datetime in Singapore time.
		end: Optional proposed replacement end datetime in Singapore time.
		summary: Optional proposed replacement title.
		location: Optional proposed replacement location.
		description: Optional proposed replacement description.

	Returns:
		If the event exists, returns a pending approval record with proposed and
		current event data in the payload (all datetimes in Singapore time).
		If the event does not exist, returns an error dictionary with status="error".

	Safety:
		Approval-only. This tool does not write to Google Calendar.
	"""
	calendar = _get_calendar()
	current_event = calendar.get_event_by_id(event_id)
	if current_event is None:
		return {
			"status": "error",
			"action": "update_event",
			"message": f"Event with ID {event_id} was not found.",
		}

	payload = {"event_id": event_id}
	if start is not None:
		payload["start"] = start
	if end is not None:
		payload["end"] = end
	if summary is not None:
		payload["summary"] = summary
	if location is not None:
		payload["location"] = location
	if description is not None:
		payload["description"] = description

	review_context = {
		"current_event": current_event,
		"resolved_event_after_update": {
			"event_id": event_id,
			"start": payload.get("start", current_event.get("start")),
			"end": payload.get("end", current_event.get("end")),
			"summary": payload.get("summary", current_event.get("summary")),
			"location": payload.get("location", current_event.get("location")),
			"description": payload.get("description", current_event.get("description")),
		},
	}
	summary_text = (
		f"Update event '{current_event.get('summary', 'Untitled Event')}' "
		f"({event_id}) with proposed new details."
	)
	return _create_pending_approval("update_event", payload, summary_text, review_context)


@tool
def request_delete_calendar_event(event_id: str) -> dict[str, Any]:
	"""Create a pending approval request to delete a calendar event.

	Use this when the agent wants to remove an event but must not delete it
	without explicit human approval.

	Args:
		event_id: The existing event ID to delete.

	Returns:
		If the event exists, returns a pending approval record with the current
		event in the payload. If the event does not exist, returns an error
		dictionary with status="error".

	Safety:
		Approval-only. This tool does not delete the event.
	"""
	calendar = _get_calendar()
	current_event = calendar.get_event_by_id(event_id)
	if current_event is None:
		return {
			"status": "error",
			"action": "delete_event",
			"message": f"Event with ID {event_id} was not found.",
		}

	payload = {
		"event_id": event_id,
	}
	review_context = {
		"current_event": current_event,
	}
	summary_text = (
		f"Delete event '{current_event.get('summary', 'Untitled Event')}' "
		f"scheduled from {current_event.get('start')} to {current_event.get('end')}."
	)
	return _create_pending_approval("delete_event", payload, summary_text, review_context)


@tool
def get_pending_calendar_approval(approval_id: str) -> dict[str, Any] | None:
	"""Retrieve one pending calendar approval request by approval ID.

	Use this to inspect a previously proposed write action before presenting it
	for confirmation or rejection.

	Args:
		approval_id: The pending approval identifier returned by a request tool.

	Returns:
		The approval record if present, otherwise None.

	Safety:
		Read-only. This tool never modifies approval state or calendar state.
	"""
	approvals = _load_pending_approvals()
	return approvals.get(approval_id)


@tool
def list_pending_calendar_approvals() -> list[dict[str, Any]]:
	"""List all currently pending calendar approval requests.

	Use this when the agent needs to review outstanding write proposals before
	asking the human for approval.

	Returns:
		A list of pending approval records.

	Safety:
		Read-only. This tool never modifies approval state or calendar state.
	"""
	approvals = _load_pending_approvals()
	return list(approvals.values())


calendar_tools = [
	get_today_date_details,
	get_user_preferences,
	get_calendar_event_by_id,
	get_calendar_events_by_range,
	get_today_calendar_events,
	get_upcoming_calendar_events,
	request_create_calendar_event,
	request_update_calendar_event,
	request_delete_calendar_event,
	get_pending_calendar_approval,
	list_pending_calendar_approvals,
]


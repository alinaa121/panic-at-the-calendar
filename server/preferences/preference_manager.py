"""
Preference Manager
Handles user preferences for the agent replies
"""
import json
import logging
import sys
from pathlib import Path

from google.genai import types

from config import (
	preference_manager_function,
	preference_manager_model,
	preference_manager_prompt,
)

try:
	from gemini import GeminiClient
except ModuleNotFoundError:
	project_root = Path(__file__).resolve().parents[1]
	if str(project_root) not in sys.path:
		sys.path.insert(0, str(project_root))
	from gemini import GeminiClient


logging.basicConfig(
	format='%(asctime)s %(filename)s %(levelname)s: %(message)s',
	level=logging.INFO,
)


class PreferenceManager:
	def __init__(self, preferences_dir: str | None = None):
		base_dir = Path(__file__).resolve().parent
		self.preferences_dir = Path(preferences_dir) if preferences_dir else base_dir

	def load_preferences_md_file(self) -> str:
		"""Loads preference markdown content from disk.

		Priority:
		2) preferences.md
		"""
		target = self.preferences_dir / "preferences.md"

		if not target.exists():
			return ""

		return target.read_text(encoding="utf-8")

	def read_preferences(self) -> str:
		"""Reads user preferences from the markdown file."""
		return self.load_preferences_md_file()

	def write_preferences(self, new_preferences: str) -> None:
		"""Updates user preferences by writing to the markdown file."""
		target = self.preferences_dir / "preferences.md"
		target.write_text(new_preferences, encoding="utf-8")
		return

	def _extract_updated_preferences(self, response) -> str | None:
		"""Extracts updated_preferences from Gemini tool-call response."""
		function_calls = getattr(response, "function_calls", None) or []
		for function_call in function_calls:
			args = getattr(function_call, "args", None)
			if isinstance(args, dict) and "updated_preferences" in args:
				return self._normalize_updated_preferences(args.get("updated_preferences"))
			
		return None

	def _normalize_updated_preferences(self, value) -> str | None:
		"""Normalizes the updated_preferences value returned by Gemini."""
		if value is None:
			return None

		if isinstance(value, str):
			normalized = value.strip()
			if not normalized or normalized.lower() == "null":
				return None
			return normalized

		return str(value)

	def update_preferences(self, new_input: str) -> str | None:
		"""Updates preferences via Gemini tool call.

		Returns None when input is already captured, otherwise returns the
		full updated preferences text and persists it.
		"""
		current_preferences = self.read_preferences()
		prompt = preference_manager_prompt.format(
			current_preferences=current_preferences,
			new_input=new_input,
		)

		gemini_client = GeminiClient()
		config = types.GenerateContentConfig(
			tools=[
				types.Tool(
					function_declarations=[
						types.FunctionDeclaration(**preference_manager_function)
					]
				)
			],
			temperature=0,
		)

		response = gemini_client.call_gemini(
			content_parts=[types.Part(text=prompt)],
			model=preference_manager_model,
			config=config,
		)

		if response is None:
			logging.error("Gemini returned no response for preference update.")
			return None
		updated_preferences = self._extract_updated_preferences(response)
		if updated_preferences is None:
			return None

		return updated_preferences
		

    

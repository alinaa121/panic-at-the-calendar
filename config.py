#clothing ingestion pipeline
import os
from dotenv import load_dotenv

load_dotenv()
preference_manager_model = "gemini-3-flash-preview"
preference_manager_prompt = """You are a helpful assistant that manages user preferences for an AI agent.

You will be provided with the current user preferences and a new user input.
Your task is to update the preferences based on the new input while ensuring
that the preferences remain clear, concise, and relevant to the user's needs.

Rules:
- If the new input contradicts existing preferences, prioritize the new input.
- If the new input is unclear or ambiguous, ask for clarification.
- Always maintain a polite and professional tone in your responses.
- If the new input is already captured in the current preferences, return null.
- Otherwise, return the entire updated preferences text (not a diff).

Formatting:
- Write preferences as concise bullet points.
- Keep each bullet to a single clear preference.
- Avoid long paragraphs and redundant wording.

Output format:
- If already captured: return null.
- If updated: return one markdown string containing the full preferences list in bullet format.

Current Preferences:
{current_preferences}

New User Input:
{new_input}
"""

preference_manager_function = {
    "name": "preference_manager",
    "description": (
        "Updates user preferences from new input. "
        "Return null when the input is already captured; otherwise return the full updated preferences text."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "updated_preferences": {
                "type": "STRING",
                "description": (
                    "The full updated preferences text. "
                    "Return the literal string null if the new user input is already represented in existing preferences."
                )
            }
        },
        "required": ["updated_preferences"],
    }
}

agent_model = "gemini-3-flash-preview"
agent_temperature = 0
agent_top_p = 1
agent_system_prompt = """
You are a calendar management agent. 
Use the available tools to answer calendar questions and to prepare approval requests for create, update, or delete actions.
 Never imply that a write action has already been executed when the tool only created a pending approval request. 
After using tools, provide a helpful final answer to the user. Be motivational and positive.
"""
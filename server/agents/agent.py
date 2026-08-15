"""Calendar AI agent built with Gemini and LangGraph.

This agent accepts a user's request, decides which exposed calendar tools to
use, and returns both a final response and a concise summary of actions taken.
Write-oriented tools only create approval requests; they do not directly
mutate the calendar.
"""

import logging
import os
from typing import Any, Dict, Iterable, List

from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.prebuilt import create_react_agent
from config import agent_model, agent_system_prompt, agent_temperature, agent_top_p

from .tools import calendar_tools


logger = logging.getLogger(__name__)

load_dotenv()



llm = ChatGoogleGenerativeAI(
	model=agent_model,
	temperature=agent_temperature,
	top_p=agent_top_p,
	api_key=os.getenv("gemini"),
)


def _stringify_content(content: Any) -> str:
	"""Normalizes LangChain/LangGraph message content into plain text."""
	if isinstance(content, str):
		return content

	if isinstance(content, list):
		parts: List[str] = []
		for item in content:
			if isinstance(item, str):
				parts.append(item)
			elif isinstance(item, dict):
				text_value = item.get("text") or item.get("content") or ""
				if text_value:
					parts.append(str(text_value))
		return " ".join(part for part in parts if part).strip()

	return str(content)


def _extract_final_ai_message(messages: Iterable[Any]) -> str:
	"""Returns the last AI-authored message content from agent output."""
	for message in reversed(list(messages)):
		message_type = getattr(message, "type", None)
		if message_type == "ai":
			return _stringify_content(getattr(message, "content", "")).strip()
	return ""


def _summarize_tool_activity(messages: Iterable[Any]) -> List[str]:
	"""Builds a concise list of tool actions the agent performed."""
	actions: List[str] = []
	for message in messages:
		message_type = getattr(message, "type", None)
		if message_type != "tool":
			continue

		tool_name = getattr(message, "name", "tool")
		content = _stringify_content(getattr(message, "content", "")).strip()
		content_preview = content[:140] + ("..." if len(content) > 140 else "")
		if content_preview:
			actions.append(f"Used {tool_name}: {content_preview}")
		else:
			actions.append(f"Used {tool_name}.")
	return actions


def run_agent(user_input: str, max_iterations: int = 10) -> Dict[str, Any]:
	"""Run the calendar agent on a user request.

	Args:
		user_input: The user's natural-language request.
		max_iterations: Maximum number of agent recursion/tool iterations.

	Returns:
		A dictionary containing the final response, a summary of actions taken,
		and raw tool activity metadata.
	"""
	try:
		agent = create_react_agent(
			model=llm,
			tools=calendar_tools,
			prompt=agent_system_prompt,
		)

		result = agent.invoke(
			{"messages": [{"role": "user", "content": user_input}]},
			config={"recursion_limit": max_iterations},
		)

		messages = result.get("messages", []) if isinstance(result, dict) else []
		final_response = _extract_final_ai_message(messages)
		tool_actions = _summarize_tool_activity(messages)

		action_summary = "No tools were used."
		if tool_actions:
			action_summary = "\n".join(f"- {action}" for action in tool_actions)

		return {
			"input": user_input,
			"status": "success",
			"agent_response": final_response,
			"action_summary": action_summary,
			"tool_actions": tool_actions,
		}

	except Exception as exc:
		logger.error("Error while running calendar agent: %s", exc)
		return {
			"input": user_input,
			"status": "error",
			"error": str(exc),
			"agent_response": "",
			"action_summary": "Agent execution failed before completion.",
			"tool_actions": [],
		}


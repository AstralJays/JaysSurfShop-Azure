"""LLM provider for chat-rag on Azure — OpenAI (or Azure OpenAI) only.

LLM_PROVIDER env defaults to "openai". Set AZURE_OPENAI_ENDPOINT + AZURE_OPENAI_API_KEY
(and AZURE_OPENAI_DEPLOYMENT_CHAT / AZURE_OPENAI_DEPLOYMENT_EMBED) to switch to Azure OpenAI.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass
from typing import Any


@dataclass
class ChatResult:
    content: str
    tool_calls: list[dict[str, Any]]
    input_tokens: int | None = None
    output_tokens: int | None = None


def provider_name() -> str:
    """Always 'openai' on Azure (standard or Azure OpenAI Service)."""
    return "openai"


def is_configured() -> bool:
    if _azure_openai_endpoint():
        return bool(os.getenv("AZURE_OPENAI_API_KEY") or os.getenv("AZURE_CLIENT_ID"))
    key = os.getenv("OPENAI_API_KEY", "")
    return bool(key) and not key.startswith("sk-your")


def chat_model() -> str:
    return os.getenv("AI_MODEL_CHAT", os.getenv("AZURE_OPENAI_DEPLOYMENT_CHAT", "gpt-4o-mini"))


def embed_model() -> str:
    return os.getenv(
        "AI_MODEL_EMBED",
        os.getenv("AZURE_OPENAI_DEPLOYMENT_EMBED", "text-embedding-3-small"),
    )


def _azure_openai_endpoint() -> str:
    return os.getenv("AZURE_OPENAI_ENDPOINT", "").rstrip("/")


def _openai_client():
    """Return an openai.OpenAI or openai.AzureOpenAI client depending on env."""
    endpoint = _azure_openai_endpoint()
    if endpoint:
        from openai import AzureOpenAI

        return AzureOpenAI(
            azure_endpoint=endpoint,
            api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
        )
    from openai import OpenAI

    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _to_openai_tools(tools: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "type": "function",
            "function": {
                "name": tool["name"],
                "description": tool["description"],
                "parameters": tool["parameters"],
            },
        }
        for tool in tools
    ]


def _parse_openai_tool_calls(message: Any) -> list[dict[str, Any]]:
    calls: list[dict[str, Any]] = []
    for call in getattr(message, "tool_calls", None) or []:
        fn = call.function
        try:
            args = json.loads(fn.arguments or "{}")
        except json.JSONDecodeError:
            args = {}
        calls.append({"id": call.id, "name": fn.name, "arguments": args})
    return calls


def chat_completion(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.4,
    max_tokens: int = 500,
) -> ChatResult:
    if not is_configured():
        raise RuntimeError("LLM provider not configured")
    return _openai_chat(messages, tools=tools, temperature=temperature, max_tokens=max_tokens)


def _openai_chat(
    messages: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None,
    temperature: float,
    max_tokens: int,
) -> ChatResult:
    kwargs: dict[str, Any] = {
        "model": chat_model(),
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if tools:
        kwargs["tools"] = _to_openai_tools(tools)
        kwargs["tool_choice"] = "auto"

    response = _openai_client().chat.completions.create(**kwargs)
    message = response.choices[0].message
    usage = response.usage
    return ChatResult(
        content=message.content or "",
        tool_calls=_parse_openai_tool_calls(message),
        input_tokens=usage.prompt_tokens if usage else None,
        output_tokens=usage.completion_tokens if usage else None,
    )


def continue_with_tool_results(
    messages: list[dict[str, Any]],
    assistant_tool_calls: list[dict[str, Any]],
    tool_results: list[dict[str, Any]],
    *,
    tools: list[dict[str, Any]] | None = None,
    temperature: float = 0.3,
    max_tokens: int = 500,
) -> ChatResult:
    followup: list[dict[str, Any]] = list(messages)
    followup.append(
        {
            "role": "assistant",
            "content": None,
            "tool_calls": [
                {
                    "id": call["id"],
                    "type": "function",
                    "function": {
                        "name": call["name"],
                        "arguments": json.dumps(call["arguments"]),
                    },
                }
                for call in assistant_tool_calls
            ],
        }
    )
    for result in tool_results:
        followup.append(
            {
                "role": "tool",
                "tool_call_id": result["tool_call_id"],
                "content": result["content"],
            }
        )
    return _openai_chat(followup, tools=tools, temperature=temperature, max_tokens=max_tokens)


# Vertex stubs — not used on Azure, kept so chat_service.py import works without changes.
def run_vertex_tool_loop(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]],
    *,
    execute_tool_fn,
    temperature: float = 0.35,
    max_tokens: int = 600,
    max_rounds: int = 4,
) -> ChatResult:
    raise NotImplementedError("Vertex is not available on Azure deployment")

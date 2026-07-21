"""Embedding backend for Azure chat-rag — OpenAI (or Azure OpenAI) only."""
from __future__ import annotations

import os

import chromadb.utils.embedding_functions as embedding_functions
from chromadb.api.types import EmbeddingFunction, Documents

from llm_provider import embed_model, _azure_openai_endpoint


def get_embedding_function() -> EmbeddingFunction[Documents]:
    """Return a ChromaDB embedding function for OpenAI or Azure OpenAI."""
    endpoint = _azure_openai_endpoint()
    if endpoint:
        return embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("AZURE_OPENAI_API_KEY", ""),
            api_base=endpoint,
            api_type="azure",
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-02-01"),
            model_name=embed_model(),
        )
    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise RuntimeError("No embedding provider configured (set OPENAI_API_KEY or AZURE_OPENAI_ENDPOINT)")
    return embedding_functions.OpenAIEmbeddingFunction(
        api_key=api_key,
        model_name=embed_model(),
    )

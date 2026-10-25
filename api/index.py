"""Vercel ASGI entrypoint; the local and deployed APIs use the same app."""
from backend.app import app

__all__ = ["app"]

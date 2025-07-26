"""
config.py

This module centralizes application configuration management.

It uses pydantic-settings to load settings from environment variables or a .env file,
providing a single, type-hinted source of truth for configuration values like
database URLs, API keys, and other service credentials.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional
from dotenv import load_dotenv


env_path = Path(__file__).parent.parent / ".env"

# Load the .env file from the calculated path if it exists.
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"Loaded environment variables from: {env_path}")
else:
    print(f"Warning: .env file not found at {env_path}. Using default settings or environment variables.")


class Settings(BaseSettings):
    """
    Defines the application's configuration settings.
    Pydantic automatically reads these from environment variables (case-insensitive)
    which were loaded by load_dotenv().
    """
    # URL for the Redis instance, used for caching and as a Celery message broker/result backend.
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # FastAPI authentication
    SECRET_KEY: str
    ADMIN_PASSWORD: str

    class Config:
        # Pydantic can also look for an env file, but we are loading it explicitly above
        # to ensure the correct path is used.
        env_file = ".env"
        env_file_encoding = 'utf-8'

# Create a single, globally-accessible instance of the settings.
settings = Settings()

from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "AI General Chatbot"

    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    @classmethod
    @field_validator("BACKEND_CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: str | List[str]) -> List[str] | str:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",")]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    LIVEKIT_URL: str = "livekit_url"
    LIVEKIT_API_KEY: str = "********"
    LIVEKIT_API_SECRET: str = "********"

    OPENAI_API_KEY: str = "********"

    STT_API_URL: str = "http://10.1.2.94:8000/v1/"
    LLM_API_URL: str = "http://10.1.2.94:11434/v1/"
    TTS_API_URL: str = "http://10.1.2.94:3000/api/v1/"
    TTS_API_KEY: str = "********"

    SECRET_KEY: str = "********"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 300

    SQLALCHEMY_DATABASE_URI: str = "sqlite:///./app.db"

    LANGCHAIN_TRACING_V2: bool = 'true'
    LANGSMITH_ENDPOINT: str = "https: // api.smith.langchain.com"
    LANGSMITH_API_KEY: str= "********"
    LANGSMITH_PROJECT: str = "pr-only-surround-27"

    QDRANT_PORT: int = 6333
    QDRANT_HOST: str = "localhost"

    TAVILY_API_KEY: str = "********"
    FIRECRAWL_API_KEY: str = "********"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"


settings = Settings()

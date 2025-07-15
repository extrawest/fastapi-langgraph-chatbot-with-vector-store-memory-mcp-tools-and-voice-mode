from pydantic import BaseModel, Field

class LLMRequest(BaseModel):
    user_message: str = Field(description="Chat message")
    chat_id: str = Field(description="Chat ID")


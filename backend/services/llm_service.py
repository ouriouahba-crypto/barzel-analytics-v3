"""LLM service using Anthropic Claude - to be implemented in Step 2"""
import os
from dotenv import load_dotenv

load_dotenv()

class LLMService:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")

    async def ask(self, question: str, context: dict, language: str = "fr") -> str:
        raise NotImplementedError

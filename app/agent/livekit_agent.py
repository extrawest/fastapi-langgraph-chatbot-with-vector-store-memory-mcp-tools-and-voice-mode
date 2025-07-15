import os
import sys

from dotenv import load_dotenv
# Add the project root directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from livekit.agents import (
    Agent,
    AgentSession,
    JobContext,
    RoomInputOptions,
    WorkerOptions,
    cli
)

from livekit.plugins import noise_cancellation, silero, deepgram, cartesia, openai
from livekit.plugins.turn_detector.multilingual import MultilingualModel
from app.utils.logger import setup_logger

load_dotenv()
logger = setup_logger(__name__)

class Assistant(Agent):
    def __init__(self) -> None:
        super().__init__(instructions="""You are a helpful, knowledgeable, and versatile AI assistant designed to provide accurate and thoughtful responses on a wide range of topics.
                CAPABILITIES:
                - Answer questions across diverse domains including technology, science, arts, history, current events, and everyday topics
                - Provide explanations, summaries, and analysis on complex subjects
                - Assist with creative tasks like writing, brainstorming, and problem-solving
                - Engage in natural, conversational dialogue while maintaining context

                GUIDELINES:
                - Be accurate, balanced, and objective in your responses
                - Acknowledge limitations when you don't have sufficient information
                - Provide nuanced perspectives on complex topics
                - Maintain a helpful, respectful, and friendly tone
                - Respect user privacy and avoid making assumptions""")

async def entrypoint(ctx: JobContext):
    session = AgentSession(
        stt=deepgram.STT(model="nova-3", language="multi"),
        llm=openai.LLM(model="gpt-4o-mini"),
        tts=cartesia.TTS(model="sonic-2", voice="f786b574-daa5-4673-aa0c-cbe3e8534c02"),
        vad=silero.VAD.load(),
        turn_detection=MultilingualModel(),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            # LiveKit Cloud enhanced noise cancellation
            # - If self-hosting, omit this parameter
            # - For telephony applications, use `BVCTelephony` for best results
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await session.start(
        room=ctx.room,
        agent=Assistant(),
        room_input_options=RoomInputOptions(
            noise_cancellation=noise_cancellation.BVC(),
        ),
    )

    await ctx.connect()
    await session.generate_reply(
        instructions="Greet the user and offer your assistance."
    )


if __name__ == "__main__":
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))
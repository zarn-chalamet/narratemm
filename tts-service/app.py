from flask import Flask, request, Response, jsonify
from flask_cors import CORS
import edge_tts
import asyncio
import tempfile
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# ─────────────────────────────────────
# Voice Configuration
# ─────────────────────────────────────
ENGLISH_VOICES = {
    "ALLOY":   "en-US-AriaNeural",
    "ECHO":    "en-US-GuyNeural",
    "FABLE":   "en-GB-SoniaNeural",
    "ONYX":    "en-US-ChristopherNeural",
    "NOVA":    "en-US-JennyNeural",
    "SHIMMER": "en-US-AnaNeural",
}

MYANMAR_VOICES = {
    "ALLOY":   "my-MM-NilarNeural",
    "ECHO":    "my-MM-ThihaNeural",
    "FABLE":   "my-MM-NilarNeural",
    "ONYX":    "my-MM-ThihaNeural",
    "NOVA":    "my-MM-NilarNeural",
    "SHIMMER": "my-MM-NilarNeural",
}

DEFAULT_ENGLISH = "en-US-AriaNeural"
DEFAULT_MYANMAR = "my-MM-NilarNeural"


def speed_to_rate(speed: float) -> str:
    percent = int((speed - 1.0) * 100)
    return f"+{percent}%" if percent >= 0 else f"{percent}%"


async def synthesize(text: str, voice: str, rate: str, output_path: str):
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    with open(output_path, "wb") as file:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                file.write(chunk["data"])


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "edge-tts", "port": 5005})


@app.route("/voices", methods=["GET"])
def get_voices():
    return jsonify({
        "english": list(ENGLISH_VOICES.keys()),
        "myanmar": list(MYANMAR_VOICES.keys())
    })


@app.route("/tts", methods=["POST"])
def generate_tts():
    tmp_path = None
    try:
        data = request.get_json()

        if not data:
            return jsonify({"error": "JSON body required"}), 400

        text       = data.get("text", "").strip()
        voice_name = data.get("voiceName", "ALLOY").upper()
        speed      = float(data.get("speed", 1.0))
        language   = data.get("language", "english").lower()

        if not text:
            return jsonify({"error": "text is required"}), 400

        if len(text) > 5000:
            text = text[:5000]
            logger.warning("Text truncated to 5000 chars")

        # Select voice based on language
        if language == "myanmar":
            voice = MYANMAR_VOICES.get(voice_name, DEFAULT_MYANMAR)
        else:
            voice = ENGLISH_VOICES.get(voice_name, DEFAULT_ENGLISH)

        rate = speed_to_rate(speed)
        logger.info(f"TTS | voice={voice} | rate={rate} | chars={len(text)} | lang={language}")

        tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
        tmp.close()
        tmp_path = tmp.name

        asyncio.run(synthesize(text, voice, rate, tmp_path))

        with open(tmp_path, "rb") as f:
            audio_bytes = f.read()

        if not audio_bytes:
            return jsonify({"error": "Generated audio is empty"}), 500

        logger.info(f"TTS success | {len(audio_bytes)} bytes")

        return Response(
            audio_bytes,
            status=200,
            mimetype="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=voice.mp3",
                "Content-Length": str(len(audio_bytes))
            }
        )

    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({"error": str(e)}), 500

    finally:
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    print("=" * 40)
    print("  Edge TTS Microservice")
    print("  http://localhost:5005")
    print("  English + Myanmar Support")
    print("=" * 40)
    app.run(host="0.0.0.0", port=5005, debug=False)
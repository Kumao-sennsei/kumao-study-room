export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { text } = req.body || {};

    if (!text) {
      return res.status(400).json({ error: "text required" });
    }

    if (!process.env.ELEVEN_API_KEY) {
      return res.status(500).json({ error: "ELEVEN_API_KEY is missing" });
    }

    if (!process.env.ELEVEN_VOICE_ID) {
      return res.status(500).json({ error: "ELEVEN_VOICE_ID is missing" });
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Content-Type": "application/json",
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.55,
            similarity_boost: 0.8,
            style: 0.4,
            use_speaker_boost: true
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs error:", errText);
      return res.status(response.status).json({
        error: "ElevenLabs request failed",
        details: errText
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Content-Length", buffer.length);
    return res.status(200).send(buffer);

  } catch (e) {
    console.error("TTS route error:", e);
    return res.status(500).json({
      error: "Server error",
      details: e.message
    });
  }
}

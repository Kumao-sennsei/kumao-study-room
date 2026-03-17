export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  if (!process.env.ELEVEN_API_KEY) {
    return res.status(500).json({ error: "ELEVEN_API_KEY is missing" });
  }

  if (!process.env.ELEVEN_VOICE_ID) {
    return res.status(500).json({ error: "ELEVEN_VOICE_ID is missing" });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVEN_VOICE_ID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": process.env.ELEVEN_API_KEY,
          "Accept": "audio/mpeg"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2"
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

    const audioBuffer = await response.arrayBuffer();
    const audioBytes = Buffer.from(audioBuffer);

    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send(audioBytes);
  } catch (error) {
    console.error("TTS API error:", error);
    return res.status(500).json({
      error: "Internal server error",
      details: error.message
    });
  }
}

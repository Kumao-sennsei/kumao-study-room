export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};

  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  const apiKey = process.env.ELEVEN_API_KEY;
  const voiceId = process.env.ELEVEN_VOICE_ID;

  console.log("ELEVEN_API_KEY exists:", !!apiKey);
  console.log("ELEVEN_API_KEY prefix:", apiKey ? apiKey.slice(0, 3) : null);
  console.log("ELEVEN_API_KEY length:", apiKey ? apiKey.length : 0);
  console.log("ELEVEN_VOICE_ID:", voiceId);

  if (!apiKey) {
    return res.status(500).json({ error: "ELEVEN_API_KEY is missing" });
  }

  if (!voiceId) {
    return res.status(500).json({ error: "ELEVEN_VOICE_ID is missing" });
  }

  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.9,
            similarity_boost: 0.5,
            style: 0.1,
            use_speaker_boost: false
          }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("ElevenLabs status:", response.status);
      console.error("ElevenLabs error body:", errText);
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

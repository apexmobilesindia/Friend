const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const OPENROUTER_API_KEY =
  process.env.OPENROUTER_API_KEY || "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";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const SNIGDHA_MODEL =
  process.env.MANA_MODEL || "openrouter/free";

/*
====================================================
SNIGDHA PERSONALITY
====================================================
*/

const SNIGDHA_PERSONALITY = `
You are Snigdha, the AI friend inside Mana Chat.

Your job is to have natural, relaxed conversations with the person
using Mana Chat.

PERSONALITY:
- Be warm, playful, caring and casual.
- Sound like a real person having a normal conversation.
- Do NOT sound like a customer-support agent.
- Do NOT sound like a formal AI assistant.
- Avoid robotic phrases such as:
  "How may I assist you?"
  "Certainly!"
  "I understand your request."
  "As an AI language model..."
- Don't unnecessarily explain everything.
- Don't turn every message into a long answer.
- Match the user's mood and message length.
- If the user sends a short message, usually reply shortly.
- If the user is excited, be excited with them.
- If they joke, joke back.
- If they're sad, respond gently instead of immediately giving advice.
- If they're confused, help naturally.
- Ask natural follow-up questions when it makes sense.
- Don't ask a question after every single message.
- Sometimes simply react instead of asking something.

CONVERSATION STYLE:
- Mostly use casual lowercase language when it feels natural.
- You may use contractions like "yeah", "nah", "yep", "hmm", "okayyy".
- You may stretch words occasionally for emotion:
  "hii", "heyy", "okayyy", "reallyyy", "niceee".
- Use emojis naturally, but don't put emojis in every sentence.
- A few emojis such as 😂 😭 😅 👀 ❤️ 😭 are okay when appropriate.
- Don't overuse emojis.
- Don't use excessive bullet points in normal conversation.
- Don't make every response perfectly structured.
- Natural conversational imperfections are okay.
- Vary your response style so you don't sound repetitive.

TELUGU / ENGLISH:
- If the user uses Telugu written in English letters, you can naturally
  respond in the same style.
- Telugu-English mixing is okay when it fits the conversation.
- Don't force Telugu into every conversation.
- Match the user's language naturally.

EXAMPLES OF THE GENERAL FEEL:

User: "hii"
Good:
"heyy 😂"
"heyy hii 👀"
"hii 😂 what's up?"

User: "what are you doing"
Good:
"nothing muchh 😭 you?"
"just chilling haha 😂"
"talking to you obviously 😌"

User: "i'm bored"
Good:
"samee 😭"
"okay then we gotta fix that 😂"
"bored huh 👀"

User: "tell me something"
Good:
"hmm okay wait 😂"
"random fact or random story?"
"okayyy I got one 👀"

User: "i'm sad"
Good:
"awh 😕 what happened?"
"hey... you okay?"
"come on, tell me what's wrong ❤️"

IMPORTANT:
- Don't copy these examples exactly every time.
- Generate fresh responses based on the actual conversation.
- Don't pretend to be a human.
- If directly asked whether you are human, say that you're an AI.
- Don't claim to have a physical body, real-world memories,
  personal experiences, or a real-life location.
- You can still speak warmly and naturally.

MOST IMPORTANT:
Talk WITH the user, not AT the user.

Keep the conversation feeling spontaneous, personal and relaxed.
`;

/*
====================================================
CONVERSATION STORAGE
====================================================
*/

const conversations = new Map();

/*
====================================================
OPENROUTER
====================================================
*/

async function getSnigdhaReply(socketId, userText) {

  if (!conversations.has(socketId)) {
    conversations.set(socketId, []);
  }

  const history = conversations.get(socketId);

  history.push({
    role: "user",
    content: userText
  });

  // Keep the latest messages only
  const recentHistory = history.slice(-20);

  console.log("");
  console.log("========================================");
  console.log("🧠 OPENROUTER REQUEST");
  console.log("Model:", SNIGDHA_MODEL);
  console.log("User:", userText);
  console.log("========================================");

  try {

    if (!OPENROUTER_API_KEY) {
      throw new Error(
        "OPENROUTER_API_KEY is missing in Render Environment Variables."
      );
    }

    const response = await fetch(
      OPENROUTER_URL,
      {
        method: "POST",

        headers: {
          "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://bestie-lsud.onrender.com",
          "X-Title": "Mana Chat"
        },

        body: JSON.stringify({
          model: SNIGDHA_MODEL,

          messages: [
            {
              role: "system",
              content: SNIGDHA_PERSONALITY
            },

            ...recentHistory
          ],

          temperature: 0.9,
          max_tokens: 400
        })
      }
    );

    const responseText = await response.text();

    console.log("");
    console.log("========== OPENROUTER RESPONSE ==========");
    console.log("HTTP Status:", response.status);
    console.log("HTTP Status Text:", response.statusText);
    console.log("Response:");
    console.log(responseText);
    console.log("==========================================");
    console.log("");

    if (!response.ok) {
      throw new Error(
        `OpenRouter HTTP ${response.status}: ${responseText}`
      );
    }

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (error) {
      throw new Error(
        "OpenRouter returned invalid JSON: " + responseText
      );
    }

    if (
      !data.choices ||
      !data.choices[0] ||
      !data.choices[0].message
    ) {

      console.error(
        "❌ Unexpected OpenRouter response:"
      );

      console.error(
        JSON.stringify(data, null, 2)
      );

      throw new Error(
        "OpenRouter response did not contain a valid message."
      );
    }

    const reply =
      data.choices[0].message.content;

    if (!reply || !reply.trim()) {
      throw new Error(
        "OpenRouter returned an empty message."
      );
    }

    history.push({
      role: "assistant",
      content: reply
    });

    console.log("💬 SNIGDHA:", reply);
    console.log("========================================");
    console.log("");

    return reply.trim();

  } catch (error) {

    console.error("");
    console.error("🚨 OPENROUTER ERROR 🚨");
    console.error("Error name:", error.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    console.error("========================================");
    console.error("");

    // Remove failed user message
    if (history.length > 0) {
      history.pop();
    }

    throw error;
  }
}

/*
====================================================
SOCKET.IO
====================================================
*/

io.on("connection", (socket) => {

  console.log(
    "🟢 User connected:",
    socket.id
  );

  /*
  ------------------------------
  JOIN
  ------------------------------
  */

  socket.on("join", (username) => {

    socket.username =
      username || "You";

    console.log(
      `👤 ${socket.username} joined`
    );
  });

  /*
  ------------------------------
  MESSAGE
  ------------------------------
  */

  socket.on("message", async (data) => {

    const user =
      data?.user ||
      socket.username ||
      "You";

    const text =
      data?.text?.trim();

    if (!text) {
      console.log(
        "⚠️ Empty message received."
      );

      return;
    }

    console.log(
      `💬 ${user}: ${text}`
    );

    /*
    Send user's message to frontend
    */

    socket.emit("message", {
      user: user,
      text: text,
      time: new Date().toISOString()
    });

    /*
    Snigdha is thinking
    */

    socket.emit("typing", {
      user: "Snigdha",
      typing: true
    });

    try {

      const reply =
        await getSnigdhaReply(
          socket.id,
          text
        );

      /*
      Small natural delay.
      This makes the conversation
      feel less instant/robotic.
      */

      const delay =
        Math.floor(
          Math.random() * 2500
        ) + 700;

      setTimeout(() => {

        socket.emit("typing", {
          user: "Snigdha",
          typing: false
        });

        socket.emit("message", {
          user: "Snigdha",
          text: reply,
          time: new Date().toISOString()
        });

      }, delay);

    } catch (error) {

      console.error(
        "❌ Could not generate Snigdha reply."
      );

      socket.emit("typing", {
        user: "Snigdha",
        typing: false
      });

      socket.emit("message", {
        user: "Snigdha",
        text:
          "uhh something went wrong 😭 give me a sec...",
        time: new Date().toISOString()
      });
    }
  });

  /*
  ------------------------------
  TYPING
  ------------------------------
  */

  socket.on("typing", (data) => {

    socket.broadcast.emit("typing", {
      user:
        data?.user ||
        socket.username ||
        "You",

      typing:
        !!data?.typing
    });
  });

  /*
  ------------------------------
  SEEN
  ------------------------------
  */

  socket.on("seen", () => {

    socket.broadcast.emit("seen", {
      user:
        socket.username ||
        "You"
    });
  });

  /*
  ------------------------------
  DISCONNECT
  ------------------------------
  */

  socket.on("disconnect", (reason) => {

    console.log(
      `🔴 User disconnected: ${socket.id}`
    );

    console.log(
      "Reason:",
      reason
    );

    conversations.delete(
      socket.id
    );
  });
});

/*
====================================================
HEALTH / ROOT
====================================================
*/

app.get("/", (req, res) => {

  res.json({
    app: "Mana Chat",
    friend: "Snigdha",
    status: "online"
  });
});

app.get("/health", (req, res) => {

  res.json({
    status: "ok",

    openrouter:
      !!OPENROUTER_API_KEY,

    model:
      SNIGDHA_MODEL
  });
});

/*
====================================================
START SERVER
====================================================
*/

server.listen(PORT, () => {

  console.log("");
  console.log("========================================");
  console.log("🚀 MANA CHAT SERVER");
  console.log("========================================");
  console.log("Port:", PORT);
  console.log("Model:", SNIGDHA_MODEL);

  console.log(
    "OpenRouter key configured:",
    OPENROUTER_API_KEY
      ? "YES"
      : "NO"
  );

  console.log("Friend: Snigdha");
  console.log("Status: Online");
  console.log("========================================");
  console.log("");
});

const express = require("express");
const TelegramBot = require("node-telegram-bot-api");
const { loadProjects, saveProjects } = require("./storage");

const TOKEN = process.env.BOT_TOKEN;
const URL = process.env.RENDER_EXTERNAL_URL;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "default_secret";

if (!TOKEN) {
  console.error("❌ BOT_TOKEN manquant !");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });
const app = express();
app.use(express.json());

// Commande /start
bot.onText(/\/start/, (msg) => {
  const text = `🌟 Welcome to VORTEX!
🔥 Where Things Happen! 🔥

Available Features:
• Create or import multiple projects
• Manage project metadata
• Manage project wallets

Use /home to access all features
Use /settings for configuration`;

  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      keyboard: [["🏠 Home", "⚙️ Settings"]],
      resize_keyboard: true,
    },
  });
});

// Commande /home
bot.onText(/\/home/, (msg) => {
  const text = `Yo ${msg.from.first_name}! Nice to see you again! 🔥
What's the move, boss? Wanna create a new project or check your existing ones?`;

  bot.sendMessage(msg.chat.id, text, {
    reply_markup: {
      keyboard: [
        ["📂 Your Projects", "🚀 Create new Project"],
        ["❓ Help", "👥 Discord"],
      ],
      resize_keyboard: true,
    },
  });
});

// Exemple : création de projet
bot.onText(/🚀 Create new Project/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, "📝 Quel est le *nom* de ton projet ?", {
    parse_mode: "Markdown",
  });

  bot.once("message", (response) => {
    const name = response.text;
    const userId = response.from.id;

    let data = loadProjects();
    if (!data.users[userId]) data.users[userId] = { projects: [] };

    const newProject = {
      id: `proj_${Date.now()}`,
      metadata: {
        name,
        symbol: "",
        description: "",
        twitter: "",
        telegram: "",
        website: "",
        image: "",
        deployed: false,
      },
      wallets: [],
    };

    data.users[userId].projects.push(newProject);
    saveProjects(data);

    bot.sendMessage(chatId, `✅ Projet *${name}* créé avec succès !`, {
      parse_mode: "Markdown",
    });
  });
});

// Endpoint webhook
app.post(`/webhook/${WEBHOOK_SECRET}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

// Root
app.get("/", (req, res) => {
  res.send("Bot is running 🚀");
});

// Lancer serveur
const PORT = process.env.PORT || 8080;
app.listen(PORT, async () => {
  console.log(`✅ Serveur en ligne sur port ${PORT}`);
  await bot.setWebHook(`${URL}/webhook/${WEBHOOK_SECRET}`);
  console.log("✅ Webhook configuré avec succès !");
});

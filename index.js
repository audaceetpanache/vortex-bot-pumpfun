import express from "express";
import TelegramBot from "node-telegram-bot-api";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import fs from "fs";

// === CONFIG ===
const token = process.env.BOT_TOKEN;
const url = process.env.RENDER_EXTERNAL_URL || "https://vortex-bot-pumpfun.onrender.com";
const port = process.env.PORT || 10000;

// === DB INIT ===
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { users: [] });
await db.read();
db.data ||= { users: [] };
await db.write();

// === BOT INIT ===
const bot = new TelegramBot(token);
const app = express();
app.use(express.json());

// Set webhook
bot.setWebHook(`${url}/webhook`);

app.post("/webhook", (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

app.listen(port, () => {
  console.log(`✅ Serveur en ligne sur port ${port}`);
});

// === HELPERS ===
function getUser(userId) {
  let user = db.data.users.find((u) => u.id === userId);
  if (!user) {
    user = { id: userId, projects: [] };
    db.data.users.push(user);
  }
  return user;
}

function getProject(user, projectId) {
  return user.projects.find((p) => p.id === projectId);
}

// === BOT COMMANDS ===

// /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    "🌟 Welcome to VORTEX!\n🔥 Where Things Happen! 🔥\n\nAvailable Features:\n• Create and manage projects\n\nUse /home to access all features\nUse /settings for configuration",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🏠 Home", callback_data: "home" }, { text: "⚙️ Settings", callback_data: "settings" }]
        ]
      }
    }
  );
});

// /home
bot.onText(/\/home/, async (msg) => {
  const chatId = msg.chat.id;
  await sendHome(chatId, msg.from.first_name);
});

async function sendHome(chatId, firstName) {
  await bot.sendMessage(
    chatId,
    `Yo ${firstName}! Nice to see you again! 🔥\nWhat's the move, boss?`,
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📂 Your Projects", callback_data: "your_projects" }, { text: "🚀 Create new Project", callback_data: "create_project" }]
        ]
      }
    }
  );
}

// === CALLBACKS ===
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const user = getUser(userId);

  if (query.data === "home") {
    await sendHome(chatId, query.from.first_name);
  }

  if (query.data === "your_projects") {
    if (user.projects.length === 0) {
      await bot.sendMessage(chatId, "You don't have any projects yet.");
    } else {
      const buttons = user.projects.map((p) => [{ text: p.name, callback_data: `project_${p.id}` }]);
      await bot.sendMessage(chatId, "📂 Your Projects:", {
        reply_markup: { inline_keyboard: [...buttons, [{ text: "⬅️ Back", callback_data: "home" }]] }
      });
    }
  }

  if (query.data === "create_project") {
    const projectId = Date.now().toString();
    user.projects.push({
      id: projectId,
      name: `New Project ${user.projects.length + 1}`,
      metadata: { deployed: false },
      wallets: []
    });
    await db.write();
    await bot.sendMessage(chatId, `✅ Project created!`, {
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "your_projects" }]]
      }
    });
  }

  if (query.data.startsWith("project_")) {
    const projectId = query.data.split("_")[1];
    const project = getProject(user, projectId);

    await bot.sendMessage(
      chatId,
      `🎯 Project ${project.id}\nName: ${project.name}`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📝 Token Metadata", callback_data: `metadata_${project.id}` }],
            [{ text: "👛 Project Wallets", callback_data: `wallets_${project.id}` }],
            [{ text: "⬅️ Back", callback_data: "your_projects" }]
          ]
        }
      }
    );
  }

  // === TOKEN METADATA ===
  if (query.data.startsWith("metadata_")) {
    const projectId = query.data.split("_")[1];
    const project = getProject(user, projectId);

    let status = project.metadata.deployed ? "✅ Metadata deployed" : "❌ Metadata not yet deployed";

    await bot.sendMessage(
      chatId,
      `🎯 Project ${project.id} Metadata\n${status}\nSelect a field to edit:`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "Name", callback_data: `edit_name_${project.id}` }, { text: "Symbol", callback_data: `edit_symbol_${project.id}` }],
            [{ text: "Description", callback_data: `edit_description_${project.id}` }],
            [{ text: "Deploy Metadata", callback_data: `deploy_metadata_${project.id}` }],
            [{ text: "⬅️ Back", callback_data: `project_${project.id}` }]
          ]
        }
      }
    );
  }

  // Edit Metadata
  if (query.data.startsWith("edit_")) {
    const [_, field, projectId] = query.data.split("_");
    bot.sendMessage(chatId, `Please send me the value for *${field}*`, { parse_mode: "Markdown" });

    bot.once("message", async (msg) => {
      const project = getProject(user, projectId);
      project.metadata[field] = msg.text;
      await db.write();
      bot.sendMessage(chatId, `✅ ${field} saved!`, {
        reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `metadata_${projectId}` }]] }
      });
    });
  }

  // Deploy Metadata
  if (query.data.startsWith("deploy_metadata_")) {
    const projectId = query.data.split("_")[2];
    const project = getProject(user, projectId);
    if (project.metadata.name && project.metadata.symbol && project.metadata.description) {
      project.metadata.deployed = true;
      await db.write();
      await bot.sendMessage(chatId, "✅ Metadata deployed successfully!", {
        reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `project_${project.id}` }]] }
      });
    } else {
      await bot.sendMessage(chatId, "❌ Please complete Name, Symbol, and Description first.");
    }
  }

  // === PROJECT WALLETS ===
  if (query.data.startsWith("wallets_")) {
    const projectId = query.data.split("_")[1];
    const project = getProject(user, projectId);

    let walletButtons = project.wallets.map((w) => [{ text: w.name, callback_data: `wallet_${projectId}_${w.id}` }]);

    await bot.sendMessage(
      chatId,
      `🏦 Project Wallets\nProject: ${project.id}\nSelect a wallet to view details`,
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "➕ Create Wallet", callback_data: `create_wallet_${projectId}` }],
            [{ text: "📥 Import Wallet", callback_data: `create_wallet_${projectId}` }],
            [{ text: "👑 Import Creator", callback_data: `create_wallet_${projectId}` }],
            ...walletButtons,
            [{ text: "⬅️ Back", callback_data: `project_${projectId}` }]
          ]
        }
      }
    );
  }

  if (query.data.startsWith("create_wallet_")) {
    const projectId = query.data.split("_")[2];
    bot.sendMessage(chatId, "Please send the *wallet name*:", { parse_mode: "Markdown" });

    bot.once("message", (msg1) => {
      const walletName = msg1.text;
      bot.sendMessage(chatId, "Now send the *private key*:", { parse_mode: "Markdown" });

      bot.once("message", async (msg2) => {
        const privateKey = msg2.text;
        const project = getProject(user, projectId);

        project.wallets.push({
          id: Date.now().toString(),
          name: walletName,
          privateKey
        });
        await db.write();

        await bot.sendMessage(chatId, `✅ Wallet "${walletName}" added!`, {
          reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `wallets_${projectId}` }]] }
        });
      });
    });
  }
});

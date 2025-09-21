import { testConnection } from './db.js';

testConnection();

// --------------------
// IMPORTS & CONFIG
// --------------------
import TelegramBot from "node-telegram-bot-api";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET || "defaultsecret";
const PORT = process.env.PORT || 10000;

if (!TOKEN) { 
  console.error("❌ TELEGRAM_BOT_TOKEN missing."); 
  process.exit(1); 
}

// --------------------
// DATA HANDLING
// --------------------
const DATA_FILE = "./data.json";
let data = { users: {} };
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));

function saveData() { 
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); 
}

function getUserProjects(userId) { 
  if (!data.users[userId]) data.users[userId] = { projects: [] }; 
  return data.users[userId].projects; 
}

function generateProjectId() { 
  return "P" + Math.random().toString(36).substring(2, 8).toUpperCase(); 
}

function findProject(userId, projectId) { 
  const projects = getUserProjects(userId); 
  return projects.find(p => p.id === projectId); 
}

function saveProjectField(projectId, field, value) {
  for (const userId in data.users) {
    const project = findProject(userId, projectId);
    if (project) {
      if (!project.metadata) project.metadata = {};
      project.metadata[field] = value;

      // Si on modifie le "name", on met à jour le nom du projet aussi
      if (field === "name") {
        project.name = value;
      }

      saveData();
      break;
    }
  }
}

// --------------------
// EXPRESS & WEBHOOK
// --------------------
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}${SECRET}`);

app.post(`/bot${TOKEN}${SECRET}`, (req, res) => { 
  bot.processUpdate(req.body); 
  res.sendStatus(200); 
});

app.listen(PORT, () => console.log(`✅ Bot listening on port ${PORT}`));

// --------------------
// USER STATES
// --------------------
const userStates = {}; // track user editing state

// --------------------
// UTILITY FUNCTIONS
// --------------------
function sendNeedProject(chatId) {
  bot.sendMessage(chatId, `⛔️ You need to create & launch a Project first`, {
    reply_markup: { inline_keyboard: [
      [{ text: "📁 Your Projects", callback_data: "my_projects" }, { text: "🚀 Create New Project", callback_data: "create_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
}

function requireWalletPopup(chatId, projectId) {
  bot.sendMessage(chatId, "⛔️ You need to create a Wallet first", {
    reply_markup: { inline_keyboard: [
      [{ text: "👛 Project Wallet", callback_data: `project_wallet_${projectId}` }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ] }
  });
}

function backHome(chatId, firstName = "friend") {
  bot.sendMessage(chatId, `Yo ${firstName}! Glad you're here! 🔥
  
What's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸

Hit the buttons below and let's make it happen:`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "📁 Your Projects", callback_data: "my_projects" }, { text: "🚀 Create New Project", callback_data: "create_project" }],
        [{ text: "🚀 SPAM LAUNCH", callback_data: "need_project" }],
        [{ text: "🤑 BUMP BOT 🤑", callback_data: "need_project" }],
        [{ text: "💰 GET ALL SOL", callback_data: "need_project" }],
        [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "need_project" }],
        [{ text: "🔗 Referrals", callback_data: "need_project" }, { text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
        [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }]
      ]
    }
  });
}

function sendTokenMetadataMenu(chatId, projectId) {
  const project = findProject(chatId, projectId);
  if (!project) {
    sendNeedProject(chatId);
    return;
  }

  const md = project.metadata || {};
  const text = `
🎯 Project ${projectId} Metadata
Select a field to edit:
${(!md.name || !md.symbol) ? "❌ Metadata not yet deployed" : "✅ Metadata ready"}
`;

  bot.sendMessage(chatId, text, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: [
        [{ text: `📝 Name: ${md.name || "Not set"}`, callback_data: `meta_name_${projectId}` }, { text: `💎 Symbol: ${md.symbol || "Not set"}`, callback_data: `meta_symbol_${projectId}` }],
        [{ text: `📋 Description: ${md.description ? "✅ Set" : "Not set"}`, callback_data: `meta_desc_${projectId}` }],
        [{ text: `🐦 Twitter: ${md.twitter ? "✅ Set" : "Not set"}`, callback_data: `meta_twitter_${projectId}` }, { text: `📱 Telegram: ${md.telegram ? "✅ Set" : "Not set"}`, callback_data: `meta_telegram_${projectId}` }],
        [{ text: `🌐 Website: ${md.website ? "✅ Set" : "Not set"}`, callback_data: `meta_website_${projectId}` }],
        [{ text: `🖼️ Image: ${md.image ? "✅ Set" : "Not set"}`, callback_data: `meta_image_${projectId}` }],
        [{ text: "🚀 DEPLOY METADATA", callback_data: `meta_deploy_${projectId}` }, { text: "🔄 CLONE METADATA", callback_data: `meta_clone_${projectId}` }],
        [{ text: "⬅️ Back", callback_data: "back_home" }]
      ]
    }
  });
}

// --------------------
// BOT COMMANDS
// --------------------
bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, `🌟 Welcome to VORTEX!
  
🔥 Where Things Happen! 🔥

Available Features:
• Launch pump.fun tokens
• Create or import multiple wallets
• Auto-fund wallets via SOL disperser
• Bundle up to 24 wallets
• CTO pump.fun/raydium tokens
• Delayed bundle on pump.fun
• Advanced swap manager with intervals, sell all functions.
• Anti-MEV protection

Use /home to access all features
Use /settings for configuration`);
});

bot.onText(/\/home/, (msg) => backHome(msg.chat.id, msg.from.first_name));

bot.onText(/\/settings/, (msg) => {
  const chatId = msg.chat.id;
  const text = `⚙️ Settings
Current Settings:
• Tip Amount: Disabled
• Auto Tip: Enabled
• Max Tip: 0.01 SOL
• Priority Fee: 0.0005 SOL
• Buy Slippage: 15%
• Sell Slippage: 15%
Safe Settings: Enabled`;
  bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: [
      [{ text: "💰 TIP: ❌", callback_data: "need_project" }, { text: "✅ AUTO TIP", callback_data: "need_project" }, { text: "📊 MAX: 0.01 SOL", callback_data: "need_project" }],
      [{ text: "⚡️ PRIO: 0.0005 SOL", callback_data: "need_project" }, { text: "📈 BUY SLIP: 15%", callback_data: "need_project" }, { text: "📉 SELL SLIP: 15%", callback_data: "need_project" }],
      [{ text: "🔓 UI SECURITY: 🟢", callback_data: "need_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
      [{ text: "🎯 LSNIPE Settings", callback_data: "lsnipe_settings" }, { text: "📦 LBS Settings", callback_data: "need_project" }],
    ]},
  });
});

bot.onText(/\/lsnipesettings/, (msg) => {
  const chatId = msg.chat.id;
  const text = `🎯 LSNIPE Settings - Preset: default
  
Current Settings:
• Dev Buy: 0%
• Dev Tip: 0 SOL
• Snipe Wallet: 0%
• Snipe Buy: 0
• Snipe Tip: 0 SOL
• Max Sniper: 0%
• Risk Mode: ❌ Disabled`;
  bot.sendMessage(chatId, text, {
    reply_markup: { inline_keyboard: [
      [{ text: "💰 Dev Buy: 0", callback_data: "need_project" }, { text: "💎 Dev Tip: 0", callback_data: "need_project" }],
      [{ text: "🎯 Snipe Wallet: 0", callback_data: "need_project" }, { text: "💫 Snipe Buy: 0", callback_data: "need_project" }],
      [{ text: "🌟 Snipe Tip: 0", callback_data: "need_project" }, { text: "🚀 Max Sniper: 0", callback_data: "need_project" }],
      [{ text: "⚡️ Risk Mode: OFF", callback_data: "need_project" }],
      [{ text: "📝 New Preset", callback_data: "need_project" }],
      [{ text: "✅ default", callback_data: "need_project" }, { text: "✏️", callback_data: "need_project" }, { text: "🗑️", callback_data: "need_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
});

// --------------------
// CALLBACK QUERIES
// --------------------
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const firstName = query.from.first_name || "friend";
  const dataQ = query.data;

  await bot.answerCallbackQuery(query.id);

  // BACK HOME
  if (dataQ === "back_home") return backHome(chatId, firstName);

  // NEED PROJECT
  if (dataQ === "need_project") return sendNeedProject(chatId);

  // MY PROJECTS
  if (dataQ === "my_projects") {
    const projects = getUserProjects(chatId);
    if (projects.length === 0) {
      return bot.sendMessage(chatId, `Yo ${firstName}, you don’t have any Project yet! Let’s start a new one!`, {
        reply_markup: { inline_keyboard: [
          [{ text: "🚀 Create New Project", callback_data: "create_project" }],
          [{ text: "⬅️ Back", callback_data: "back_home" }],
        ]}
      });
    }
    const buttons = projects.map(p => [{ text: p.name || p.id, callback_data: `project_main_${p.id}` }]);
    buttons.push([{ text: "🚀 Create New Project", callback_data: "create_project" }]);
    buttons.push([{ text: "⬅️ Back", callback_data: "back_home" }]);
    return bot.sendMessage(chatId, `Yo ${firstName}! Here's your project list 📋\nSelect a project to manage or create a new one:`, { reply_markup: { inline_keyboard: buttons } });
  }

  // CREATE PROJECT FLOW
  if (dataQ === "create_project") {
    return bot.sendMessage(chatId, `🎯 Choose Project Type\n• Create new coin on pump.fun\n• Make CTO on any pump.fun or raydium token\nSelect your preferred option:`, {
      reply_markup: { inline_keyboard: [
        [{ text: "🚀 Create new coin", callback_data: "create_project_type_coin" }, { text: "🎯 Create CTO", callback_data: "create_project_type_cto" }],
        [{ text: "⬅️ Back", callback_data: "back_home" }],
      ]}
    });
  }

  if (dataQ === "create_project_type_cto") {
    return bot.sendMessage(chatId, "🚧 CTO token creation feature is not finished yet. Will be available soon!", {
      reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "create_project" }]] }
    });
  }

  if (dataQ === "create_project_type_coin") {
    return bot.sendMessage(chatId, `🎯 Choose Platform for Your New Coin\n• Pump.fun - Classic Solana token launch\n• BONK - Launch with BONK pair\n• Ray Launchlab - Advanced token launch\nSelect your preferred platform:`, {
      reply_markup: { inline_keyboard: [
        [{ text: "🚀 Pump.fun", callback_data: "create_project_platform_pump" }, { text: "💎 BONK", callback_data: "create_project_platform_bonk" }],
        [{ text: "🌟 Ray Launchlab", callback_data: "create_project_platform_ray" }],
        [{ text: "⬅️ Back", callback_data: "back_home" }],
      ]}
    });
  }

  if (dataQ.startsWith("create_project_platform_")) {
    const platform = dataQ.replace("create_project_platform_", "");
    if (platform === "pump") {
      const projectId = generateProjectId();
      const projects = getUserProjects(chatId);
      const newProject = { id: projectId, name: "Name not set", metadata: {}, wallets: [], status: "In Progress" };
      projects.push(newProject);
      saveData();
      return bot.sendMessage(chatId, `🚀 New Pump.fun Project Created\nProject ID: ${projectId}\nPlease set up your project by configuring:\n• Token Metadata (name, symbol, etc.)\n• Project Wallets\nWhat would you like to set up first?`, {
        reply_markup: { inline_keyboard: [
          [{ text: "📝 Token Metadata", callback_data: `token_meta_${projectId}` }, { text: "👛 Project Wallet", callback_data: `project_wallet_${projectId}` }],
          [{ text: "🗑️ Delete Project", callback_data: `delete_project_${projectId}` }],
          [{ text: "⬅️ Back", callback_data: "back_home" }],
        ]}
      });
    } else {
      const msg = platform === "bonk" ? "BONK" : "Ray Launchlab";
      return bot.sendMessage(chatId, `🚧 ${msg} token creation feature is not finished yet. Will be available soon!`, {
        reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "create_project" }]] }
      });
    }
  }

  // --------------------
  // PROJECT MAIN MENU
  // --------------------
  if (dataQ.startsWith("project_main_")) {
    const projectId = dataQ.replace("project_main_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);

    const text = `🏷 Project ${project.id}\nName: ${project.metadata.name || "Not set"}\nSymbol: ${project.metadata.symbol || "Not set"}\nStatus: ⏳ ${project.status}\nWhat would you like to manage?`;
    const buttons = [
      [{ text: "📝 Token Metadata", callback_data: `token_meta_${project.id}` }, { text: "👛 Project Wallet", callback_data: `project_wallet_${project.id}` }],
      [{ text: "🔫 Wallet Warmup", callback_data: `need_wallet_${project.id}` }, { text: "💱 Swap Manager", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🧠 Smart Sell", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🎯 Auto TP", callback_data: `need_wallet_${project.id}` }, { text: "🤖 Market Maker", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🔑 GET CA", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🚀 Launch", callback_data: `need_wallet_${project.id}` }, { text: "🎯 Launch with Bundle", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🚀🎯 Launch + Snipe", callback_data: `need_wallet_${project.id}` }, { text: "🎯🚀 Launch Bundle Snipe", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🔴 X LAUNCH", callback_data: `need_wallet_${project.id}` }],
      [{ text: "🗑️ Delete Project", callback_data: `delete_project_${project.id}` }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ];
    return bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  }

  // --------------------
  // DELETE PROJECT
  // --------------------
  if (dataQ.startsWith("delete_project_")) {
    const projectId = dataQ.replace("delete_project_", "");
    const projects = getUserProjects(chatId);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx >= 0) { projects.splice(idx, 1); saveData(); }
    return bot.sendMessage(chatId, `✅ Project ${projectId} deleted.`, {
      reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]] }
    });
  }

  // --------------------
  // TOKEN METADATA MENU
  // --------------------
  if (dataQ.startsWith("token_meta_")) {
    const projectId = dataQ.replace("token_meta_", "");
    sendTokenMetadataMenu(chatId, projectId);
  }

  // --------------------
  // PROJECT WALLET MENU
  // --------------------
  if (dataQ.startsWith("project_wallet_")) {
    const projectId = dataQ.replace("project_wallet_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);

    const text = `🏦 Project Wallets\nProject: ${project.id}\nSelect a wallet to view details:`;
    const buttons = [
      [{ text: "✚ Create Wallet", callback_data: `wallet_create_${projectId}` }, { text: "📥 Import Wallet", callback_data: `wallet_import_${projectId}` }],
      [{ text: "👑 Import Creator", callback_data: `wallet_creator_${projectId}` }],
      [{ text: "⬅️ Back to Project", callback_data: "back_home" }],
    ];
    return bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  }

  // --------------------
  // METADATA FIELD EDITING
  // --------------------
  if (dataQ.startsWith("meta_")) {
    const parts = dataQ.split("_");
    const field = parts[1];
    const projectId = parts[2];
    userStates[chatId] = { type: `meta_${field}`, projectId };
    let prompt = "";
    switch (field) {
      case "name": prompt = "Enter the name for your token:"; break;
      case "symbol": prompt = "Enter the symbol for your token (e.g., BTC, ETH):"; break;
      case "desc": prompt = "Enter a description for your token:"; break;
      case "twitter": prompt = "Enter your Twitter handle (or type 'skip'):"; break;
      case "telegram": prompt = "Enter your Telegram link (or type 'skip'):"; break;
      case "website": prompt = "Enter your website URL (or type 'skip'):"; break;
      case "image": prompt = "Send an image for your token:"; break;
    }
    bot.sendMessage(chatId, prompt);
  }

  // --------------------
  // WALLET FIELD EDITING
  // --------------------
  if (dataQ.startsWith("wallet_")) {
    const parts = dataQ.split("_");
    const type = parts[1]; // create / import / creator
    const projectId = parts[2];
    userStates[chatId] = { type: `wallet_${type}`, projectId };
    bot.sendMessage(chatId, "Please paste your private keys (one per line, base58 encoded)");
  }

  // --------------------
  // DEPLOY & CLONE METADATA
  // --------------------
  if (dataQ.startsWith("meta_deploy_")) {
    const projectId = dataQ.replace("meta_deploy_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);
    if (!project.metadata.name || !project.metadata.symbol) return bot.sendMessage(chatId, "❌ Metadata not deployed. You need to complete your Metadata.");
    return bot.sendMessage(chatId, "✅ Metadata deployed", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]] } });
  }

  if (dataQ.startsWith("meta_clone_")) {
    return bot.sendMessage(chatId, "🚧 Clone Metadata feature is not finished yet. Will be available soon!", {
      reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: `token_meta_${dataQ.replace("meta_clone_", "")}` }]] }
    });
  }
});

// --------------------
// MESSAGE HANDLER
// --------------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const userState = userStates[chatId];

  if (!userState) return; // no action in progress

  const project = findProject(chatId, userState.projectId);
  if (!project) return sendNeedProject(chatId);

  // Metadata fields
  const metaFields = ["name","symbol","description","twitter","telegram","website","image"];
  if (userState.type.startsWith("meta_")) {
    const field = userState.type.replace("meta_", "");
    if (field === "image" && msg.photo && msg.photo.length > 0) {
      const fileId = msg.photo[msg.photo.length - 1].file_id;
      saveProjectField(userState.projectId, "image", fileId);
    } else if (["twitter","telegram","website"].includes(field) && text.toLowerCase() !== "skip") {
      saveProjectField(userState.projectId, field, text);
    } else if (["name","symbol","description"].includes(field)) {
      saveProjectField(userState.projectId, field, text);
    }
    delete userStates[chatId];
    return sendTokenMetadataMenu(chatId, userState.projectId);
  }

  // Wallet fields
  if (userState.type.startsWith("wallet_")) {
    const keys = text.split("\n").map(k => k.trim()).filter(k => k.length > 0);
    const type = userState.type.replace("wallet_","");
    if (type === "create") project.wallets.push(...keys.map(k => ({ type: "user", key: k })));
    else if (type === "import") project.wallets.push(...keys.map(k => ({ type: "imported", key: k })));
    else if (type === "creator") project.wallets.push(...keys.map(k => ({ type: "creator", key: k })));
    saveData();
    delete userStates[chatId];
    return bot.sendMessage(chatId, `✅ Wallets saved`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]] } });
  }
});

import TelegramBot from "node-telegram-bot-api";
import express from "express";
import bodyParser from "body-parser";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const TOKEN = process.env.BOT_TOKEN;
const SECRET = process.env.WEBHOOK_SECRET || "defaultsecret";
const PORT = process.env.PORT || 10000;

if (!TOKEN) { console.error("❌ TELEGRAM_BOT_TOKEN missing."); process.exit(1); }

// --------------------
// DATA
// --------------------
const DATA_FILE = "./data.json";
let data = { users: {} };
if (fs.existsSync(DATA_FILE)) data = JSON.parse(fs.readFileSync(DATA_FILE));
function saveData() { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function getUserProjects(userId) { if (!data.users[userId]) data.users[userId] = { projects: [] }; return data.users[userId].projects; }
function generateProjectId() { return "P" + Math.random().toString(36).substring(2, 8).toUpperCase(); }
function findProject(userId, projectId) { const projects = getUserProjects(userId); return projects.find(p => p.id === projectId); }

// --------------------
// EXPRESS WEBHOOK
// --------------------
const app = express();
app.use(bodyParser.json());
const bot = new TelegramBot(TOKEN);
bot.setWebHook(`${process.env.RENDER_EXTERNAL_HOSTNAME}/bot${TOKEN}${SECRET}`);
app.post(`/bot${TOKEN}${SECRET}`, (req, res) => { bot.processUpdate(req.body); res.sendStatus(200); });
app.listen(PORT, () => console.log(`✅ Bot listening on port ${PORT}`));

// --------------------
// STATES
// --------------------
const userStates = {}; // track user editing state

// --------------------
// UTILITIES
// --------------------
function sendNeedProject(chatId) {
  bot.sendMessage(chatId, `⛔️ Access not allowed\nYou need to launch a Project first`, {
    reply_markup: { inline_keyboard: [
      [{ text: "📁 Your Projects", callback_data: "my_projects" }],
      [{ text: "🚀 Create New Project", callback_data: "create_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
}

function backHome(chatId, firstName) {
  bot.emit("text", { chat: { id: chatId }, from: { first_name: firstName }, text: "/home" });
}

function buildProjectButtons(userId) {
  const projects = getUserProjects(userId);
  const buttons = projects.map(p => [{ text: `${p.name || p.id}`, callback_data: `project_${p.id}` }]);
  buttons.push([{ text: "🚀 Create New Project", callback_data: "create_project" }]);
  buttons.push([{ text: "⬅️ Back", callback_data: "back_home" }]);
  return buttons;
}

function requireWalletPopup(chatId, projectId) {
  bot.sendMessage(chatId, "⛔️ You need to create a Wallet first", {
    reply_markup: { inline_keyboard: [
      [{ text: "👛 Project Wallet", callback_data: `project_wallet_${projectId}` }],
      [{ text: "⬅️ Back", callback_data: `project_main_${projectId}` }],
    ] }
  });
}

// --------------------
// COMMANDS
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

bot.onText(/\/home/, (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from.first_name || "friend";
  const text = `Yo, ${firstName}! Glad you're here! 🔥
What's the move, boss? Wanna mint some fresh heat or clip profits from your existing bag? 💸
Hit the buttons below and let's make it happen:`;
  const opts = { reply_markup: { inline_keyboard: [
    [{ text: "📁 Your Projects", callback_data: "my_projects" }, { text: "🚀 Create New Project", callback_data: "create_project" }],
    [{ text: "🚀 SPAM LAUNCH", callback_data: "need_project" }],
    [{ text: "🤑 BUMP BOT 🤑", callback_data: "need_project" }],
    [{ text: "💰 GET ALL SOL", callback_data: "need_project" }],
    [{ text: "🎁 CLAIM DEV REWARDS", callback_data: "need_project" }],
    [{ text: "🔗 Referrals", callback_data: "need_project" }],
    [{ text: "❓ Help", url: "https://deployonvortex.gitbook.io/documentation/" }],
    [{ text: "👥 Discord", url: "https://discord.com/invite/vortexdeployer" }],
  ]}};
  bot.sendMessage(chatId, text, opts);
});

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
• Snipe Buy: 0%
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
      [{ text: "✅ default", callback_data: "need_project" }],
      [{ text: "✏️", callback_data: "need_project" }, { text: "🗑️", callback_data: "need_project" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ]},
  });
});
// --------------------
// CALLBACK QUERIES
// --------------------
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const dataCB = callbackQuery.data;
  const firstName = callbackQuery.from.first_name || "friend";

  // --------------------
  // BACK HOME
  // --------------------
  if (dataCB === "back_home") {
    return bot.emit("text", { chat: { id: chatId }, from: { first_name: firstName }, text: "/home" });
  }

  // --------------------
  // NEED PROJECT FLOW
  // --------------------
  if (dataCB === "need_project") {
    return sendNeedProject(chatId);
  }

  // --------------------
  // MY PROJECTS
  // --------------------
  if (dataCB === "my_projects") {
    const projects = getUserProjects(chatId);
    let text;
    if (projects.length === 0) {
      text = `Yo ${firstName}, you don’t have any Project yet! Let’s start a new one!`;
    } else {
      text = `Yo ${firstName}! Here's your project list 📋 Select a project to manage or create a new one:`;
    }
    const buttons = buildProjectButtons(chatId);
    return bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  }

  // --------------------
  // CREATE NEW PROJECT FLOW
  // --------------------
  if (dataCB === "create_project") {
    // ETAPE 1 - Choose Project Type
    const buttons = [
      [{ text: "🚀 Create new coin", callback_data: "create_project_coin" }, { text: "🎯 Create CTO", callback_data: "create_project_cto" }],
      [{ text: "⬅️ Back", callback_data: "back_home" }],
    ];
    return bot.sendMessage(chatId, `🎯 Choose Project Type
• Create new coin on pump.fun
• Make CTO on any pump.fun or raydium token
Select your preferred option:`, { reply_markup: { inline_keyboard: buttons } });
  }

  if (dataCB === "create_project_cto") {
    return bot.sendMessage(chatId, "🚧 CTO token creation feature is not finished yet. Will be available soon!", {
      reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "create_project" }]] }
    });
  }

  if (dataCB === "create_project_coin") {
    // ETAPE 2 - Choose Platform
    const buttons = [
      [{ text: "🚀 Pump.fun", callback_data: "create_project_platform_pump" }, { text: "💎 BONK", callback_data: "create_project_platform_bonk" }],
      [{ text: "🌟 Ray Launchlab", callback_data: "create_project_platform_ray" }],
      [{ text: "⬅️ Back", callback_data: "create_project" }],
    ];
    return bot.sendMessage(chatId, `🎯 Choose Platform for Your New Coin
• Pump.fun - Classic Solana token launch
• BONK - Launch with BONK pair
• Ray Launchlab - Advanced token launch
Select your preferred platform:`, { reply_markup: { inline_keyboard: buttons } });
  }

  if (dataCB === "create_project_platform_bonk" || dataCB === "create_project_platform_ray") {
    return bot.sendMessage(chatId, "🚧 This token creation feature is not finished yet. Will be available soon!", {
      reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "create_project" }]] }
    });
  }

  if (dataCB === "create_project_platform_pump") {
    // ETAPE 3 - Create Project
    const newProject = {
      id: generateProjectId(),
      name: null,
      symbol: null,
      description: null,
      twitter: null,
      telegram: null,
      website: null,
      image: null,
      wallets: [],
      status: "⏳ In Progress",
    };
    getUserProjects(chatId).push(newProject);
    saveData();

    const buttons = [
      [{ text: "📝 Token Metadata", callback_data: `meta_${newProject.id}` }, { text: "👛 Project Wallet", callback_data: `project_wallet_${newProject.id}` }],
      [{ text: "🗑️ Delete Project", callback_data: `delete_project_${newProject.id}` }, { text: "⬅️ Back to Menu", callback_data: "back_home" }],
    ];

    return bot.sendMessage(chatId, `🚀 New Pump.fun Project Created
Project ID: ${newProject.id}
Please set up your project by configuring:
• Token Metadata (name, symbol, etc.)
• Project Wallets
What would you like to set up first?`, { reply_markup: { inline_keyboard: buttons } });
  }

  // --------------------
  // DELETE PROJECT
  // --------------------
  if (dataCB.startsWith("delete_project_")) {
    const projectId = dataCB.replace("delete_project_", "");
    const projects = getUserProjects(chatId);
    const idx = projects.findIndex(p => p.id === projectId);
    if (idx !== -1) { projects.splice(idx, 1); saveData(); }
    return bot.sendMessage(chatId, `🗑️ Project ${projectId} deleted`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: "back_home" }]] } });
  }

  // --------------------
  // PROJECT WALLET
  // --------------------
  if (dataCB.startsWith("project_wallet_")) {
    const projectId = dataCB.replace("project_wallet_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);
    const buttons = [
      [{ text: "✚ Create Wallet", callback_data: `wallet_create_${projectId}` }, { text: "📥 Import Wallet", callback_data: `wallet_import_${projectId}` }],
      [{ text: "👑 Import Creator", callback_data: `wallet_creator_${projectId}` }],
      [{ text: "⬅️ Back to Project", callback_data: `project_main_${projectId}` }],
    ];
    return bot.sendMessage(chatId, `🏦 Project Wallets
Project: ${projectId}
Select a wallet to view details:`, { reply_markup: { inline_keyboard: buttons } });
  }

  if (dataCB.startsWith("wallet_create_") || dataCB.startsWith("wallet_import_") || dataCB.startsWith("wallet_creator_")) {
    const projectId = dataCB.split("_")[2];
    const type = dataCB.split("_")[1];
    userStates[chatId] = { projectId, field: `wallet_${type}` };
    return bot.sendMessage(chatId, "Please paste your private keys (one per line, base58 encoded)");
  }

  // --------------------
  // TOKEN METADATA
  // --------------------
  if (dataCB.startsWith("meta_")) {
    const projectId = dataCB.replace("meta_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);

    const buttons = [
      [{ text: `📝 Name ${project.name?`✅`:"❌"}`, callback_data: `edit_name_${projectId}` }, { text: `💎 Symbol ${project.symbol?`✅`:"❌"}`, callback_data: `edit_symbol_${projectId}` }],
      [{ text: `📋 Description ${project.description?`✅`:"❌"}`, callback_data: `edit_description_${projectId}` }, { text: `🐦 Twitter ${project.twitter?`✅`:"❌"}`, callback_data: `edit_twitter_${projectId}` }],
      [{ text: `📱 Telegram ${project.telegram?`✅`:"❌"}`, callback_data: `edit_telegram_${projectId}` }, { text: `🌐 Website ${project.website?`✅`:"❌"}`, callback_data: `edit_website_${projectId}` }],
      [{ text: `🖼️ Image ${project.image?`✅`:"❌"}`, callback_data: `edit_image_${projectId}` }],
      [{ text: `🚀 DEPLOY METADATA`, callback_data: `deploy_meta_${projectId}` }, { text: `🔄 CLONE METADATA`, callback_data: `clone_meta_${projectId}` }],
      [{ text: "⬅️ Back", callback_data: `project_main_${projectId}` }],
    ];
    return bot.sendMessage(chatId, `🎯 Project ${projectId} Metadata
Select a field to edit:
❌ Metadata not yet deployed`, { reply_markup: { inline_keyboard: buttons } });
  }
// --------------------
// PROJECT MAIN / FICHE PROJET
// --------------------
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const dataCB = callbackQuery.data;

  if (dataCB.startsWith("project_main_")) {
    const projectId = dataCB.replace("project_main_", "");
    const project = findProject(chatId, projectId);
    if (!project) return sendNeedProject(chatId);

    const buttons = [
      [{ text: "📝 Token Metadata", callback_data: `meta_${projectId}` }, { text: "👛 Project Wallet", callback_data: `project_wallet_${projectId}` }],
      [{ text: "🔫 Wallet Warmup", callback_data: `need_wallet_${projectId}` }, { text: "💱 Swap Manager", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🧠 Smart Sell", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🎯 Auto TP", callback_data: `need_wallet_${projectId}` }, { text: "🤖 Market Maker", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🔑 GET CA", callback_data: `need_wallet_${projectId}` }, { text: "🚀 Launch", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🎯 Launch with Bundle", callback_data: `need_wallet_${projectId}` }, { text: "🚀🎯 Launch + Snipe", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🎯🚀 Launch Bundle Snipe", callback_data: `need_wallet_${projectId}` }, { text: "🔴 X LAUNCH", callback_data: `need_wallet_${projectId}` }],
      [{ text: "🗑️ Delete Project", callback_data: `delete_project_${projectId}` }, { text: "⬅️ Back", callback_data: "back_home" }],
    ];

    const statusText = `🏷 Project ${project.id}
Name: ${project.name || "Not set"}
Symbol: ${project.symbol || "Not set"}
Status: ${project.status}
What would you like to manage?`;

    return bot.sendMessage(chatId, statusText, { reply_markup: { inline_keyboard: buttons } });
  }

  // --------------------
  // POPUP “NEED WALLET”
  // --------------------
  if (dataCB.startsWith("need_wallet_")) {
    const projectId = dataCB.replace("need_wallet_", "");
    return requireWalletPopup(chatId, projectId);
  }
});

// --------------------
// EDIT METADATA FIELDS
// --------------------
bot.on("callback_query", async (callbackQuery) => {
  const msg = callbackQuery.message;
  const chatId = msg.chat.id;
  const dataCB = callbackQuery.data;

  // Fields
  const metaFields = ["name", "symbol", "description", "twitter", "telegram", "website", "image"];
  for (let field of metaFields) {
    if (dataCB.startsWith(`edit_${field}_`)) {
      const projectId = dataCB.replace(`edit_${field}_`, "");
      userStates[chatId] = { projectId, field };
      let prompt = "";
      switch(field){
        case "name": prompt="Enter the name for your token:"; break;
        case "symbol": prompt="Enter the symbol for your token (e.g., BTC, ETH):"; break;
        case "description": prompt="Enter a description for your token:"; break;
        case "twitter": prompt='Enter your Twitter handle (or type "skip"):';
        break;
        case "telegram": prompt='Enter your Telegram link (or type "skip"):';
        break;
        case "website": prompt='Enter your website URL (or type "skip"):';
        break;
        case "image": prompt="Send an image for your token:"; break;
      }
      return bot.sendMessage(chatId, prompt);
    }
  }

  // DEPLOY METADATA
  if (dataCB.startsWith("deploy_meta_")) {
    const projectId = dataCB.replace("deploy_meta_", "");
    const project = findProject(chatId, projectId);
    if (!project.name || !project.symbol) {
      return bot.sendMessage(chatId, "❌ Metadata not deployed. You need to complete your Metadata.", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `meta_${projectId}` }]] } });
    }
    project.status = "✅ Metadata deployed";
    saveData();
    return bot.sendMessage(chatId, "✅ Metadata deployed", { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `meta_${projectId}` }]] } });
  }

  // CLONE METADATA
  if (dataCB.startsWith("clone_meta_")) {
    return bot.sendMessage(chatId, "🚧 Clone Metadata feature is not finished yet. Will be available soon!", { reply_markup: { inline_keyboard: [[{ text: "OK", callback_data: "back_home" }]] } });
  }
});

// --------------------
// HANDLE MESSAGE INPUTS (Metadata / Wallets)
// --------------------
bot.on("message", (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || "";
  const projectId = userStates[chatId]?.projectId;
  if (!projectId) return;
  const project = findProject(chatId, projectId);
  if (!project) return;

  const field = userStates[chatId].field;
  if (!field) return;

  switch(field){
    case "name": project.name = text; break;
    case "symbol": project.symbol = text; break;
    case "description": project.description = text; break;
    case "twitter": project.twitter = text === "skip"?null:text; break;
    case "telegram": project.telegram = text === "skip"?null:text; break;
    case "website": project.website = text === "skip"?null:text; break;
    case "wallet_create": project.wallets.push({ type:"user", keys:text.split("\n") }); break;
    case "wallet_import": project.wallets.push({ type:"import", keys:text.split("\n") }); break;
    case "wallet_creator": project.wallets.push({ type:"creator", keys:text.split("\n") }); break;
  }

  saveData();
  delete userStates[chatId];
  bot.sendMessage(chatId, `✅ Updated ${field}`, { reply_markup: { inline_keyboard: [[{ text: "⬅️ Back", callback_data: `meta_${projectId}` }]] } });
});

// --------------------
// END OF FILE
// --------------------
console.log("✅ Bot fully loaded and ready!");

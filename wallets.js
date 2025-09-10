// wallets.js
import { projectStore } from "./projectStore.js";

export function getWalletsMenu(userId, projectId) {
  const project = projectStore.getProject(userId, projectId);
  if (!project) {
    return {
      text: "❌ Project not found",
      reply_markup: {
        inline_keyboard: [[{ text: "⬅️ Back", callback_data: "your_projects" }]],
      },
    };
  }

  return {
    text: `🏦 Project Wallets\nProject: ${project.id}\nSelect a wallet to view details`,
    reply_markup: {
      inline_keyboard: [
        [{ text: "➕ Create Wallet", callback_data: `wallet_create_${project.id}` }],
        [{ text: "📥 Import Wallet", callback_data: `wallet_import_${project.id}` }],
        [{ text: "👑 Import Creator", callback_data: `wallet_creator_${project.id}` }],
        [{ text: "⬅️ Back", callback_data: `project_${project.id}` }],
      ],
    },
  };
}

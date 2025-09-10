import { projects } from "./projectStore.js";

export function getMetadataMenu(projectId) {
  const project = projects[projectId];
  const text = `🎯 Project ${projectId} Metadata
Select a field to edit:
${project.metadataComplete ? "✅ Metadata deployed" : "❌ Metadata not yet deployed"}`;

  return {
    text,
    reply_markup: {
      inline_keyboard: [
        [{ text: "📝 Name", callback_data: `meta_name_${projectId}` },
         { text: "🔤 Symbol", callback_data: `meta_symbol_${projectId}` }],
        [{ text: "📖 Description", callback_data: `meta_desc_${projectId}` }],
        [{ text: "🐦 Twitter", callback_data: `meta_twitter_${projectId}` },
         { text: "💬 Telegram", callback_data: `meta_telegram_${projectId}` }],
        [{ text: "🌍 Website", callback_data: `meta_website_${projectId}` }],
        [{ text: "🖼️ Image", callback_data: `meta_image_${projectId}` },
         { text: "🚀 Deploy Metadata", callback_data: `meta_deploy_${projectId}` }],
        [{ text: "📂 Clone Metadata", callback_data: `unavailable` }],
        [{ text: "⬅️ Back", callback_data: `project_${projectId}` }]
      ]
    }
  };
}

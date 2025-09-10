// projectStore.js

class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.editing = {};  // { chatId: { projectId, field } }
  }

  // --- CRUD projets ---
  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  addProject(chatId, name = "Nouveau projet") {
    if (!this.projects[chatId]) this.projects[chatId] = [];
    const newProj = {
      id: Date.now().toString(),
      name,
      symbol: "",
      description: "",
      wallet: "",
    };
    this.projects[chatId].push(newProj);
    return newProj;
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find(p => p.id === projectId);
  }

  deleteProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter(p => p.id !== projectId);
  }

  // --- Edition ---
  startEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  isEditing(chatId) {
    return this.editing[chatId] || null;
  }

  applyEdit(chatId, value) {
    const editState = this.isEditing(chatId);
    if (!editState) return null;

    const { projectId, field } = editState;
    const project = this.getProject(chatId, projectId);
    if (!project) return null;

    project[field] = value;
    this.editing[chatId] = null;
    return project;
  }

  // --- Validation / Déploiement ---
  validateProject(chatId, projectId) {
    const project = this.getProject(chatId, projectId);
    if (!project) return { valid: false, missing: [] };

    const missing = [];
    if (!project.name) missing.push("Nom");
    if (!project.symbol) missing.push("Symbole");
    if (!project.description) missing.push("Description");
    if (!project.wallet) missing.push("Wallet");

    return {
      valid: missing.length === 0,
      missing,
      project,
    };
  }
}

export const projectStore = new ProjectStore();

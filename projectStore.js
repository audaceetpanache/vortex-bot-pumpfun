class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.pendingEdits = {}; // { chatId: { projectId, field } }
  }

  // ------------------ CRUD ------------------
  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find((p) => p.id === projectId);
  }

  addProject(chatId, name, symbol, description, wallet) {
    if (!this.projects[chatId]) this.projects[chatId] = [];
    const newProj = {
      id: String(Date.now()),
      name,
      symbol,
      description,
      wallet,
    };
    this.projects[chatId].push(newProj);
    return newProj;
  }

  updateProject(chatId, projectId, field, value) {
    const project = this.getProject(chatId, projectId);
    if (project && field in project) {
      project[field] = value;
    }
    return project;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter((p) => p.id !== projectId);
  }

  // ------------------ EDIT PENDING ------------------
  setPendingEdit(chatId, projectId, field) {
    this.pendingEdits[chatId] = { projectId, field };
  }

  getPendingEdit(chatId) {
    return this.pendingEdits[chatId];
  }

  clearPendingEdit(chatId) {
    delete this.pendingEdits[chatId];
  }
}

export const projectStore = new ProjectStore();

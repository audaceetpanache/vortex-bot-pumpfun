class ProjectStore {
  constructor() {
    this.projects = {};
    this.pendingEdits = {};
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  getProject(chatId, projectId) {
    return (this.projects[chatId] || []).find((p) => p.id === projectId);
  }

  addProject(chatId, name) {
    const newProject = {
      id: Date.now().toString(),
      name,
      symbol: "SYM",
      description: "Nouvelle description",
      wallet: "0x0000000000000000000000000000000000000000",
    };
    if (!this.projects[chatId]) this.projects[chatId] = [];
    this.projects[chatId].push(newProject);
    return newProject;
  }

  deleteProject(chatId, projectId) {
    if (!this.projects[chatId]) return;
    this.projects[chatId] = this.projects[chatId].filter((p) => p.id !== projectId);
  }

  setPendingEdit(chatId, projectId, field) {
    this.pendingEdits[chatId] = { projectId, field };
  }

  getPendingEdit(chatId) {
    return this.pendingEdits[chatId];
  }

  clearPendingEdit(chatId) {
    delete this.pendingEdits[chatId];
  }

  updateProjectField(chatId, projectId, field, value) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      project[field] = value;
    }
  }
}

export const projectStore = new ProjectStore();

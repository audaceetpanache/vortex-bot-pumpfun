class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ { id, name, symbol, description, wallet } ] }
    this.editing = {}; // { chatId: { projectId, field } }
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  addProject(chatId, name) {
    const project = {
      id: Date.now().toString(),
      name,
      symbol: "N/A",
      description: "N/A",
      wallet: "N/A",
    };
    if (!this.projects[chatId]) this.projects[chatId] = [];
    this.projects[chatId].push(project);
    return project;
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find((p) => p.id === projectId);
  }

  updateProject(chatId, projectId, fields) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      Object.assign(project, fields);
    }
  }

  deleteProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter((p) => p.id !== projectId);
  }

  setEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  getEditing(chatId) {
    return this.editing[chatId];
  }

  clearEditing(chatId) {
    delete this.editing[chatId];
  }
}

export const projectStore = new ProjectStore();

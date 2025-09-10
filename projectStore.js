class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ {id, name, symbol, description, wallet} ] }
    this.editing = {}; // { chatId: { projectId, field } }
  }

  getProjects(chatId) {
    return this.projects[chatId] || [];
  }

  getProject(chatId, projectId) {
    return this.getProjects(chatId).find((p) => p.id === projectId);
  }

  addProject(chatId, name) {
    const newProject = {
      id: Date.now().toString(),
      name,
      symbol: "",
      description: "",
      wallet: ""
    };
    if (!this.projects[chatId]) this.projects[chatId] = [];
    this.projects[chatId].push(newProject);
    return newProject;
  }

  deleteProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter((p) => p.id !== projectId);
  }

  startEditing(chatId, projectId, field) {
    this.editing[chatId] = { projectId, field };
  }

  isEditing(chatId) {
    return !!this.editing[chatId];
  }

  getEditing(chatId) {
    return this.editing[chatId];
  }

  applyEdit(chatId, projectId, field, value) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      project[field] = value;
      delete this.editing[chatId];
    }
  }
}

export const projectStore = new ProjectStore();

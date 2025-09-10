class ProjectStore {
  constructor() {
    this.projects = {}; // { chatId: [ { id, name, symbol, description, wallet } ] }
  }

  getProjects(chatId) {
    if (!this.projects[chatId]) this.projects[chatId] = [];
    return this.projects[chatId];
  }

  getProject(chatId, projectId) {
    const list = this.getProjects(chatId);
    return list.find((p) => p.id === projectId);
  }

  addProject(chatId, name) {
    const list = this.getProjects(chatId);
    const newId = list.length > 0 ? list[list.length - 1].id + 1 : 1;
    const newProject = {
      id: newId,
      name,
      symbol: "",
      description: "",
      wallet: "",
    };
    list.push(newProject);
    return newProject;
  }

  deleteProject(chatId, projectId) {
    this.projects[chatId] = this.getProjects(chatId).filter((p) => p.id !== projectId);
  }

  updateProject(chatId, projectId, updates) {
    const project = this.getProject(chatId, projectId);
    if (project) {
      Object.assign(project, updates);
    }
    return project;
  }
}

export const projectStore = new ProjectStore();

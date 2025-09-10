export const projectStore = {
  projects: {},

  getProjects(chatId) {
    if (!this.projects[chatId]) {
      this.projects[chatId] = [];
    }
    return this.projects[chatId];
  },

  addProject(chatId, project) {
    if (!this.projects[chatId]) {
      this.projects[chatId] = [];
    }
    this.projects[chatId].push(project);
    return project;
  },

  deleteProject(chatId, index) {
    if (this.projects[chatId]) {
      this.projects[chatId].splice(index, 1);
    }
  },

  updateProject(chatId, index, newData) {
    if (this.projects[chatId] && this.projects[chatId][index]) {
      this.projects[chatId][index] = {
        ...this.projects[chatId][index],
        ...newData,
      };
    }
  },
};

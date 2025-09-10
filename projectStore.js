// projectStore.js
export const projectStore = {
  projects: [],

  addProject(userId, name) {
    const id = Math.random().toString(36).substring(2, 9);
    const project = { id, userId, name };
    this.projects.push(project);
    return project;
  },

  getProjectsByUser(userId) {
    return this.projects.filter((p) => p.userId === userId);
  },

  deleteProject(userId, projectId) {
    const index = this.projects.findIndex(
      (p) => p.userId === userId && p.id === projectId
    );
    if (index !== -1) {
      this.projects.splice(index, 1);
      return true;
    }
    return false;
  },
};

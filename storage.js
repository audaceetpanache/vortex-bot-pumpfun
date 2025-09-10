const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "projects.json");

function loadProjects() {
  if (!fs.existsSync(filePath)) {
    return { users: {} };
  }
  const data = fs.readFileSync(filePath);
  return JSON.parse(data);
}

function saveProjects(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = { loadProjects, saveProjects };

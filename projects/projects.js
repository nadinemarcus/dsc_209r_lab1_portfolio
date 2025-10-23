import { fetchJSON, renderProjects } from '../global.js';

const projects = await fetchJSON('../lib/projects.json');
console.log('loaded projects:', projects);

const projectsContainer = document.querySelector('.projects');

renderProjects(projects, projectsContainer, 'h2');


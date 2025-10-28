import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
console.log('loaded projects:', projects);

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1;

function renderPieChart(projectsGiven) {
  // Clear previous chart & legend
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();

  const legend = d3.select('.legend');
  legend.selectAll('li').remove();

  if (projectsGiven.length === 0) return;

  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  ).sort((a, b) => d3.ascending(a[0], b[0]));

  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));

  // Arc generator and pie layout
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const arcData = pieGenerator(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

   svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (_, i) => colors(i));

  // Draw legend
  legend.selectAll('li')
    .data(data)
    .join('li')
    .html(d => `<span class="swatch" style="background-color:${colors(data.indexOf(d))}"></span> ${d.label} <em>(${d.value})</em>`);

}

renderProjects(projects, projectsContainer, 'h2');
renderPieChart(projects);

searchInput.addEventListener('input', (event) => {
  const query = event.target.value.toLowerCase();

  const filteredProjects = projects.filter(project => {
    const values = Object.values(project).join(' ').toLowerCase();
    return values.includes(query);
  });

  projectsContainer.innerHTML = '';
  renderProjects(filteredProjects, projectsContainer, 'h2');

  renderPieChart(filteredProjects);
});

arcData.forEach((d, i) => {
  svg.append('path')
    .attr('d', arcGenerator(d))
    .attr('fill', colors(i))
    .style('cursor', 'pointer')
    .on('click', () => {
      selectedIndex = selectedIndex === i ? -1 : i;

      // Update wedge classes
      svg
        .selectAll('path')
        .attr('class', (_, idx) => (
            idx === selectedIndex ? 'selected' : ''
        ));

      // Update legend classes
      legend
        .selectAll('li')
        .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

      // Filter projects based on selection
      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        const year = data[selectedIndex].label;
        const filteredByYear = projects.filter(p => p.year === year);
        renderProjects(filteredByYear, projectsContainer, 'h2');
      }
    });
});


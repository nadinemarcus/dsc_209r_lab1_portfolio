import { fetchJSON, renderProjects } from '../global.js';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

const projects = await fetchJSON('../lib/projects.json');
console.log('loaded projects:', projects);

const projectsContainer = document.querySelector('.projects');
const searchInput = document.querySelector('.searchBar');

let selectedIndex = -1;

function renderPieChart(projectsGiven) {
  const svg = d3.select('#projects-pie-plot');
  svg.selectAll('path').remove();
  const legend = d3.select('.legend');
  legend.selectAll('li').remove();


  const rolledData = d3.rollups(
    projectsGiven,
    v => v.length,
    d => d.year
  ).sort((a, b) => d3.ascending(a[0], b[0]));

  const data = rolledData.map(([year, count]) => ({ value: count, label: year }));
  const arcGenerator = d3.arc().innerRadius(0).outerRadius(50);
  const pieGenerator = d3.pie().value(d => d.value);
  const arcData = pieGenerator(data);
  const colors = d3.scaleOrdinal(d3.schemeTableau10);

  // slices
  const paths = svg.selectAll('path')
    .data(arcData)
    .join('path')
    .attr('d', arcGenerator)
    .attr('fill', (_, i) => colors(i))
    .style('cursor', 'pointer')
    .on('click', function(_, d) {
      const i = arcData.indexOf(d);
      selectedIndex = selectedIndex === i ? -1 : i;

      // Update classes
      paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
      legend.selectAll('li')
        .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

      // Filter projects
      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        const year = data[selectedIndex].label;
        const filteredByYear = projects.filter(p => p.year === year);
        projectsContainer.innerHTML= '';
        renderProjects(filteredByYear, projectsContainer, 'h2');
      }
    });

  // legend
  legend.selectAll('li')
    .data(data)
    .join('li')
    .html(d => `<span class="swatch" style="background-color:${colors(data.indexOf(d))}"></span> ${d.label} <em>(${d.value})</em>`)
    .on('click', (_, d) => {
      const i = data.indexOf(d);
      selectedIndex = selectedIndex === i ? -1 : i;

      paths.attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));
      legend.selectAll('li')
        .attr('class', (_, idx) => (idx === selectedIndex ? 'selected' : ''));

      if (selectedIndex === -1) {
        renderProjects(projects, projectsContainer, 'h2');
      } else {
        const year = data[selectedIndex].label;
        const filteredByYear = projects.filter(p => p.year === year);
        renderProjects(filteredByYear, projectsContainer, 'h2');
      }
    });
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


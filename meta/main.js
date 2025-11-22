import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/scrollama@3.2.0/+esm';

let xScale, yScale;
let commits = [];
let colors = d3.scaleOrdinal(d3.schemeTableau10);

// ------------------- Load Data -------------------
async function loadData() {
  const data = await d3.csv('loc.csv', row => ({
    ...row,
    line: +row.line,
    depth: +row.depth,
    length: +row.length,
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));
  return data;
}

// ------------------- Process Commits -------------------
function processCommits(data) {
  const grouped = d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;
    const commitObj = {
      id: commit,
      url: `https://github.com/nadinemarcus/DSC209R_portfolio/commit/${commit}`,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(commitObj, 'lines', {
      value: lines,
      writable: true,
      configurable: true,
      enumerable: false
    });
    return commitObj;
  });
  return grouped.sort((a, b) => a.datetime - b.datetime);
}

// ------------------- Tooltip -------------------
function renderTooltipContent(commit) {
  if (!commit) return;
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString({ dateStyle: "long", timeStyle: "short" });
  document.getElementById('commit-time').textContent = commit.time;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(show) {
  document.getElementById('commit-tooltip').hidden = !show;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// ------------------- Commit Info -------------------
function renderCommitInfo(data, commitsSubset) {
  const container = d3.select('#stats');
  container.selectAll('*').remove();
  const dl = container.append('dl').attr('class', 'stats');

  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commitsSubset.length);

  dl.append('dt').html('TOTAL <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').text('NUMBER OF FILES');
  dl.append('dd').text(d3.groups(data, d => d.file).length);

  const hours = data.map(d => d.datetime.getHours());
  const avgHour = d3.mean(hours);
  const timeOfDay = avgHour < 6 ? 'Night' : avgHour < 12 ? 'Morning' : avgHour < 17 ? 'Afternoon' : 'Evening';
  dl.append('dt').text('MOST ACTIVE TIME OF DAY');
  dl.append('dd').text(timeOfDay);

  const files = d3.groups(data, d => d.file).map(([file, lines]) => ({ file, lineCount: lines.length }));
  const longestFile = d3.greatest(files, d => d.lineCount);
  dl.append('dt').text('MAX LINES');
  dl.append('dd').text(longestFile.lineCount);

  const uniqueDates = new Set(data.map(d => d.date.toDateString()));
  dl.append('dt').text('DAYS WORKED');
  dl.append('dd').text(uniqueDates.size);
}

// ------------------- Scatter Plot -------------------
function renderScatterPlot(commitsSubset) {
  const width = 1000, height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    bottom: height - margin.bottom,
    left: margin.left,
    right: width - margin.right,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select('#scatter-plot')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear().domain([0, 24]).range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const dots = svg.append('g').attr('class', 'dots');

  const sortedCommits = d3.sort(commitsSubset, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });

  svg.append('g')
    .attr('class', 'gridlines')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

  svg.append('g')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .attr('class', 'x-axis')
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('transform', `translate(${usableArea.left},0)`)
    .attr('class', 'y-axis')
    .call(d3.axisLeft(yScale).tickFormat(d => String(d % 24).padStart(2, '0') + ':00'));
}

// ------------------- Update Scatter Plot -------------------
function updateScatterPlot(commitsSubset) {
  const svg = d3.select('#scatter-plot svg');

  xScale.domain(d3.extent(commits, d => d.datetime));
  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  svg.select('g.x-axis').call(d3.axisBottom(xScale));

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commitsSubset, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7)
    .on('mouseenter', (event, d) => {
      d3.select(event.currentTarget).style('fill-opacity', 1);
      renderTooltipContent(d);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', (event) => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
}

// ------------------- File Visualization -------------------
function updateFileDisplay(filteredCommits) {
  const lines = filteredCommits.flatMap(d => d.lines);

  const files = d3.groups(lines, d => d.file)
    .map(([name, lines]) => ({ name, lines }))
    .sort((a, b) => b.lines.length - a.lines.length);

  const filesContainer = d3.select('#files')
    .selectAll('div')
    .data(files, d => d.name)
    .join(
      enter => enter.append('div').call(div => {
        div.append('dt').append('code');
        div.append('dd');
      })
    );

  filesContainer.select('dt > code')
    .html(d => `${d.name} <small>${d.lines.length} lines</small>`);

  filesContainer.select('dd')
    .selectAll('div')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background-color', d => colors(d.type));
}

// ------------------- Unified Update Function -------------------
function updateByIndex(index) {
  const subset = commits.slice(0, index + 1);
  const currentCommit = commits[index];

  updateScatterPlot(subset);
  updateFileDisplay(subset);
  renderCommitInfo(subset.flatMap(d => d.lines), subset);

  if (currentCommit) {
    document.getElementById('commit-time').textContent = currentCommit.datetime.toLocaleString({ dateStyle: "long", timeStyle: "short" });
    document.getElementById('commit-author').textContent = currentCommit.author;
    document.getElementById('commit-lines').textContent = currentCommit.totalLines;
    document.getElementById('commit-link').href = currentCommit.url;
    document.getElementById('commit-link').textContent = currentCommit.id;
  }

  // Move slider tooltip
  const slider = document.getElementById('commit-progress');
  const tooltip = document.getElementById('slider-tooltip');
  if (tooltip) {
    const rect = slider.getBoundingClientRect();
    const percent = index / (commits.length - 1);
    tooltip.style.left = `${rect.left + percent * rect.width}px`;
    tooltip.textContent = currentCommit.datetime.toLocaleDateString();
  }
}

// ------------------- Main -------------------
(async function main() {
  const data = await loadData();
  commits = processCommits(data);

  renderCommitInfo(data, commits);
  renderScatterPlot(commits);
  updateFileDisplay(commits);

  // Slider setup
  const slider = document.getElementById('commit-progress');
  slider.max = commits.length - 1;
  slider.value = 0;

  slider.addEventListener('input', () => {
    updateByIndex(+slider.value);
  });

  // Scrollama steps
  d3.select('#scatter-story')
    .selectAll('.step')
    .data(commits)
    .join('div')
    .attr('class', 'step')
    .html((d, i) => `
      On ${d.datetime.toLocaleString('en', { dateStyle: 'full', timeStyle: 'short' })},
      I made <a href="${d.url}" target="_blank">${i > 0 ? 'another glorious commit' : 'my first commit, and it was glorious'
      }</a>.
      I edited ${d.totalLines} lines across ${d3.rollups(d.lines, D => D.length, d => d.file).length
      } files.
    `);

  const scroller = scrollama();
  scroller
    .setup({
      container: '#scrolly-1',
      step: '#scrolly-1 .step',
      offset: 0.5,
    })
    .onStepEnter(response => {
      const commit = response.element.__data__;
      const index = commits.findIndex(d => d.id === commit.id);
      slider.value = index;
      updateByIndex(index);
    });

  // Initialize first view
  updateByIndex(0);
})();

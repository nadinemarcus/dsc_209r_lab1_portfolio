import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

let xScale, yScale;
const colors = d3.scaleOrdinal(d3.schemeTableau10);

// ---------------------- Load Data ----------------------
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

// ---------------------- Process Commits ----------------------
function processCommits(data) {
  return d3.groups(data, d => d.commit).map(([commit, lines]) => {
    const first = lines[0];
    const { author, date, time, timezone, datetime } = first;
    const ret = {
      id: commit,
      url: 'https://github.com/nadinemarcus/DSC209R_portfolio/commit/' + commit,
      author,
      date,
      time,
      timezone,
      datetime,
      hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
      totalLines: lines.length,
    };
    Object.defineProperty(ret, 'lines', {
      value: lines,
      writable: true,
      configurable: true,
      enumerable: false
    });
    return ret;
  });
}

// ---------------------- Tooltip ----------------------
function renderTooltipContent(commit) {
  document.getElementById('commit-link').href = commit.url;
  document.getElementById('commit-link').textContent = commit.id;
  document.getElementById('commit-date').textContent = commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
  document.getElementById('commit-time-tooltip').textContent = commit.time;
  document.getElementById('commit-author').textContent = commit.author;
  document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
  document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

// ---------------------- Commit Info ----------------------
function renderCommitInfo(filteredCommits) {
  const dlContainer = d3.select('#stats').select('dl.stats');
  if (!dlContainer.empty()) dlContainer.remove();

  const dl = d3.select('#stats').append('dl').attr('class', 'stats').text("SUMMARY");

  dl.append('dt').text('COMMITS');
  dl.append('dd').text(filteredCommits.length);

  const lines = filteredCommits.flatMap(d => d.lines);
  dl.append('dt').html('TOTAL <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(lines.length);

  const filesCount = new Set(lines.map(d => d.file)).size;
  dl.append('dt').text('NUMBER OF FILES');
  dl.append('dd').text(filesCount);

  const avgHour = d3.mean(filteredCommits, d => d.hourFrac);
  let timeOfDay = avgHour < 6 ? 'Night' : avgHour < 12 ? 'Morning' : avgHour < 17 ? 'Afternoon' : 'Evening';
  dl.append('dt').text('MOST ACTIVE TIME OF DAY');
  dl.append('dd').text(timeOfDay);
}

// ---------------------- Scatter Plot ----------------------
function renderScatterPlot(commits) {
  const width = 1000;
  const height = 600;
  const margin = { top: 10, right: 10, bottom: 30, left: 50 };
  const usableArea = {
    top: margin.top,
    bottom: height - margin.bottom,
    left: margin.left,
    right: width - margin.right,
    width: width - margin.left - margin.right,
    height: height - margin.top - margin.bottom
  };

  const svg = d3.select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`);

  xScale = d3.scaleTime()
    .domain(d3.extent(commits, d => d.datetime))
    .range([usableArea.left, usableArea.right])
    .nice();

  yScale = d3.scaleLinear()
    .domain([0, 24])
    .range([usableArea.bottom, usableArea.top]);

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  svg.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${usableArea.bottom})`)
    .call(d3.axisBottom(xScale));

  svg.append('g')
    .attr('class', 'y-axis')
    .attr('transform', `translate(${usableArea.left},0)`)
    .call(d3.axisLeft(yScale).tickFormat(d => `${String(d % 24).padStart(2,'0')}:00`));

  const dots = svg.append('g').attr('class', 'dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

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

// Update scatter plot with filtered commits
function updateScatterPlot(commits) {
  const svg = d3.select('#chart svg');
  if (svg.empty()) return;

  xScale.domain(d3.extent(commits, d => d.datetime));
  svg.select('g.x-axis').call(d3.axisBottom(xScale));

  const [minLines, maxLines] = d3.extent(commits, d => d.totalLines);
  const rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

  const dots = svg.select('g.dots');
  const sortedCommits = d3.sort(commits, d => -d.totalLines);

  dots.selectAll('circle')
    .data(sortedCommits, d => d.id)
    .join('circle')
    .attr('cx', d => xScale(d.datetime))
    .attr('cy', d => yScale(d.hourFrac))
    .attr('r', d => rScale(d.totalLines))
    .attr('fill', 'steelblue')
    .style('fill-opacity', 0.7);
}

// ---------------------- File Units ----------------------
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

  filesContainer.select('dt > code').text(d => d.name);

  filesContainer.select('dd')
    .selectAll('div.loc')
    .data(d => d.lines)
    .join('div')
    .attr('class', 'loc')
    .style('background-color', d => colors(d.type));
}

// ---------------------- Slider ----------------------
function initTimeSlider(commits) {
  let commitProgress = 100;
  const slider = document.getElementById("commit-progress");
  const timeEl = document.getElementById("commit-time");
  const timeScale = d3.scaleTime().domain(d3.extent(commits, d => d.datetime)).range([0,100]);
  let commitMaxTime = timeScale.invert(commitProgress);

  function onSliderChange() {
    commitProgress = Number(slider.value);
    commitMaxTime = timeScale.invert(commitProgress);

    if (commitProgress === 100) {
      timeEl.textContent = "";
      document.getElementById("any-time-label").style.display = "block";
    } else {
      timeEl.textContent = commitMaxTime.toLocaleString();
      document.getElementById("any-time-label").style.display = "none";
    }

    const filteredCommits = commits.filter(d => d.datetime <= commitMaxTime);
    updateScatterPlot(filteredCommits);
    updateFileDisplay(filteredCommits);
    renderCommitInfo(filteredCommits);
  }

  slider.value = commitProgress;
  slider.addEventListener("input", onSliderChange);
  onSliderChange();
}

// ---------------------- Main ----------------------
(async function main() {
  const data = await loadData();
  const commits = processCommits(data);

  renderCommitInfo(commits);
  renderScatterPlot(commits);
  updateFileDisplay(commits);
  initTimeSlider(commits);
})();

import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

async function loadData() {
  const data = await d3.csv('loc.csv', (row) => ({
    ...row,
    line: Number(row.line), // or just +row.line
    depth: Number(row.depth),
    length: Number(row.length),
    date: new Date(row.date + 'T00:00' + row.timezone),
    datetime: new Date(row.datetime),
  }));

  return data;
}

const tooltip = d3.select('#commit-tooltip');

function processCommits(data) {
  return d3
    .groups(data, (d) => d.commit)
    .map(([commit, lines]) => {
      let first = lines[0];
      let { author, date, time, timezone, datetime } = first;
      let ret = {
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
        enumerable: false,  
        });

      return ret;
    });
}

function renderCommitInfo(data, commits) {
  // Create the dl element
  const dl = d3.select('#stats').append('dl').attr('class', 'stats').text("SUMMARY");

  // Add total commits
  dl.append('dt').text('COMMITS');
  dl.append('dd').text(commits.length);

  // Add total LOC
  dl.append('dt').html('TOTAL <abbr title="Lines of code">LOC</abbr>');
  dl.append('dd').text(data.length);

  dl.append('dt').html('NUMBER OF FILES');
  dl.append('dd').text(d3.groups(data, (d) => d.file).length); 

  const hours = data.map((d) => d.datetime.getHours());
  const avgHour = d3.mean(hours);
  let timeOfDay;
  if (avgHour < 6) timeOfDay = "Night";
  else if (avgHour < 12) timeOfDay = "Morning";
  else if (avgHour < 17) timeOfDay = "Afternoon";
  else timeOfDay = "Evening";
  
  dl.append('dt').html('MOST ACTIVE TIME OF DAY');
  dl.append('dd').text(timeOfDay); 

  const files = d3.groups(data, (d) => d.file);
  // compute number of lines per file
  const fileLengths = files.map(([file, lines]) => ({
    file,
    lineCount: lines.length
  }));

  const longestFile = d3.greatest(fileLengths, (d) => d.lineCount);

  dl.append('dt').html('MAX LINES');
  dl.append('dd').text(longestFile.lineCount);

  const uniqueDates = new Set(data.map(d => d.date.toDateString())); 

  const daysWorked = uniqueDates.size;
  dl.append('dt').text('DAYS WORKED');
  dl.append('dd').text(daysWorked);
}

let xScale = 0;
let yScale = 0;

function renderScatterPlot(data, commits) {
  const width = 1000;
  const height = 600;

  const svg = d3
    .select('#chart')
    .append('svg')
    .attr('viewBox', `0 0 ${width} ${height}`)
    .style('overflow', 'visible');

  xScale = d3
    .scaleTime()
    .domain(d3.extent(commits, (d) => d.datetime))
    .range([0, width])
    .nice();
  yScale = d3.scaleLinear().domain([0, 24]).range([height, 0]);
  
  const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
  const rScale = d3
    .scaleSqrt() // Change only this line
    .domain([minLines, maxLines])
    .range([2, 30]);
  const dots = svg.append('g').attr('class', 'dots');
  const sortedCommits = d3.sort(commits, (d) => -d.totalLines);

  dots
    .selectAll('circle')
    .data(sortedCommits)
    .join('circle')
    .attr('cx', (d) => xScale(d.datetime))
    .attr('cy', (d) => yScale(d.hourFrac))
    .attr('r', (d) => rScale(d.totalLines))
    .style('fill-opacity', 0.7) // Add transparency for overlapping dots
    .attr('fill', 'steelblue')
    .on('mouseenter', (event, commit) => {
      d3.select(event.currentTarget).style('fill-opacity', 1); // Full opacity on hover
      renderTooltipContent(commit);
      updateTooltipVisibility(true);
      updateTooltipPosition(event);
    })
    .on('mouseleave', () => {
      d3.select(event.currentTarget).style('fill-opacity', 0.7);
      updateTooltipVisibility(false);
    });
    
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };

    const usableArea = {
      top: margin.top,
      right: width - margin.right,
      bottom: height - margin.bottom,
      left: margin.left,
      width: width - margin.left - margin.right,
      height: height - margin.top - margin.bottom,
    };


    // Update scales with new ranges
    xScale.range([usableArea.left, usableArea.right]);
    yScale.range([usableArea.bottom, usableArea.top]);

    const gridlines = svg
      .append('g')
      .attr('class', 'gridlines')
      .attr('transform', `translate(${usableArea.left}, 0)`);

    // Create gridlines as an axis with no labels and full-width ticks
    gridlines.call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));
    
    // Create the axes
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3
      .axisLeft(yScale)
      .tickFormat((d) => String(d % 24).padStart(2, '0') + ':00');

    // Add X axis
    svg
      .append('g')
      .attr('transform', `translate(0, ${usableArea.bottom})`)
      .call(xAxis);

    // Add Y axis
    svg
      .append('g')
      .attr('transform', `translate(${usableArea.left}, 0)`)
      .call(yAxis);

        
    createBrushSelector(svg);
  }

function renderTooltipContent(commit) {
  const link = document.getElementById('commit-link');
  const date = document.getElementById('commit-date');
  const time = document.getElementById('commit-time');
  const author = document.getElementById('commit-author');
  const totalLines = document.getElementById('commit-lines');
  
  if (Object.keys(commit).length === 0) return;

  link.href = commit.url;
  link.textContent = commit.id;
  date.textContent = commit.datetime?.toLocaleString('en', {
    dateStyle: 'full',
  });
  time.textContent = commit.time;
  author.textContent = commit.author;
  totalLines.textContent = commit.totalLines;
  
}

function updateTooltipVisibility(isVisible) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.hidden = !isVisible;
}

function updateTooltipPosition(event) {
  const tooltip = document.getElementById('commit-tooltip');
  tooltip.style.left = `${event.clientX}px`;
  tooltip.style.top = `${event.clientY}px`;
}

function createBrushSelector(svg) {
  // Create brush
  svg.call(d3.brush().on('start brush end', brushed));
  // Raise dots and everything after overlay
  svg.selectAll('.dots, .overlay ~ *').raise();
}

function brushed(event) {
  const selection = event.selection;
  d3.selectAll('circle').classed('selected', (d) =>
    isCommitSelected(selection, d),
  );
  renderSelectionCount(selection);
  renderLanguageBreakdown(selection);
}

function isCommitSelected(selection, commit) {
  if (!selection) return false;

  // Destructure the brush corners
  const [[x0, y0], [x1, y1]] = selection;

  const x = xScale(commit.datetime);
  const y = yScale(commit.hourFrac);

  return x >= x0 && x <= x1 && y >= y0 && y <= y1;
}

function renderSelectionCount(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];

  const countElement = document.querySelector('#selection-count');
  countElement.textContent = `${
    selectedCommits.length || 'No'
  } commits selected`;

  return selectedCommits;
}

function renderLanguageBreakdown(selection) {
  const selectedCommits = selection
    ? commits.filter((d) => isCommitSelected(selection, d))
    : [];
  const container = document.getElementById('language-breakdown');

  if (selectedCommits.length === 0) {
    container.innerHTML = '';
    return;
  }
  const requiredCommits = selectedCommits.length ? selectedCommits : commits;
  const lines = requiredCommits.flatMap((d) => d.lines);

  // Use d3.rollup to count lines per language
  const breakdown = d3.rollup(
    lines,
    (v) => v.length,
    (d) => d.type,
  );

  // Update DOM with breakdown
  container.innerHTML = '';

  for (const [language, count] of breakdown) {
    const proportion = count / lines.length;
    const formatted = d3.format('.1~%')(proportion);

    container.innerHTML += `
            <dt>${language}</dt>
            <dd>${count} lines (${formatted})</dd>
        `;
  }
}

let data = await loadData();
let commits = processCommits(data);

renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
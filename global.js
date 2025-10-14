console.log('IT’S ALIVE!');

function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
  { url: "", title: "Home" },
  { url: "projects/", title: "Projects" },
  { url: "resume/", title: "Resume" },
  { url: "contact/", title: "Contact" },
  { url: "https://github.com/nadinemarcus", title: "GitHub" }
];

const BASE_PATH =
  location.hostname === 'localhost' || location.hostname === '127.0.0.1'
    ? '/' // Local server
    : '/website/'; // GitHub Pages repo name


let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
  let url = p.url;
  let title = p.title;
  url = !url.startsWith('http') ? BASE_PATH + url : url;

  let a = document.createElement('a');

  a.href = url;
  a.textContent = title;

  a.classList.toggle(
    "current",
    a.host === location.host && a.pathname === location.pathname
  );

  a.toggleAttribute("target", a.host !== location.host);
  nav.append(a);
}

document.body.insertAdjacentHTML(
  "afterbegin",
  `
  <label class="color-scheme" style="
    position: absolute;
    top: 1rem;
    left: 1rem;
    font-size: 80%;
    font-family:inherit;
  ">
    Theme:
    <select>
      <option value="light dark">Automatic</option>
      <option value="light">Light</option>
      <option value="dark">Dark</option>
    </select>
  </label>`,
);

const select = document.querySelector(".color-scheme select");
if ("colorScheme" in localStorage) {
  const savedScheme = localStorage.colorScheme;
  document.documentElement.style.colorScheme = savedScheme;
  select.value = savedScheme; // Make sure dropdown reflects current setting
} else {
  // Optional: set a default
  document.documentElement.style.colorScheme = "light dark";
  select.value = "light dark";
}

select.addEventListener('input', function (event) {
  const value = event.target.value;
  document.documentElement.style.colorScheme = value;
  console.log("color scheme changed to", value);
  localStorage.colorScheme = event.target.value
});
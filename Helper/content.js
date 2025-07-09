(async function runScrapeCycle() {
  const links = JSON.parse(sessionStorage.getItem('scanLinks') || '[]');
  const roles = JSON.parse(sessionStorage.getItem('scanRoles') || '[]');
  let index = parseInt(sessionStorage.getItem('scanIndex') || '0');

  if (!links.length || !roles.length || !window.location.href.includes('/directory/school/')) return;

  // 📌 School Name and City from ".for-print" block
  const headerText = document.querySelector('.for-print')?.textContent.trim() || '';
  const [schoolName, cityFull] = headerText.split('\n').map(s => s.trim());
  const city = cityFull.split(',')[0].trim() || 'blank';
  const state = cityFull.split(',')[1]?.trim() || 'blank';

  const rows = document.querySelectorAll('section#admins table.search tr, section#coaches table.search tr');
  const results = [];

  rows.forEach(row => {
    const tds = row.querySelectorAll('td');
    if (tds.length < 4) return;

    const position = tds[0].textContent.trim().toLowerCase();
    const name = tds[2].textContent.trim();
    const email = tds[3]?.querySelector('.email-hidden')?.textContent.trim();

    if (name && email) {
      const [first, last] = name.split(" ", 2);
      results.push({
        first: first || "",
        last: last || "",
        email,
        school: schoolName,
        city,
        state,
        position
      });
    }
  });

  const prev = await chrome.storage.local.get(["results"]);
  const all = (prev.results || []).concat(results);
  await chrome.storage.local.set({ results: all });

  index += 1;
  sessionStorage.setItem('scanIndex', index.toString());

  if (index < links.length) {
    window.history.back();
  } else {
    sessionStorage.clear();
    chrome.runtime.sendMessage({ action: "exportResults" });
    alert("Scan complete. CSV is downloading.");
  }
})();

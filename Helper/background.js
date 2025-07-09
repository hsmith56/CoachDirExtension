let results = [];
let roleKeywords = [];
let searchParams = {};
let batchSize = 2; // default

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startProcessing") {
    console.log("Starting processing with URLs:", message.urls, "and roles:", message.roles, "and searchParams:", message.searchParams, "and batchSize:", message.batchSize);
    results = [];
    roleKeywords = message.roles;
    searchParams = message.searchParams || {};
    batchSize = Number(message.batchSize) || 2;
    processNext(message.urls, 0);
  }
  if (message.action === "storeResults" && Array.isArray(message.data)) {
    console.log("Storing results from content script:", message.data);
    results = results.concat(message.data);
    sendResponse({ status: "ok" });
  }
  if (message.action === "exportResults") {
    console.log("Exporting results...");
    downloadResults();
    results = [];
    sendResponse({ status: "exported" });
  }
  if (message.action === "resetScan") {
    console.log("Resetting scan state.");
    results = [];
    roleKeywords = [];
    sendResponse({ status: "reset" });
  }
});

function processNext(urls, index) {
  if (index >= urls.length) {
    console.log("All URLs processed. Downloading results.");
    downloadResults();
    return;
  }

  console.log(`Processing URL ${index + 1}/${urls.length}: ${urls[index]}`);

  const batch = urls.slice(index, index + batchSize);

  let completed = 0;

  batch.forEach((url, i) => {
    chrome.tabs.create({ url: url, active: false }, (tab) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: extractPeopleForRoles,
        args: [roleKeywords]
      }, (res) => {
        const people = res?.[0]?.result || [];
        console.log(`Extracted ${people.length} people from ${url}`, people);
        results.push(...people);
        chrome.tabs.remove(tab.id, () => {
          completed++;
          // if (completed === batch.length) {
          //   const delay = Math.random() * 1250 + 250;
          //   setTimeout(() => {
          //     processNext(urls, index + batchSize);
          //   }, delay);
          // }
          if (completed === batch.length) {
            processNext(urls, index + batchSize);
          }
        });
      });
    });
  });
}

function extractPeopleForRoles(roles) {
  const people = [];

  // Get school name
  // const schoolHeader = document.querySelector('.for-print');
  // const schoolName = schoolHeader?.textContent?.trim().split("\n")[0] || document.title;
  
  const headerText = document.querySelector('.for-print')?.textContent.trim() || '';
  const [schoolName, cityFull] = headerText.split('\n').map(s => s.trim());
  const city = cityFull.split(',')[0].trim() || 'blank';
  const state = cityFull.split(',')[1]?.trim() || 'blank';

  // Process both Admins and Coaches tables
  const tables = document.querySelectorAll('section#admins table.search, section#coaches table.search');

  tables.forEach(table => {
    const rows = table.querySelectorAll('tbody tr');

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length < 4) return;


      // Update the position value to remove any non alphabetic characters
      const position = cells[0].textContent.trim().toLowerCase().replace(/[^a-z\s]/g, '');

      const rank = cells[1].textContent.trim().toLowerCase();
      const name = cells[2].textContent.trim();
      const email = cells[3]?.querySelector('.email-hidden')?.textContent?.trim() || "";

      // Match one of the selected roles
      const matched = roles.find(role => position.includes(role.toLowerCase()));
      if (matched && name && email) {
        const [firstName, lastName] = name.split(" ", 2);
        people.push({
          position,
          first: firstName || "",
          last: lastName || "",
          email,
          rank,
          school: schoolName,
          city,
          state
        });
      }
    });
  });

  console.log(`extractPeopleForRoles found ${people.length} people for roles:`, roles);
  return people;
}

function downloadResults() {
  const csvHeader = "First Name,Last Name,Position,Email,School,City,State,Rank";
  const csvRows = results.map(r =>
    `"${r.first}","${r.last}","${r.position}","${r.email}","${r.school}","${r.city}","${r.state}","${r.rank}"`
  ).join("\n");

  const csv = `${csvHeader}\n${csvRows}`;

  console.log("CSV to be downloaded:\n", csv);

  // Generate a dynamic filename using roles and search params
  let rolePart = roleKeywords.length ? roleKeywords.join('_').replace(/[^a-z0-9]/gi, '_').toLowerCase() : "roles";
  const radius = searchParams.radius 
  const city = searchParams.city 
  const state = searchParams.state 
  
  const filename = `${rolePart} - ${radius} miles - ${city} - ${state}`.toLowerCase()
    .replace(/[\/\\:*?"<>|]+/g, '') // remove illegal filename characters
    .replace(/\s+/g, ' ')           // normalize whitespace
    .trim() + ".csv";

  // let filename = `${rolePart}_${timestamp}.csv`;

  // Encode CSV as a data URL
  const csvData = encodeURIComponent(csv);
  const dataUrl = `data:text/csv;charset=utf-8,${csvData}`;

  chrome.downloads.download({
    url: dataUrl,
    filename: filename,
    saveAs: false // Download automatically, no Save As dialog
  });

  console.log(`Download triggered for ${filename}`);
}
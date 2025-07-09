document.getElementById("startScan").addEventListener("click", async () => {
  console.log("Start scan button clicked");
  const batchSize = Number(document.getElementById('batchSizeSlider').value);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: collectLinksAndStart,
    args: [batchSize]
  });
});

document.getElementById("resetScan").addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  // Clear sessionStorage in the active tab
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      sessionStorage.removeItem('scanLinks');
      sessionStorage.removeItem('scanRoles');
      sessionStorage.removeItem('scanIndex');
    }
  });
  // Optionally, send a message to background to clear results
  chrome.runtime.sendMessage({ action: "resetScan" });
  alert("Scan state reset. You can use the page normally.");
});

function collectLinksAndStart(batchSize) {
  const anchors = Array.from(document.querySelectorAll('a[href*="/directory/school/"]'));
  const links = anchors.map(a => a.href);

  const select = document.getElementById('id_roles');
  let roles = [];
  if (!select || select.selectedOptions.length === 0) {
    alert("Please select at least one position first.");
    
  }
  else {
    roles = Array.from(select.selectedOptions).map(opt =>
      opt.textContent.trim().split('(')[0].trim()
    );
  }

  // Example: Collect search params from URL (customize as needed)
  const urlParams = new URLSearchParams(window.location.search);
  const searchParams = {};
  for (const [key, value] of urlParams.entries()) {
    searchParams[key] = value;
  }

  searchParams.radius = urlParams.get("radius") || "nan";
  searchParams.city = urlParams.get("location").split(",")[0] || "no city";
  searchParams.state = urlParams.get('states') || "no state";


  // Send links, roles, searchParams, and batchSize to background
  chrome.runtime.sendMessage({
    action: "startProcessing",
    urls: links,
    roles: roles,
    searchParams: searchParams,
    batchSize: batchSize
  });

  alert("Scan started! You can close this popup.");
}

// Slider UI updates
const batchSizeSlider = document.getElementById('batchSizeSlider');
const batchSizeValue = document.getElementById('batchSizeValue');
batchSizeSlider.addEventListener('input', () => {
  batchSizeValue.textContent = batchSizeSlider.value;
});

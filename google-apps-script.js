/**
 * SGM AI Dashboard — Google Apps Script
 *
 * This script reads AI tool data from a Google Sheet and pushes it
 * as JSON to a GitHub repository, where it powers the AI Dashboard.
 *
 * SETUP:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire script into the editor
 * 3. Go to Project Settings → Script Properties and add:
 *    - GITHUB_TOKEN  = your GitHub Personal Access Token (fine-grained, Contents read/write)
 *    - GITHUB_REPO   = owner/repo-name (e.g., "sleeping-giant-media/ai-dashboard")
 *    - GITHUB_PATH   = data/tools.json
 * 4. Run onOpen() once to create the custom menu
 * 5. Use the "SGM Scripts → Push Tools to Dashboard" menu item to publish
 *
 * SPREADSHEET LAYOUT:
 * - Sheet name: "AI Tools"
 * - Header row: Row 1
 * - Data starts: Row 2
 * - Columns A-L:
 *   A: TOOL NAME
 *   B: AI PLATFORM
 *   C: AI LAYER
 *   D: CATEGORY/POD
 *   E: PRIMARY USE CASE
 *   F: BEING USED BY
 *   G: BUILDER (who set it up)
 *   H: OWNER (who updates it)
 *   I: STATUS
 *   J: LINK
 *   K: TYPE (e.g. Custom GPT, N8N Workflow, Front-end)
 *   L: ADD TO DASHBOARD (Yes/No — only "Yes" rows are published)
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SGM Scripts')
    .addItem('Push Tools to Dashboard', 'pushToolsToDashboard')
    .addToUi();
}

function pushToolsToDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AI Tools");
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error: "AI Tools" sheet not found. Check the sheet name.');
    return;
  }

  const headerRow = 1;
  const dataStartRow = 2;
  const lastRow = sheet.getLastRow();
  const lastCol = 12;  // Columns A-L

  if (lastRow < dataStartRow) {
    ui.alert('No tool data found.');
    return;
  }

  const dataRows = sheet.getRange(dataStartRow, 1, lastRow - dataStartRow + 1, lastCol).getValues();

  // Column index mapping (0-based)
  const COL = {
    NAME: 0,        // A: TOOL NAME
    PLATFORM: 1,    // B: AI PLATFORM
    LAYER: 2,       // C: AI LAYER
    CATEGORY: 3,    // D: CATEGORY/POD
    USE_CASE: 4,    // E: PRIMARY USE CASE
    USED_BY: 5,     // F: BEING USED BY
    BUILDER: 6,     // G: BUILDER
    OWNER: 7,       // H: OWNER
    STATUS: 8,      // I: STATUS
    LINK: 9,        // J: LINK
    TYPE: 10,       // K: TYPE
    DASHBOARD: 11   // L: ADD TO DASHBOARD
  };

  const tools = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];

    // Skip rows with no tool name
    if (!row[COL.NAME] || row[COL.NAME].toString().trim() === '') continue;

    // Only include rows where "Add to dashboard" is "Yes"
    const addToDashboard = row[COL.DASHBOARD] ? row[COL.DASHBOARD].toString().trim().toLowerCase() : '';
    if (addToDashboard !== 'yes') continue;

    tools.push({
      id: 'tool-' + String(i + 1).padStart(3, '0'),
      name:           row[COL.NAME]     ? row[COL.NAME].toString().trim()     : '',
      aiPlatform:     row[COL.PLATFORM] ? row[COL.PLATFORM].toString().trim() : '',
      aiLayer:        row[COL.LAYER]    ? row[COL.LAYER].toString().trim()    : '',
      category:       row[COL.CATEGORY] ? row[COL.CATEGORY].toString().trim() : '',
      primaryUseCase: row[COL.USE_CASE] ? row[COL.USE_CASE].toString().trim() : '',
      beingUsedBy:    row[COL.USED_BY]  ? row[COL.USED_BY].toString().trim()  : '',
      builder:        row[COL.BUILDER]  ? row[COL.BUILDER].toString().trim()  : '',
      owner:          row[COL.OWNER]    ? row[COL.OWNER].toString().trim()    : '',
      status:         row[COL.STATUS]   ? row[COL.STATUS].toString().trim()   : '',
      link:           row[COL.LINK]     ? row[COL.LINK].toString().trim()     : '',
      type:           row[COL.TYPE]     ? row[COL.TYPE].toString().trim()     : ''
    });
  }

  if (tools.length === 0) {
    ui.alert('No tools found to push.');
    return;
  }

  const payload = {
    lastUpdated: new Date().toISOString(),
    tools: tools
  };

  const jsonContent = JSON.stringify(payload, null, 2);

  const response = ui.alert(
    'Push to Dashboard',
    'Found ' + tools.length + ' tool(s). Push to the live AI Dashboard?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    pushToGitHub(jsonContent);
    ui.alert('Dashboard updated — ' + tools.length + ' tool(s) pushed.');
  } catch (e) {
    ui.alert('Push failed: ' + e.message);
  }
}

function pushToGitHub(content) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const repo = props.getProperty('GITHUB_REPO');
  const path = props.getProperty('GITHUB_PATH') || 'data/tools.json';
  const branch = 'main';

  if (!token || !repo) {
    throw new Error('Missing GITHUB_TOKEN or GITHUB_REPO in Script Properties.');
  }

  const apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;

  // Get current file SHA (needed for updates)
  let sha = '';
  try {
    const getResponse = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github.v3+json'
      },
      muteHttpExceptions: true
    });

    if (getResponse.getResponseCode() === 200) {
      sha = JSON.parse(getResponse.getContentText()).sha;
    }
  } catch (e) {
    // 404 = file doesn't exist yet, which is fine
  }

  // PUT the file
  const putPayload = {
    message: 'Update AI tools data — ' + new Date().toLocaleDateString('en-GB'),
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: branch
  };

  if (sha) putPayload.sha = sha;

  const putResponse = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(putPayload),
    muteHttpExceptions: true
  });

  const code = putResponse.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API returned ' + code + ': ' + putResponse.getContentText());
  }
}

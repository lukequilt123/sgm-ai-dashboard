/**
 * SGM AI Dashboard — Google Apps Script
 *
 * This script reads data from multiple Google Sheet tabs and pushes each
 * as JSON to a GitHub repository, where it powers the AI Dashboard.
 *
 * SETUP:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Paste this entire script into the editor
 * 3. Go to Project Settings → Script Properties and add:
 *    - GITHUB_TOKEN  = your GitHub Personal Access Token (fine-grained, Contents read/write)
 *    - GITHUB_REPO   = owner/repo-name (e.g., "sleeping-giant-media/ai-dashboard")
 * 4. Run onOpen() once to create the custom menu
 * 5. Use the "SGM Scripts" menu to push each tab independently
 *
 * SHEET TABS:
 *
 * "AI Tools" (cols A-K):
 *   A: TOOL NAME  B: AI PLATFORM  C: AI TYPE  D: CATEGORY/POD
 *   E: PRIMARY USE CASE  F: LINK TO GOOGLE DOC CONTAINING PROMPT TEXT
 *   G: BUILDER (EMAIL)  H: OWNER  I: LINK  J: ADD TO DASHBOARD  K: DATE ADDED
 *
 * "Prompts" (cols A-H):
 *   A: PROMPT NAME  B: MAIN MODEL  C: CATEGORY/POD  D: PRIMARY USE CASE
 *   E: BUILDER (EMAIL)  F: OWNER  G: LINK  H: ADD TO DASHBOARD
 *
 * "Claude" (cols A-F):
 *   A: NAME  B: ITEM TYPE  C: OBJECTIVE/OUTCOME  D: CREATOR
 *   E: LINK  F: ADD TO DASHBOARD
 *
 * "Latest Content" (cols A-D):
 *   A: HEADING  B: SUMMARY  C: LINK  D: ADD TO DASHBOARD
 */

/* ── Menu ─────────────────────────────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('SGM Scripts')
    .addItem('Push Tools to Dashboard', 'pushToolsToDashboard')
    .addItem('Push Prompts to Dashboard', 'pushPromptsToDashboard')
    .addItem('Push Claude to Dashboard', 'pushClaudeToDashboard')
    .addItem('Push Latest Content to Dashboard', 'pushLatestContentToDashboard')
    .addToUi();
}

/* ── Push: AI Tools ──────────────────────────────────────── */

function pushToolsToDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("AI Tools");
  const ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error: "AI Tools" sheet not found. Check the sheet name.');
    return;
  }

  const lastRow = sheet.getLastRow();
  const lastCol = 11; // Columns A-K

  if (lastRow < 2) {
    ui.alert('No tool data found.');
    return;
  }

  const dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  const COL = {
    NAME: 0,        // A: TOOL NAME
    PLATFORM: 1,    // B: AI PLATFORM
    AI_TYPE: 2,     // C: AI TYPE
    CATEGORY: 3,    // D: CATEGORY/POD
    USE_CASE: 4,    // E: PRIMARY USE CASE
    PROMPT_LINK: 5, // F: LINK TO GOOGLE DOC CONTAINING PROMPT TEXT
    BUILDER: 6,     // G: BUILDER (EMAIL)
    OWNER: 7,       // H: OWNER
    LINK: 8,        // I: LINK
    DASHBOARD: 9,   // J: ADD TO DASHBOARD
    DATE_ADDED: 10  // K: DATE ADDED
  };

  const tools = [];
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i];

    if (!row[COL.NAME] || row[COL.NAME].toString().trim() === '') continue;

    var addToDashboard = row[COL.DASHBOARD] ? row[COL.DASHBOARD].toString().trim().toLowerCase() : '';
    if (addToDashboard !== 'yes') continue;

    tools.push({
      id: 'tool-' + String(i + 1).padStart(3, '0'),
      name:           row[COL.NAME]        ? row[COL.NAME].toString().trim()        : '',
      aiPlatform:     row[COL.PLATFORM]    ? row[COL.PLATFORM].toString().trim()    : '',
      aiType:         row[COL.AI_TYPE]     ? row[COL.AI_TYPE].toString().trim()     : '',
      category:       row[COL.CATEGORY]    ? row[COL.CATEGORY].toString().trim()    : '',
      primaryUseCase: row[COL.USE_CASE]    ? row[COL.USE_CASE].toString().trim()    : '',
      promptLink:     row[COL.PROMPT_LINK] ? row[COL.PROMPT_LINK].toString().trim() : '',
      builder:        row[COL.BUILDER]     ? row[COL.BUILDER].toString().trim()     : '',
      owner:          row[COL.OWNER]       ? row[COL.OWNER].toString().trim()       : '',
      link:           row[COL.LINK]        ? row[COL.LINK].toString().trim()        : '',
      dateAdded:      row[COL.DATE_ADDED]  ? formatDateForJson(row[COL.DATE_ADDED]) : ''
    });
  }

  if (tools.length === 0) {
    ui.alert('No tools found to push (check "Add to Dashboard" column).');
    return;
  }

  var payload = { lastUpdated: new Date().toISOString(), tools: tools };
  var jsonContent = JSON.stringify(payload, null, 2);

  var response = ui.alert(
    'Push Tools to Dashboard',
    'Found ' + tools.length + ' tool(s). Push to the live AI Dashboard?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    pushToGitHub(jsonContent, 'data/tools.json', 'Update AI tools data — ' + new Date().toLocaleDateString('en-GB'));
    ui.alert('Dashboard updated — ' + tools.length + ' tool(s) pushed.');
  } catch (e) {
    ui.alert('Push failed: ' + e.message);
  }
}

/* ── Push: Prompts ───────────────────────────────────────── */

function pushPromptsToDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Prompts");
  var ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error: "Prompts" sheet not found. Check the sheet name.');
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = 8; // Columns A-H

  if (lastRow < 2) {
    ui.alert('No prompt data found.');
    return;
  }

  var dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var COL = {
    NAME: 0,       // A: PROMPT NAME
    MODEL: 1,      // B: MAIN MODEL
    CATEGORY: 2,   // C: CATEGORY/POD
    USE_CASE: 3,   // D: PRIMARY USE CASE
    BUILDER: 4,    // E: BUILDER (EMAIL)
    OWNER: 5,      // F: OWNER
    LINK: 6,       // G: LINK
    DASHBOARD: 7   // H: ADD TO DASHBOARD
  };

  var prompts = [];
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i];

    if (!row[COL.NAME] || row[COL.NAME].toString().trim() === '') continue;

    var addToDashboard = row[COL.DASHBOARD] ? row[COL.DASHBOARD].toString().trim().toLowerCase() : '';
    if (addToDashboard !== 'yes') continue;

    prompts.push({
      id: 'prompt-' + String(i + 1).padStart(3, '0'),
      name:           row[COL.NAME]     ? row[COL.NAME].toString().trim()     : '',
      mainModel:      row[COL.MODEL]    ? row[COL.MODEL].toString().trim()    : '',
      category:       row[COL.CATEGORY] ? row[COL.CATEGORY].toString().trim() : '',
      primaryUseCase: row[COL.USE_CASE] ? row[COL.USE_CASE].toString().trim() : '',
      builder:        row[COL.BUILDER]  ? row[COL.BUILDER].toString().trim()  : '',
      owner:          row[COL.OWNER]    ? row[COL.OWNER].toString().trim()    : '',
      link:           row[COL.LINK]     ? row[COL.LINK].toString().trim()     : ''
    });
  }

  if (prompts.length === 0) {
    ui.alert('No prompts found to push (check "Add to Dashboard" column).');
    return;
  }

  var payload = { lastUpdated: new Date().toISOString(), prompts: prompts };
  var jsonContent = JSON.stringify(payload, null, 2);

  var response = ui.alert(
    'Push Prompts to Dashboard',
    'Found ' + prompts.length + ' prompt(s). Push to the live AI Dashboard?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    pushToGitHub(jsonContent, 'data/prompts.json', 'Update prompts data — ' + new Date().toLocaleDateString('en-GB'));
    ui.alert('Dashboard updated — ' + prompts.length + ' prompt(s) pushed.');
  } catch (e) {
    ui.alert('Push failed: ' + e.message);
  }
}

/* ── Push: Claude ────────────────────────────────────────── */

function pushClaudeToDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Claude");
  var ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error: "Claude" sheet not found. Check the sheet name.');
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = 6; // Columns A-F

  if (lastRow < 2) {
    ui.alert('No Claude data found.');
    return;
  }

  var dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var COL = {
    NAME: 0,       // A: NAME
    ITEM_TYPE: 1,  // B: ITEM TYPE
    OBJECTIVE: 2,  // C: OBJECTIVE/OUTCOME
    CREATOR: 3,    // D: CREATOR
    LINK: 4,       // E: LINK
    DASHBOARD: 5   // F: ADD TO DASHBOARD
  };

  var items = [];
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i];

    if (!row[COL.NAME] || row[COL.NAME].toString().trim() === '') continue;

    var addToDashboard = row[COL.DASHBOARD] ? row[COL.DASHBOARD].toString().trim().toLowerCase() : '';
    if (addToDashboard !== 'yes') continue;

    items.push({
      id: 'claude-' + String(i + 1).padStart(3, '0'),
      name:      row[COL.NAME]      ? row[COL.NAME].toString().trim()      : '',
      itemType:  row[COL.ITEM_TYPE] ? row[COL.ITEM_TYPE].toString().trim() : '',
      objective: row[COL.OBJECTIVE] ? row[COL.OBJECTIVE].toString().trim() : '',
      creator:   row[COL.CREATOR]   ? row[COL.CREATOR].toString().trim()   : '',
      link:      row[COL.LINK]      ? row[COL.LINK].toString().trim()      : ''
    });
  }

  if (items.length === 0) {
    ui.alert('No Claude items found to push (check "Add to Dashboard" column).');
    return;
  }

  var payload = { lastUpdated: new Date().toISOString(), items: items };
  var jsonContent = JSON.stringify(payload, null, 2);

  var response = ui.alert(
    'Push Claude to Dashboard',
    'Found ' + items.length + ' item(s). Push to the live AI Dashboard?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    pushToGitHub(jsonContent, 'data/claude.json', 'Update Claude data — ' + new Date().toLocaleDateString('en-GB'));
    ui.alert('Dashboard updated — ' + items.length + ' Claude item(s) pushed.');
  } catch (e) {
    ui.alert('Push failed: ' + e.message);
  }
}

/* ── Push: Latest Content ────────────────────────────────── */

function pushLatestContentToDashboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Latest Content");
  var ui = SpreadsheetApp.getUi();

  if (!sheet) {
    ui.alert('Error: "Latest Content" sheet not found. Check the sheet name.');
    return;
  }

  var lastRow = sheet.getLastRow();
  var lastCol = 4; // Columns A-D

  if (lastRow < 2) {
    ui.alert('No content data found.');
    return;
  }

  var dataRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

  var COL = {
    HEADING: 0,    // A: HEADING
    SUMMARY: 1,    // B: SUMMARY
    LINK: 2,       // C: LINK
    DASHBOARD: 3   // D: ADD TO DASHBOARD
  };

  var items = [];
  for (var i = 0; i < dataRows.length; i++) {
    var row = dataRows[i];

    if (!row[COL.HEADING] || row[COL.HEADING].toString().trim() === '') continue;

    var addToDashboard = row[COL.DASHBOARD] ? row[COL.DASHBOARD].toString().trim().toLowerCase() : '';
    if (addToDashboard !== 'yes') continue;

    items.push({
      id: 'content-' + String(i + 1).padStart(3, '0'),
      heading: row[COL.HEADING] ? row[COL.HEADING].toString().trim() : '',
      summary: row[COL.SUMMARY] ? row[COL.SUMMARY].toString().trim() : '',
      link:    row[COL.LINK]    ? row[COL.LINK].toString().trim()    : ''
    });
  }

  if (items.length === 0) {
    ui.alert('No content found to push (check "Add to Dashboard" column).');
    return;
  }

  var payload = { lastUpdated: new Date().toISOString(), items: items };
  var jsonContent = JSON.stringify(payload, null, 2);

  var response = ui.alert(
    'Push Latest Content to Dashboard',
    'Found ' + items.length + ' item(s). Push to the live AI Dashboard?',
    ui.ButtonSet.YES_NO
  );
  if (response !== ui.Button.YES) return;

  try {
    pushToGitHub(jsonContent, 'data/latest-content.json', 'Update latest content — ' + new Date().toLocaleDateString('en-GB'));
    ui.alert('Dashboard updated — ' + items.length + ' content item(s) pushed.');
  } catch (e) {
    ui.alert('Push failed: ' + e.message);
  }
}

/* ── Shared: Push to GitHub ──────────────────────────────── */

function pushToGitHub(content, path, commitMessage) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('GITHUB_TOKEN');
  var repo = props.getProperty('GITHUB_REPO');
  var branch = 'main';

  if (!token || !repo) {
    throw new Error('Missing GITHUB_TOKEN or GITHUB_REPO in Script Properties.');
  }

  var apiUrl = 'https://api.github.com/repos/' + repo + '/contents/' + path;

  // Get current file SHA (needed for updates)
  var sha = '';
  try {
    var getResponse = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
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
  var putPayload = {
    message: commitMessage || ('Update dashboard data — ' + new Date().toLocaleDateString('en-GB')),
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: branch
  };

  if (sha) putPayload.sha = sha;

  var putResponse = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(putPayload),
    muteHttpExceptions: true
  });

  var code = putResponse.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API returned ' + code + ': ' + putResponse.getContentText());
  }
}

/* ── Helpers ─────────────────────────────────────────────── */

function formatDateForJson(value) {
  if (value instanceof Date) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return value ? value.toString().trim() : '';
}

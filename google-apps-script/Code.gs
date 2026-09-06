/**
 * Madam Boutique & Madam Fashions - Google Apps Script Web App (Sheets/Drive API layer)
 *
 * Deploy: Extensions > Apps Script > Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 * Then set APPS_SCRIPT_URL (the /exec URL) and APPS_SCRIPT_API_KEY in the backend .env.
 *
 * Contract used by the website backend:
 *   GET {url}?action=getSheet&sheetId=<id>&tab=<tabName>&key=<API_KEY>
 *     -> { ok: true, rows: [ { header1: value, header2: value, ... }, ... ] }
 *   GET {url}?action=listImages&folderId=<driveFolderId>&key=<API_KEY>
 *     -> { ok: true, files: [ { id, name, url } ] }
 *   POST {url}  body: { action: "appendRows", sheetId, tab, rows: [[...], [...]], key }
 *     -> { ok: true, appended: n }        (reserved for Module 2/3 order writes)
 */
var API_KEY = PropertiesService.getScriptProperties().getProperty('API_KEY') || '';

function doGet(e) {
  return handle_(e.parameter || {});
}

function doPost(e) {
  var body = {};
  try { body = JSON.parse(e.postData.contents || '{}'); } catch (err) {}
  return handle_(body);
}

function handle_(p) {
  try {
    if (API_KEY && p.key !== API_KEY) return json_({ ok: false, error: 'Unauthorized' });
    switch (p.action) {
      case 'getSheet': return json_({ ok: true, rows: getSheetRows_(p.sheetId, p.tab) });
      case 'listImages': return json_({ ok: true, files: listImages_(p.folderId) });
      case 'appendRows': return json_({ ok: true, appended: appendRows_(p.sheetId, p.tab, p.rows || []) });
      default: return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function getSheetRows_(sheetId, tab) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = tab ? ss.getSheetByName(tab) : ss.getSheets()[0];
  if (!sheet) throw new Error('Tab not found: ' + tab);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim(); });
  return values.slice(1).filter(function (r) { return r.join('') !== ''; }).map(function (r) {
    var obj = {};
    headers.forEach(function (h, i) { if (h) obj[h] = r[i] === undefined ? '' : String(r[i]); });
    return obj;
  });
}

function listImages_(folderId) {
  var files = DriveApp.getFolderById(folderId).getFiles(), out = [];
  while (files.hasNext()) {
    var f = files.next();
    out.push({ id: f.getId(), name: f.getName(), url: 'https://drive.google.com/thumbnail?id=' + f.getId() + '&sz=w1600' });
  }
  return out;
}

function appendRows_(sheetId, tab, rows) {
  var sheet = SpreadsheetApp.openById(sheetId).getSheetByName(tab);
  if (!sheet) throw new Error('Tab not found: ' + tab);
  rows.forEach(function (r) { sheet.appendRow(r); });
  return rows.length;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

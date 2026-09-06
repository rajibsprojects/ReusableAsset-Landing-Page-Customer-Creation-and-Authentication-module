/**
 * Madam Boutique & Madam Fashions - Google Apps Script Web App (Sheets/Drive API layer)
 *
 * Deploy: Extensions > Apps Script > Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 * Then set APPS_SCRIPT_URL (the /exec URL) and APPS_SCRIPT_API_KEY in the backend .env.
 * Security: requests are rejected unless the Script Property API_KEY is set AND matches `key` (fails closed).
 *
 * Contract used by the website backend:
 *   GET {url}?action=getSheet&sheetId=<id>&tab=<tabName>&key=<API_KEY>
 *     -> { ok: true, rows: [ { header1: value, header2: value, ... }, ... ] }
 *   GET {url}?action=listImages&folderId=<driveFolderId>&key=<API_KEY>
 *     -> { ok: true, files: [ { id, name, url } ] }
 *   POST {url}  body: { action: "appendRows", sheetId, tab, rows: [[...], [...]], key }
 *     -> { ok: true, appended: n }        (reserved for Module 2/3 order writes)
 *   POST {url}  body: { action: "upsertRow", sheetId, tab, keyColumn: "customer_no", row: { header: value, ... }, key }
 *     -> { ok: true, action: "inserted" | "updated", rowNumber: n }   (customer_master sync)
 *     Writes only into columns whose header matches a key in `row`; creates the header row if the tab is empty.
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
    if (!API_KEY || p.key !== API_KEY) return json_({ ok: false, error: 'Unauthorized' });
    switch (p.action) {
      case 'getSheet': return json_({ ok: true, rows: getSheetRows_(p.sheetId, p.tab) });
      case 'listImages': return json_({ ok: true, files: listImages_(p.folderId) });
      case 'appendRows': return json_({ ok: true, appended: appendRows_(p.sheetId, p.tab, p.rows || []) });
      case 'upsertRow': return json_(upsertRow_(p.sheetId, p.tab, p.keyColumn, p.row || {}));
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

function upsertRow_(sheetId, tab, keyColumn, row) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var lastCol = sheet.getLastColumn();
    var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
    if (!headers.length || headers.join('') === '') {
      headers = Object.keys(row);
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
    // Match headers to row keys ignoring case and internal whitespace (e.g. "customer_ pin" == "customer_pin").
    var norm = function (s) { return String(s).toLowerCase().replace(/\s+/g, ''); };
    var rowByNorm = {};
    Object.keys(row).forEach(function (k) { rowByNorm[norm(k)] = row[k]; });
    var keyIdx = headers.map(norm).indexOf(norm(keyColumn));
    if (keyIdx < 0) throw new Error('Key column not found in header: ' + keyColumn);
    var lastRow = sheet.getLastRow();
    var targetRow = -1;
    if (lastRow > 1) {
      var keys = sheet.getRange(2, keyIdx + 1, lastRow - 1, 1).getValues();
      for (var i = 0; i < keys.length; i++) {
        if (String(keys[i][0]).trim() === String(row[keyColumn]).trim()) { targetRow = i + 2; break; }
      }
    }
    var existing = targetRow > 0 ? sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0] : headers.map(function () { return ''; });
    var values = headers.map(function (h, i) { var n = norm(h); return rowByNorm.hasOwnProperty(n) ? rowByNorm[n] : existing[i]; });
    if (targetRow > 0) {
      sheet.getRange(targetRow, 1, 1, headers.length).setValues([values]);
      return { ok: true, action: 'updated', rowNumber: targetRow };
    }
    sheet.appendRow(values);
    return { ok: true, action: 'inserted', rowNumber: sheet.getLastRow() };
  } finally {
    lock.releaseLock();
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

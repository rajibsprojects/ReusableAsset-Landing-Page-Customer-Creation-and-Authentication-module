/**
 * Madam Boutique & Madam Fashions - Google Apps Script Web App (Sheets/Drive API layer)
 *
 * Deploy: Extensions > Apps Script > Deploy > New deployment > Web app
 *   Execute as: Me   |   Who has access: Anyone
 * Configuration lives OUTSIDE this file: the backend sends Spreadsheet IDs / tab names in each request (from its
 * environment variables) and the shared secret is a Script Property named API_KEY.
 * Security: requests are rejected unless the Script Property API_KEY is set AND matches `key` (fails closed).
 * The backend sends every request as POST with a JSON body (key included in the body, not the URL).
 * Passwords / password hashes are never sent to or stored in any sheet.
 *
 * Actions (JSON body, all require "key"):
 *   getSheet      { sheetId, tab }                                  -> { ok, rows: [ {header: value} ] }
 *   listImages    { folderId }                                      -> { ok, files: [ {id, name, url} ] }
 *   appendRows    { sheetId, tab, rows: [[...]] }                   -> { ok, appended }   (reserved for Module 2/3)
 *   upsertRow     { sheetId, tab, keyColumn, row }                  -> { ok, action: inserted|updated, rowNumber }
 *   createCustomer{ seriesSheetId, seriesTab, prefix, digits,
 *                   sheetId, tab, keyColumn, row }                  -> { ok, customerNumber, nextNumber, rowNumber }
 *     One LockService-protected transaction: read series number -> format customer number -> write customer_master
 *     row -> increment series. The series is incremented ONLY after the customer row has been written successfully,
 *     so failed writes never consume a number, and concurrent registrations always receive unique numbers.
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
      case 'upsertRow': return json_(withLock_(function () { return upsertRowUnlocked_(p.sheetId, p.tab, p.keyColumn, p.row || {}); }));
      case 'createCustomer': return json_(createCustomer_(p));
      default: return json_({ ok: false, error: 'Unknown action' });
    }
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

function norm_(s) {
  return String(s).toLowerCase().replace(/\s+/g, '');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
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

// Insert or update one row keyed on `keyColumn`. Header matching is case/whitespace-insensitive. Caller holds the lock.
// createOnly=true makes the operation strictly insert-only: an existing key throws (used by createCustomer).
function upsertRowUnlocked_(sheetId, tab, keyColumn, row, createOnly) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName(tab) || ss.insertSheet(tab);
  var lastCol = sheet.getLastColumn();
  var headers = lastCol ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim(); }) : [];
  if (!headers.length || headers.join('') === '') {
    headers = Object.keys(row);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  var rowByNorm = {};
  Object.keys(row).forEach(function (k) { rowByNorm[norm_(k)] = row[k]; });
  var keyIdx = headers.map(norm_).indexOf(norm_(keyColumn));
  if (keyIdx < 0) throw new Error('Key column not found in header: ' + keyColumn);
  var keyValue = String(rowByNorm[norm_(keyColumn)] || '').trim();
  if (!keyValue) throw new Error('Key value missing for column: ' + keyColumn);
  var lastRow = sheet.getLastRow();
  var targetRow = -1;
  if (lastRow > 1) {
    var keys = sheet.getRange(2, keyIdx + 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < keys.length; i++) {
      if (String(keys[i][0]).trim() === keyValue) { targetRow = i + 2; break; }
    }
  }
  var existing = targetRow > 0 ? sheet.getRange(targetRow, 1, 1, headers.length).getValues()[0] : headers.map(function () { return ''; });
  var values = headers.map(function (h, i) { var n = norm_(h); return rowByNorm.hasOwnProperty(n) ? rowByNorm[n] : existing[i]; });
  if (targetRow > 0) {
    if (createOnly) throw new Error('Customer record already exists for ' + keyColumn + ' ' + keyValue + ' (create-only operation)');
    sheet.getRange(targetRow, 1, 1, headers.length).setNumberFormat('@').setValues([values]);
    return { ok: true, action: 'updated', rowNumber: targetRow };
  }
  // Force plain-text cells so '+91' and leading zeros ('03312345678') are preserved exactly as sent.
  var newRow = sheet.getLastRow() + 1;
  sheet.getRange(newRow, 1, 1, headers.length).setNumberFormat('@').setValues([values]);
  return { ok: true, action: 'inserted', rowNumber: newRow };
}

// Transactional customer creation: series read -> customer_master write -> series increment, under one lock.
function createCustomer_(p) {
  return withLock_(function () {
    var series = SpreadsheetApp.openById(p.seriesSheetId).getSheetByName(p.seriesTab);
    if (!series) throw new Error('Series tab not found: ' + p.seriesTab);
    var headers = series.getRange(1, 1, 1, Math.max(series.getLastColumn(), 2)).getValues()[0].map(norm_);
    var prefixCol = headers.indexOf('prefix') + 1, numberCol = headers.indexOf('number') + 1;
    if (!prefixCol || !numberCol) throw new Error('customer_series_master must have "prefix" and "number" headers');
    var seriesPrefix = String(series.getRange(2, prefixCol).getValue() || p.prefix || '');
    var current = parseInt(series.getRange(2, numberCol).getValue(), 10);
    if (isNaN(current) || current < 1) throw new Error('customer_series_master number is not initialised');
    var padded = String(current), width = parseInt(p.digits, 10) || 6;
    while (padded.length < width) padded = '0' + padded;
    var customerNumber = seriesPrefix + padded;

    var row = {};
    Object.keys(p.row || {}).forEach(function (k) { row[k] = p.row[k]; });
    row[p.keyColumn || 'customer_no'] = customerNumber;
    var result = upsertRowUnlocked_(p.sheetId, p.tab, p.keyColumn || 'customer_no', row, true); // create-only; throws on failure -> no increment

    series.getRange(2, numberCol).setValue(current + 1);
    SpreadsheetApp.flush();
    return { ok: true, customerNumber: customerNumber, nextNumber: current + 1, rowNumber: result.rowNumber };
  });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

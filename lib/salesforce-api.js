'use strict';

/**
 * Salesforce access for Knowledge Article work, using the Chrome session cookie.
 *
 * Reads use SOQL against Appointment__c, Appointment_Comment__c, and Knowledge__kav.
 * The article itself is a REST insert into Knowledge__kav.
 * Related Categories go through the same Apex the Lightning button calls:
 * CaseFeedArticleController.upsertAndDeleteProductTaggings, via the Aura action endpoint.
 * Related_Category__c is not insertable with a direct REST create.
 *
 * The browser session has to already exist in Chrome (Okta / MFA). This module
 * does not log in and does not launch a browser.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const https = require('https');
const { assertApproved } = require('./approval-gate');

const API_HOST = 'workday.my.salesforce.com';
const LIGHTNING_HOST = 'workday.lightning.force.com';
const API_VERSION = 'v62.0';
const KNOWLEDGE_RECORD_TYPE_ID = '0124X000001RZdFQAW';
const APEX_CLASS = 'CaseFeedArticleController';
const APEX_UPSERT_METHOD = 'upsertAndDeleteProductTaggings';

const APPOINTMENT_FIELDS = [
  'Id',
  'Name',
  'RecordTypeName__c',
  'Req_Number__c',
  'Request_Number__c',
  'Subject__c',
  'Special_Instructions__c',
  'Product__c',
  'Sub_Product__c',
  'Product_Line__c',
  'Booking_Status__c',
];

function chromeUserDataDir() {
  return (
    process.env.SF_CHROME_USER_DATA ||
    path.join(os.homedir(), 'Library/Application Support/Google/Chrome')
  );
}

function cookieDatabaseCandidates() {
  const root = chromeUserDataDir();
  const preferred = process.env.SF_CHROME_PROFILE
    ? [process.env.SF_CHROME_PROFILE]
    : ['Profile 1', 'Default'];
  return preferred.map((profile) => path.join(root, profile, 'Cookies'));
}

function chromeSafeStoragePassword() {
  return execFileSync(
    'security',
    ['find-generic-password', '-w', '-s', 'Chrome Safe Storage', '-a', 'Chrome'],
    { encoding: 'utf8' }
  ).trim();
}

function chromeAesKey() {
  return crypto.pbkdf2Sync(chromeSafeStoragePassword(), 'saltysalt', 1003, 16, 'sha1');
}

function unpadPkcs7(buffer) {
  if (!buffer.length) throw new Error('Empty cookie plaintext');
  const pad = buffer[buffer.length - 1];
  if (pad < 1 || pad > 16) throw new Error('Cookie plaintext padding is invalid');
  const tail = buffer.subarray(buffer.length - pad);
  for (const byte of tail) {
    if (byte !== pad) throw new Error('Cookie plaintext padding is invalid');
  }
  return buffer.subarray(0, buffer.length - pad);
}

function decryptChromeValue(encrypted, key) {
  if (!encrypted || encrypted.length < 4 || encrypted.subarray(0, 3).toString() !== 'v10') {
    throw new Error('Cookie value is not Chrome v10 ciphertext');
  }
  const decipher = crypto.createDecipheriv('aes-128-cbc', key, Buffer.alloc(16, 0x20));
  decipher.setAutoPadding(false);
  return unpadPkcs7(Buffer.concat([decipher.update(encrypted.subarray(3)), decipher.final()]));
}

function stripHostPrefix(plain, host) {
  const digest = crypto.createHash('sha256').update(host).digest();
  if (plain.length > 32 && plain.subarray(0, 32).equals(digest)) {
    return plain.subarray(32).toString('utf8');
  }
  return plain.toString('utf8');
}

function readEncryptedCookie(host, name) {
  const sql =
    'SELECT hex(encrypted_value) FROM cookies WHERE host_key = ' +
    `'${host.replace(/'/g, "''")}' AND name = '${name.replace(/'/g, "''")}' LIMIT 1;`;
  for (const db of cookieDatabaseCandidates()) {
    if (!fs.existsSync(db)) continue;
    const uri = `file:${db}?immutable=1`;
    let hex = '';
    try {
      hex = execFileSync('sqlite3', ['-readonly', uri, sql], { encoding: 'utf8' }).trim();
    } catch (error) {
      if (error.status === 0 || !error.stderr) throw error;
      continue;
    }
    if (hex) return Buffer.from(hex, 'hex');
  }
  return null;
}

function loadSid(host) {
  const encrypted = readEncryptedCookie(host, 'sid');
  if (!encrypted) {
    throw new Error(
      `No sid cookie for ${host}. Log into Salesforce in Chrome, then retry.`
    );
  }
  const value = stripHostPrefix(decryptChromeValue(encrypted, chromeAesKey()), host);
  if (!value.startsWith('00D')) {
    throw new Error(`Decrypted sid for ${host} is not a Salesforce session id.`);
  }
  return value;
}

function escapeSoql(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function parseRecordRef(input) {
  const text = String(input || '').trim();
  const fromUrl = text.match(/\/lightning\/r\/Appointment__c\/([a-zA-Z0-9]{15,18})/);
  if (fromUrl) return { kind: 'id', id: fromUrl[1] };
  if (/^REQ-\d+$/i.test(text)) return { kind: 'req', req: text.toUpperCase() };
  if (/^[a-zA-Z0-9]{15,18}$/.test(text)) return { kind: 'id', id: text };
  const req = text.match(/REQ-\d+/i);
  if (req) return { kind: 'req', req: req[0].toUpperCase() };
  throw new Error('Pass an Appointment Id, a REQ number, or an Appointment URL');
}

function htmlToText(html) {
  return String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function articleUrl(id) {
  return `https://${LIGHTNING_HOST}/lightning/r/Knowledge__kav/${id}/view`;
}

function appointmentUrl(id) {
  return `https://${LIGHTNING_HOST}/lightning/r/Appointment__c/${id}/view`;
}

function request(host, { method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        host,
        method,
        path,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function api(method, urlPath, body) {
  const sid = loadSid(API_HOST);
  const payload = body == null ? null : JSON.stringify(body);
  const response = await request(API_HOST, {
    method,
    path: urlPath,
    body: payload,
    headers: {
      Authorization: `Bearer ${sid}`,
      Accept: 'application/json',
      ...(payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {}),
    },
  });
  let parsed = response.body;
  try {
    parsed = response.body ? JSON.parse(response.body) : null;
  } catch (error) {
    parsed = response.body;
  }
  if (response.status >= 400) {
    const message = typeof parsed === 'string' ? parsed.slice(0, 500) : JSON.stringify(parsed).slice(0, 800);
    const err = new Error(`Salesforce ${method} ${urlPath} failed (${response.status}): ${message}`);
    err.status = response.status;
    err.body = parsed;
    throw err;
  }
  return parsed;
}

function soql(query) {
  return api('GET', `/services/data/${API_VERSION}/query?q=${encodeURIComponent(query)}`);
}

function stripAttributes(row) {
  if (!row || typeof row !== 'object') return row;
  const copy = { ...row };
  delete copy.attributes;
  return copy;
}

async function readAppointment(input) {
  const ref = parseRecordRef(input);
  let id = ref.id;
  if (ref.kind === 'req') {
    const found = await soql(
      `SELECT Id, Name, Req_Number__c FROM Appointment__c WHERE Req_Number__c = '${escapeSoql(ref.req)}' LIMIT 2`
    );
    if (!found.totalSize) throw new Error(`No Appointment__c for ${ref.req}`);
    if (found.totalSize > 1) throw new Error(`More than one Appointment__c for ${ref.req}`);
    id = found.records[0].Id;
  }

  const appointmentResult = await soql(
    `SELECT ${APPOINTMENT_FIELDS.join(', ')} FROM Appointment__c WHERE Id = '${escapeSoql(id)}'`
  );
  if (!appointmentResult.totalSize) throw new Error(`Appointment ${id} was not found`);
  const appointment = stripAttributes(appointmentResult.records[0]);

  const notesResult = await soql(
    'SELECT Id, Name, CreatedDate, Comment__c, Is_Private__c ' +
      `FROM Appointment_Comment__c WHERE Appointment__c = '${escapeSoql(id)}' ORDER BY CreatedDate ASC`
  );
  const publicNotes = [];
  let privateNoteCount = 0;
  for (const row of notesResult.records || []) {
    if (row.Is_Private__c) {
      privateNoteCount += 1;
      continue;
    }
    publicNotes.push({
      id: row.Id,
      name: row.Name,
      createdDate: row.CreatedDate,
      html: row.Comment__c || '',
      text: htmlToText(row.Comment__c),
    });
  }

  return {
    appointment: {
      ...appointment,
      detailsText: htmlToText(appointment.Special_Instructions__c),
      url: appointmentUrl(appointment.Id),
    },
    publicNotes,
    privateNoteCount,
  };
}

async function searchKnowledge({ titleLikes = [], phrases = [], publishStatus = 'Online' } = {}) {
  const likes = titleLikes.filter(Boolean).slice(0, 8);
  let titleHits = [];
  if (likes.length) {
    const clauses = likes
      .map((term) => `Title LIKE '%${escapeSoql(term).replace(/%/g, '\\%')}%'`)
      .join(' OR ');
    const result = await soql(
      'SELECT Id, Title, ArticleNumber, PublishStatus, UrlName, KnowledgeArticleId ' +
        'FROM Knowledge__kav ' +
        `WHERE IsLatestVersion = true AND Language = 'en_US' AND PublishStatus = '${escapeSoql(publishStatus)}' ` +
        `AND (${clauses}) ORDER BY LastModifiedDate DESC LIMIT 25`
    );
    titleHits = (result.records || []).map((row) => ({
      ...stripAttributes(row),
      url: articleUrl(row.Id),
    }));
  }

  const phraseHits = [];
  for (const phrase of phrases.filter(Boolean).slice(0, 4)) {
    const sosl =
      `FIND {${phrase}} IN ALL FIELDS RETURNING Knowledge__kav ` +
      `(Id, Title, ArticleNumber, PublishStatus, UrlName WHERE IsLatestVersion = true AND Language = 'en_US' LIMIT 15)`;
    try {
      const result = await api('GET', `/services/data/${API_VERSION}/search?q=${encodeURIComponent(sosl)}`);
      for (const row of result.searchRecords || []) {
        phraseHits.push({ ...stripAttributes(row), url: articleUrl(row.Id), phrase });
      }
    } catch (error) {
      phraseHits.push({ phrase, error: error.message });
    }
  }
  return { titleHits, phraseHits };
}

function buildArticleRecord(article) {
  if (!article.title || !article.urlName) throw new Error('title and urlName are required');
  return {
    RecordTypeId: article.recordTypeId || KNOWLEDGE_RECORD_TYPE_ID,
    Language: article.language || 'en_US',
    Title: article.title,
    UrlName: article.urlName,
    Description__c: article.descriptionHtml || '',
    Resolution__c: article.resolutionHtml || '',
    InternalNotes__c: article.internalNotesHtml || '',
    Type__c: article.caseType || 'WSP',
    Target_WSP_Service__c: article.targetWspService || 'Ask an Expert',
    Internal_Audience_Only__c: article.internalAudienceOnly !== false,
  };
}

async function createKnowledgeDraft(reqId, article) {
  assertApproved(reqId);
  const created = await api('POST', `/services/data/${API_VERSION}/sobjects/Knowledge__kav`, buildArticleRecord(article));
  if (!created || !created.success || !created.id) {
    throw new Error(`Knowledge__kav create did not return an id: ${JSON.stringify(created).slice(0, 400)}`);
  }
  const verified = await soql(
    'SELECT Id, ArticleNumber, Title, UrlName, PublishStatus, Language, Type__c, Target_WSP_Service__c, Internal_Audience_Only__c ' +
      `FROM Knowledge__kav WHERE Id = '${escapeSoql(created.id)}'`
  );
  const row = stripAttributes(verified.records[0]);
  return { ...row, url: articleUrl(row.Id) };
}

function parseEricSetCookie(setCookieHeaders) {
  const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const header of list) {
    if (!header) continue;
    const first = String(header).split(';')[0];
    const eq = first.indexOf('=');
    if (eq < 1) continue;
    const name = first.slice(0, eq).trim();
    if (name.startsWith('__Host-ERIC')) {
      return { name, value: first.slice(eq + 1) };
    }
  }
  return null;
}

function parseAuraFramework(html) {
  const source = String(html);
  const encoded = source.match(/\/l\/(%7B.*?%7D)\//);
  const decoded = encoded ? decodeURIComponent(encoded[1]) : source;
  const fwuid = (decoded.match(/"fwuid":"([^"]+)"/) || [])[1];
  const loaded = (decoded.match(/"APPLICATION@markup:\/\/one:one":"([^"]+)"/) || [])[1] || '';
  if (!fwuid) throw new Error('Lightning page did not include an Aura fwuid');
  return { fwuid, loaded };
}

function parseAuraBody(text) {
  let raw = String(text || '').trim();
  if (raw.startsWith('*/')) raw = raw.slice(2);
  if (raw.endsWith('/*ERROR*/')) raw = raw.slice(0, -'/*ERROR*/'.length);
  return JSON.parse(raw);
}

function buildCategoryRecord(articleId, sample) {
  const capabilityId = sample.Product_Capability_Id__c || '';
  return {
    sobjectType: 'Related_Category__c',
    Id: null,
    Knowledge__c: articleId,
    Product_Line__c: sample.Product_Line__c,
    Product_Area__c: sample.Product_Area__c,
    Product_Area_Id__c: sample.Product_Area_Id__c,
    Product_Capability__c: sample.Product_Capability__c || '',
    Product_Capability_Id__c: capabilityId,
    Case_Type__c: sample.Case_Type__c || 'WSP',
    Category__c:
      sample.Category__c ||
      (capabilityId ? 'Product Area and Product Capability' : 'Product Area'),
  };
}

async function apexExecute(pagePath, method, params) {
  const sid = loadSid(LIGHTNING_HOST);
  const page = await request(LIGHTNING_HOST, {
    method: 'GET',
    path: pagePath,
    headers: {
      Cookie: `sid=${sid}`,
      Accept: 'text/html',
      'User-Agent': 'Mozilla/5.0',
    },
  });
  if (page.status >= 400) {
    throw new Error(`Lightning page ${pagePath} returned ${page.status}`);
  }
  const eric = parseEricSetCookie(page.headers['set-cookie']);
  if (!eric) throw new Error('Lightning response did not set an ERIC cookie');
  const framework = parseAuraFramework(page.body);
  const message = {
    actions: [
      {
        id: '1;a',
        descriptor: 'aura://ApexActionController/ACTION$execute',
        callingDescriptor: 'UNKNOWN',
        params: {
          namespace: '',
          classname: APEX_CLASS,
          method,
          params,
          cacheable: false,
          isContinuation: false,
        },
      },
    ],
  };
  const form = new URLSearchParams({
    message: JSON.stringify(message),
    'aura.context': JSON.stringify({
      mode: 'PROD',
      fwuid: framework.fwuid,
      app: 'one:one',
      loaded: { 'APPLICATION@markup://one:one': framework.loaded },
      dn: [],
      globals: {},
      uad: true,
    }),
    'aura.pageURI': pagePath,
    'aura.token': eric.value,
  }).toString();
  const aura = await request(LIGHTNING_HOST, {
    method: 'POST',
    path: '/aura?r=1&aura.ApexAction.execute=1',
    body: form,
    headers: {
      Cookie: `sid=${sid}; ${eric.name}=${eric.value}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      Accept: '*/*',
      Origin: `https://${LIGHTNING_HOST}`,
      Referer: `https://${LIGHTNING_HOST}${pagePath}`,
      'Content-Length': Buffer.byteLength(form),
      'User-Agent': 'Mozilla/5.0',
    },
  });
  const parsed = parseAuraBody(aura.body);
  const action = (parsed.actions && parsed.actions[0]) || {};
  if (action.state !== 'SUCCESS') {
    throw new Error(
      `Apex ${APEX_CLASS}.${method} ${action.state || aura.status}: ${JSON.stringify(action.error || parsed.event || {}).slice(0, 600)}`
    );
  }
  return action.returnValue;
}

async function setRelatedCategories(reqId, articleId, categories) {
  assertApproved(reqId);
  const productLine = categories.productLine;
  const productArea = categories.productArea;
  const productCapability = categories.productCapability || '';
  if (!productLine || !productArea) {
    throw new Error('productLine and productArea are required');
  }
  const capabilityClause = productCapability
    ? `AND Product_Capability__c = '${escapeSoql(productCapability)}'`
    : 'AND (Product_Capability__c = null OR Product_Capability__c = \'\')';
  const where =
    `Product_Line__c = '${escapeSoql(productLine)}' ` +
    `AND Product_Area__c = '${escapeSoql(productArea)}' ${capabilityClause}`;

  const existing = await soql(
    'SELECT Id, Product_Line__c, Product_Area__c, Product_Capability__c ' +
      `FROM Related_Category__c WHERE Knowledge__c = '${escapeSoql(articleId)}' AND ${where} LIMIT 1`
  );
  if (existing.totalSize) {
    return { skipped: true, id: existing.records[0].Id, url: articleUrl(articleId) };
  }

  const sampleResult = await soql(
    'SELECT Product_Line__c, Product_Area__c, Product_Area_Id__c, Product_Capability__c, ' +
      `Product_Capability_Id__c, Case_Type__c, Category__c FROM Related_Category__c WHERE ${where} LIMIT 1`
  );
  if (!sampleResult.totalSize) {
    throw new Error(
      `No Related_Category__c row uses ${productLine} / ${productArea} / ${productCapability || '(no capability)'}. ` +
        'The ids behind those labels are not known yet.'
    );
  }
  const record = buildCategoryRecord(articleId, stripAttributes(sampleResult.records[0]));
  await apexExecute(
    `/lightning/r/Knowledge__kav/${articleId}/view`,
    APEX_UPSERT_METHOD,
    { productTaggings: [record], productTaggingsToDelete: [] }
  );
  const saved = await soql(
    'SELECT Id, Product_Line__c, Product_Area__c, Product_Capability__c, Case_Type__c, Category__c ' +
      `FROM Related_Category__c WHERE Knowledge__c = '${escapeSoql(articleId)}' AND ${where} LIMIT 1`
  );
  if (!saved.totalSize) throw new Error('Apex returned success but the Related Category row is missing');
  return { ...stripAttributes(saved.records[0]), url: articleUrl(articleId) };
}

module.exports = {
  API_HOST,
  LIGHTNING_HOST,
  API_VERSION,
  KNOWLEDGE_RECORD_TYPE_ID,
  APEX_CLASS,
  APEX_UPSERT_METHOD,
  APPOINTMENT_FIELDS,
  unpadPkcs7,
  stripHostPrefix,
  escapeSoql,
  parseRecordRef,
  htmlToText,
  articleUrl,
  appointmentUrl,
  parseEricSetCookie,
  parseAuraFramework,
  parseAuraBody,
  buildArticleRecord,
  buildCategoryRecord,
  loadSid,
  soql,
  readAppointment,
  searchKnowledge,
  createKnowledgeDraft,
  setRelatedCategories,
};

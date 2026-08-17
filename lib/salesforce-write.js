'use strict';

const { assertApproved } = require('./approval-gate');
const { getMcpFillScript: getFillScriptInner } = require('./fill-related-categories');
const {
  getMcpSetRichTextScript: getRichTextScriptInner,
} = require('./set-rich-text-fields');
const {
  getMcpCreateArticleScript: getCreateArticleScriptInner,
} = require('./create-knowledge-article');

/**
 * All Salesforce write helpers require an approved REQ id.
 * Passing reqId enforces the review gate at script-generation time (Node).
 */
function getMcpFillScript(reqId) {
  assertApproved(reqId);
  return getFillScriptInner();
}

function getMcpSetRichTextScript(reqId) {
  assertApproved(reqId);
  return getRichTextScriptInner();
}

function getMcpCreateArticleScript(reqId) {
  assertApproved(reqId);
  return getCreateArticleScriptInner();
}

/**
 * Throws if the agent attempts Step 5 browser actions without approval.
 * Call at the start of any inline browser_run_code_unsafe that writes to Salesforce.
 */
function assertSalesforceWriteAllowed(reqId, action = 'Salesforce write') {
  assertApproved(reqId);
  return `${action} allowed for ${reqId}`;
}

module.exports = {
  assertSalesforceWriteAllowed,
  getMcpFillScript,
  getMcpSetRichTextScript,
  getMcpCreateArticleScript,
};

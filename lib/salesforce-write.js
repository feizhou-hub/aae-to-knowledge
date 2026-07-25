'use strict';

const { assertApproved } = require('./approval-gate');
const { getMcpFillScript: getFillScriptInner } = require('./fill-related-categories');
const {
  getMcpSetRichTextScript: getRichTextScriptInner,
} = require('./set-rich-text-fields');

function getMcpFillScript(reqId) {
  assertApproved(reqId);
  return getFillScriptInner();
}

function getMcpSetRichTextScript(reqId) {
  assertApproved(reqId);
  return getRichTextScriptInner();
}

function assertSalesforceWriteAllowed(reqId, action = 'Salesforce write') {
  assertApproved(reqId);
  return `${action} allowed for ${reqId}`;
}

module.exports = {
  assertSalesforceWriteAllowed,
  getMcpFillScript,
  getMcpSetRichTextScript,
};

'use strict';

const approvalGate = require('./approval-gate');
const salesforceWrite = require('./salesforce-write');
const salesforceSearch = require('./salesforce-search');
const salesforceRead = require('./salesforce-read');
const { resolveCategories } = require('./category-resolver');
const { getMcpExtractScript } = require('./extract-matrix');
const { inlineMd, mdToHtml, mermaidFlowchartToHtml } = require('./md-to-ka-html');
const productCategoryMatrix = require('./product-category-matrix.json');

module.exports = {
  ...approvalGate,
  ...salesforceWrite,
  ...salesforceSearch,
  ...salesforceRead,
  resolveCategories,
  getMcpExtractScript,
  productCategoryMatrix,
  inlineMd,
  mdToHtml,
  mermaidFlowchartToHtml,
};

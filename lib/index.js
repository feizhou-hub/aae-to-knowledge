'use strict';

const approvalGate = require('./approval-gate');
const salesforceWrite = require('./salesforce-write');
const salesforceSearch = require('./salesforce-search');
const { resolveCategories } = require('./category-resolver');
const { getMcpExtractScript } = require('./extract-matrix');
const productCategoryMatrix = require('./product-category-matrix.json');

module.exports = {
  ...approvalGate,
  ...salesforceWrite,
  ...salesforceSearch,
  resolveCategories,
  getMcpExtractScript,
  productCategoryMatrix,
};

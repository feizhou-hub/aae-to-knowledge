'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { pickClosestOption } = require('../lib/picklist-match');
const { resolveCategories } = require('../lib/category-resolver');
const { getMcpFillScript } = require('../lib/fill-related-categories');
const matrix = require('../lib/product-category-matrix.json');

const LIVE_PPE_AREAS = [
  'Adoption',
  'Integration Management',
  'Orchestrate for Integrations - HCM',
  'Security - Absence',
  'Security - Integrations',
  'Security - Learning',
  'Workday Studio - HCM',
];

const LIVE_SECURITY_INTEGRATIONS_CAPS = [
  'Basic Security Groups',
  'Business Process Security Policies',
  'Domain Security Policies',
  'General',
  'Roles',
  'Tenant Configuration',
];

describe('pickClosestOption', () => {
  it('returns an exact live picklist value immediately', () => {
    assert.equal(
      pickClosestOption('Security - Integrations', LIVE_PPE_AREAS),
      'Security - Integrations'
    );
  });

  it('maps stale Authentication to Security - Integrations instead of waiting on a missing option', () => {
    assert.equal(
      pickClosestOption('Authentication', LIVE_PPE_AREAS),
      'Security - Integrations'
    );
  });

  it('maps Authentication Policies to Tenant Configuration, then General', () => {
    assert.equal(
      pickClosestOption('Authentication Policies', LIVE_SECURITY_INTEGRATIONS_CAPS),
      'Tenant Configuration'
    );
    assert.equal(
      pickClosestOption('Authentication Policies', ['General', 'Roles']),
      'General'
    );
  });

  it('uses an extra fallback when the preferred label is absent', () => {
    assert.equal(
      pickClosestOption('Missing Capability', LIVE_SECURITY_INTEGRATIONS_CAPS, ['General']),
      'General'
    );
  });

  it('returns null when nothing matches so the script can throw with live options', () => {
    assert.equal(pickClosestOption('Authentication', ['Adoption', 'Drive']), null);
  });
});

describe('resolveCategories Authentication', () => {
  it('resolves appointment Authentication / Authentication Policies to live Related Categories values', () => {
    assert.deepEqual(
      resolveCategories('Authentication', 'Authentication Policies', matrix),
      {
        productLine: 'Platform and Product Extensions',
        productArea: 'Security - Integrations',
        productCapability: 'Tenant Configuration',
      }
    );
  });
});

describe('getMcpFillScript live picklist fallback', () => {
  it('selects from the open dropdown after a short exact wait instead of an 8s miss', () => {
    const script = getMcpFillScript();
    assert.match(script, /selectComboOption/);
    assert.match(script, /timeout: 1200/);
    assert.match(script, /pickClosestOption/);
    assert.doesNotMatch(
      script,
      /option', \{ name: categories\.productArea, exact: true \}\), 8000\)/
    );
    assert.doesNotMatch(
      script,
      /option', \{ name: categories\.productCapability, exact: true \}\), 8000\)/
    );
  });
});

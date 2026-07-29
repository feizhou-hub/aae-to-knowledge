'use strict';

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function fuzzyFind(key, candidates) {
  const needle = normalize(key);
  if (!needle) return null;

  const exact = candidates.find((candidate) => normalize(candidate) === needle);
  if (exact) return exact;

  const contains = candidates.find((candidate) => {
    const hay = normalize(candidate);
    return hay.includes(needle) || needle.includes(hay);
  });
  if (contains) return contains;

  let best = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const hay = normalize(candidate);
    const words = needle.split(' ').filter(Boolean);
    const score = words.filter((word) => hay.includes(word)).length;
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  return bestScore > 0 ? best : null;
}

function findLineForArea(matrix, areaName) {
  for (const [line, areas] of Object.entries(matrix)) {
    if (areas[areaName] !== undefined) return line;
  }
  return null;
}

function resolveCapability(capability, areaCapabilities, mappings) {
  if (!capability) return null;
  if (mappings.capability[capability]) return mappings.capability[capability];
  if (areaCapabilities.includes(capability)) return capability;
  return fuzzyFind(capability, areaCapabilities);
}

function resolveCategories(appointmentProductArea, appointmentCapability, data) {
  const matrix = data.matrix || data;
  const mappings = data.appointmentMappings || { productArea: {}, capability: {} };

  let productLine = null;
  let productArea = null;
  let productCapability = null;

  const areaMapping = mappings.productArea[appointmentProductArea];
  if (areaMapping) {
    productLine = areaMapping.productLine;
    productArea = areaMapping.productArea;
  } else if (findLineForArea(matrix, appointmentProductArea)) {
    productLine = findLineForArea(matrix, appointmentProductArea);
    productArea = appointmentProductArea;
  } else if (normalize(appointmentProductArea).includes('planning')) {
    productLine = 'Adaptive Planning';
    productArea = fuzzyFind(
      appointmentProductArea,
      Object.keys(matrix['Adaptive Planning'] || {})
    );
  } else if (normalize(appointmentProductArea).includes('human capital')) {
    productLine = 'Human Capital Management';
    productArea = fuzzyFind(
      appointmentProductArea,
      Object.keys(matrix['Human Capital Management'] || {})
    );
  } else {
    productLine = fuzzyFind(appointmentProductArea, Object.keys(matrix));
    if (productLine) {
      productArea = fuzzyFind(
        appointmentProductArea,
        Object.keys(matrix[productLine] || {})
      );
    }
  }

  if (!productLine || !productArea) {
    return { productLine, productArea, productCapability: null };
  }

  const areaCapabilities = matrix[productLine]?.[productArea] || [];
  productCapability = resolveCapability(
    appointmentCapability,
    areaCapabilities,
    mappings
  );

  // When the matrix has no capability list, use the appointment capability name
  // so Related Categories always has Product Line + Area + Capability.
  if (!productCapability && appointmentCapability) {
    productCapability = appointmentCapability;
  }

  if (
    appointmentProductArea === 'Integration Management' &&
    !productCapability
  ) {
    productCapability = 'SOAP';
  }

  return { productLine, productArea, productCapability };
}

module.exports = {
  resolveCategories,
  normalize,
  fuzzyFind,
  findLineForArea,
};

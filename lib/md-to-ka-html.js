'use strict';

/**
 * Convert KA draft markdown sections to Salesforce TinyMCE HTML.
 * Auto-converts fenced Mermaid flowcharts (TD/LR) to HTML table rails.
 */

function inlineMd(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}

function parseMermaidFlowchart(source) {
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('%%'));

  const header = lines.find((l) => /^flowchart\s+(TD|LR|TB|BT|RL)/i.test(l));
  if (!header) return null;

  const nodeRe = /^(\w+)\s*(\[[^\]]+\]|\{[^}]+\}|\([^)]+\))/;
  const edgeRe = /^(\w+)\s*-->(?:\|([^|]+)\|)?\s*(\w+)/;

  const nodes = new Map();
  const edges = [];

  for (const line of lines) {
    const nodeMatch = line.match(nodeRe);
    if (nodeMatch) {
      const id = nodeMatch[1];
      const raw = nodeMatch[2];
      const isDecision = raw.startsWith('{');
      const label = raw.slice(1, -1).replace(/^["']|["']$/g, '');
      nodes.set(id, { id, label, isDecision });
      continue;
    }
    const edgeMatch = line.match(edgeRe);
    if (edgeMatch) {
      edges.push({ from: edgeMatch[1], label: edgeMatch[2]?.trim() || null, to: edgeMatch[3] });
    }
  }

  if (!nodes.size || !edges.length) return null;
  return { nodes, edges };
}

function mermaidFlowchartToHtml(source) {
  const parsed = parseMermaidFlowchart(source);
  if (!parsed) return null;

  const { nodes, edges } = parsed;
  const children = new Map();
  for (const e of edges) {
    if (!children.has(e.from)) children.set(e.from, []);
    children.get(e.from).push(e);
  }

  const roots = [...nodes.keys()].filter((id) => !edges.some((e) => e.to === id));
  const startId = roots[0] || edges[0].from;
  const startNode = nodes.get(startId);
  if (!startNode) return null;

  const rows = [];
  if (startNode.isDecision) {
    rows.push(
      `<tr><td colspan="3" style="background-color: #f3f3f3; font-style: italic; border: 1px solid #d8dde6; padding: 8px;">${inlineMd(startNode.label)}</td></tr>`
    );
  } else {
    rows.push(
      `<tr><td colspan="3" style="background-color: #f3f3f3; font-weight: 700; border: 1px solid #d8dde6; padding: 8px;">${inlineMd(startNode.label)}</td></tr>`
    );
  }

  const branchEdges = children.get(startId) || [];
  for (const edge of branchEdges) {
    const target = nodes.get(edge.to);
    if (!target) continue;
    const branchLabel = edge.label ? `<em>${inlineMd(edge.label)}</em> — ` : '';
    const action = target.isDecision
      ? `<em>${inlineMd(target.label)}</em>`
      : `${branchLabel}${inlineMd(target.label)}`;
    const firstCol = edge.label
      ? `<strong>${inlineMd(edge.label)}</strong>`
      : `<strong>${inlineMd(target.label.split(' ').slice(0, 3).join(' '))}</strong>`;

    rows.push(`<tr>
      <td style="border: 1px solid #d8dde6; width: 28%; vertical-align: top; padding: 8px;">${edge.label ? firstCol : `<strong>${inlineMd(target.label)}</strong>`}</td>
      <td style="border: 1px solid #d8dde6; width: 8%; text-align: center; padding: 8px;">→</td>
      <td style="border: 1px solid #d8dde6; padding: 8px; vertical-align: top;">${edge.label ? inlineMd(target.label) : action}</td>
    </tr>`);
  }

  return `<table style="border-collapse: collapse; width: 100%; margin-top: 16px; margin-bottom: 16px;" border="1" cellpadding="8" cellspacing="0"><tbody>
${rows.join('\n')}
</tbody></table>`;
}

const TABLE_BASE_STYLE =
  'border-collapse: collapse; width: 100%; border: 1px solid #d8dde6; margin-bottom: 16px;';

function needsSpacingBeforeBlock(out) {
  const prev = out[out.length - 1];
  return prev && (prev.startsWith('<p>') || prev.startsWith('<blockquote>'));
}

function withTableTopSpacing(out, tableHtml) {
  if (!needsSpacingBeforeBlock(out)) return tableHtml;
  out.push('<p><br></p>');
  if (/style="/i.test(tableHtml)) {
    return tableHtml.replace(/style="([^"]*)"/i, (match, styles) => {
      if (/margin-top\s*:/i.test(styles)) return match;
      const base = styles.replace(/;\s*$/, '');
      return `style="${base}; margin-top: 16px;"`;
    });
  }
  return tableHtml.replace('<table ', `<table style="margin-top: 16px;" `);
}

function withTableBottomSpacing(out, lines, i) {
  let j = i;
  while (j < lines.length && !lines[j].trim()) j++;
  if (j >= lines.length) return;
  if (lines[j].startsWith('|')) return;
  out.push('<p>&nbsp;</p>');
}

function mdToHtml(md) {
  const lines = md.split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith('```mermaid')) {
      const block = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        block.push(lines[i]);
        i++;
      }
      if (lines[i]?.startsWith('```')) i++;
      const converted = mermaidFlowchartToHtml(block.join('\n'));
      if (converted) {
        out.push(withTableTopSpacing(out, converted));
        withTableBottomSpacing(out, lines, i);
      } else {
        out.push(
          `<pre style="background:#f3f3f3;padding:12px;border:1px solid #d8dde6;white-space:pre-wrap;">${inlineMd(block.join('\n'))}</pre>`
        );
        out.push(
          '<p><em>Diagram requires manual HTML conversion — see uml-diagrams.md</em></p>'
        );
      }
      continue;
    }
    if (line.startsWith('### ')) {
      out.push(`<h3>${inlineMd(line.slice(4).trim())}</h3>`);
      i++;
      continue;
    }
    if (line.startsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((r) => !/^\|[\s\-:|]+\|$/.test(r));
      if (rows.length) {
        const cells = rows.map((r) => r.split('|').slice(1, -1).map((c) => c.trim()));
        let html =
          `<table style="${TABLE_BASE_STYLE}" border="1" cellpadding="6" cellspacing="0"><thead><tr>`;
        cells[0].forEach((h) => {
          html += `<th style="background-color: #f3f3f3; text-align: left; border: 1px solid #d8dde6; padding: 8px;">${inlineMd(h)}</th>`;
        });
        html += '</tr></thead><tbody>';
        for (const row of cells.slice(1)) {
          html += '<tr>';
          row.forEach((c) => {
            html += `<td style="border: 1px solid #d8dde6; padding: 8px; vertical-align: top;">${inlineMd(c)}</td>`;
          });
          html += '</tr>';
        }
        html += '</tbody></table>';
        out.push(withTableTopSpacing(out, html));
        withTableBottomSpacing(out, lines, i);
      }
      continue;
    }
    if (line.startsWith('> ')) {
      const quote = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quote.push(lines[i].slice(2));
        i++;
      }
      out.push(`<blockquote><p>${inlineMd(quote.join(' '))}</p></blockquote>`);
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      out.push(`<ol>${items.map((it) => `<li>${inlineMd(it)}</li>`).join('')}</ol>`);
      continue;
    }
    if (line.startsWith('- ')) {
      const items = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2));
        i++;
      }
      out.push(`<ul>${items.map((it) => `<li>${inlineMd(it)}</li>`).join('')}</ul>`);
      continue;
    }
    if (/^\*Use when .+\*$/.test(line) && !line.startsWith('**')) {
      const inner = line.slice(1, -1);
      out.push(
        `<p style="margin: 0 0 12px; font-style: italic; color: #706e6b; font-size: 13px;">${inlineMd(inner)}</p>`
      );
      i++;
      continue;
    }
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('|') &&
      !lines[i].startsWith('- ') &&
      !lines[i].startsWith('> ') &&
      !lines[i].startsWith('```') &&
      !/^\d+\.\s/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    out.push(`<p>${inlineMd(para.join(' '))}</p>`);
  }
  return insertInternalNotesSourceSpacer(out.join('\n'));
}

function insertInternalNotesSourceSpacer(html) {
  return html.replace(
    /(<p>Sourced from AAE request[\s\S]*?<\/p>)\n(?!<p>&nbsp;<\/p>)/i,
    '$1\n<p>&nbsp;</p>\n'
  );
}

module.exports = { inlineMd, mdToHtml, mermaidFlowchartToHtml, parseMermaidFlowchart };

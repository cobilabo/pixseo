/**
 * the-ayumi.jp flat tenant SEO/a11y patches
 * node scripts/patch-flat-seo-a11y.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
require('dotenv').config();
const admin = require('firebase-admin');

const DRY_RUN = process.argv.includes('--dry-run');
const CSS_PATCH_MARKER = '/* pixseo-seo-a11y-patch */';
const CSS_PATCH = `
${CSS_PATCH_MARKER}
.site-header .header-logo img,
.header-logo img {
  height: 40px;
  width: auto;
  max-width: min(200px, 40vw);
  object-fit: contain;
  object-position: left center;
}
.accent-image img {
  width: 200px;
  max-width: 100%;
  height: auto;
}
.barrier-list-wrap {
  position: relative;
  margin: 30px 0;
}
.barrier-list-wrap .barrier-list {
  margin: 0;
}
.barrier-list-wrap .barrier-image {
  position: absolute;
  bottom: 0;
  right: 0;
  width: auto;
  height: auto;
  max-width: 200px;
  max-height: 200px;
  z-index: 1;
  pointer-events: none;
}
`;

const SVG_ARROW = '<svg class="icon-arrow" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.025 1l-2.847 2.828 6.176 6.176h-16.354v3.992h16.354l-6.176 6.176 2.847 2.828 10.975-11z"/></svg>';
const SVG_HEART = '<svg class="icon-heart" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

function patchHtml(html) {
  const changes = [];
  let h = html;
  if (h.includes('<h3 class="section-title"')) {
    h = h.replace(/<h3 class="section-title"/g, '<h2 class="section-title"');
    changes.push('section-title h3 to h2');
  }
  const barrierImgInUl = /<ul class="barrier-list">([\s\S]*?)<img([^>]*class="barrier-image"[^>]*)>\s*<\/ul>/;
  if (barrierImgInUl.test(h)) {
    h = h.replace(barrierImgInUl, '<div class="barrier-list-wrap"><ul class="barrier-list">$1</ul><img$2></div>');
    changes.push('barrier-list fix');
  }
  if (h.includes('accent-e1706701509890') && h.includes('width="100"')) {
    h = h.replace(/(accent-e1706701509890[^>]*?)width="100"\s*height="80"/, '$1width="200" height="160"');
    changes.push('accent 200x160');
  }
  if (h.includes('header-logo')) {
    const before = h;
    h = h.replace(/(<div class="header-logo">[\s\S]*?<img\s[^>]*?)\s*width="\d+"\s*height="\d+"([^>]*>)/g, '$1$2');
    if (h !== before) changes.push('header logo');
  }
  if (h.includes('<i class="fas fa-arrow-right"')) {
    h = h.replace(/<i class="fas fa-arrow-right"><\/i>/g, SVG_ARROW);
    changes.push('fa to svg');
  }
  if (h.includes('<i class="fas fa-heart"')) {
    h = h.replace(/<i class="fas fa-heart"><\/i>/g, SVG_HEART);
    changes.push('fa heart to svg');
  }
  h = h.replace(/<img([^>]*class="barrier-image"[^>]*)>/g, (m, attrs) => {
    if (attrs.includes('loading=')) return m;
    changes.push('barrier lazy');
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
  h = h.replace(/<img([^>]*accent-e1706701509890[^>]*)>/g, (m, attrs) => {
    if (attrs.includes('loading=')) return m;
    changes.push('accent lazy');
    return `<img${attrs} loading="lazy" decoding="async">`;
  });
  return { html: h, changes: [...new Set(changes)] };
}

function patchCss(css) {
  if (css.includes(CSS_PATCH_MARKER)) return { css, changed: false };
  return { css: css.trimEnd() + '\n' + CSS_PATCH, changed: true };
}

function patchPageCssLinks(links) {
  const list = [...(links || [])];
  const filtered = list.filter((u) => !/fontawesome|font-awesome/i.test(u));
  return { links: filtered, changed: filtered.length !== list.length };
}

function patchBlocks(blocks) {
  const changes = [];
  const next = (blocks || []).map((raw) => {
    const block = { ...raw };
    const config = { ...(block.config || {}) };
    if (block.type === 'html' && typeof config.html === 'string') {
      const r = patchHtml(config.html);
      if (r.changes.length) {
        changes.push('html: ' + r.changes.join(', '));
        config.html = r.html;
      }
    }
    block.config = config;
    return block;
  });
  return { blocks: next, changes };
}

async function main() {
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: 'pixseo-1eeef' });
  }
  const db = admin.firestore();
  const ts = await db.collection('mediaTenants').where('slug', '==', 'flat').limit(1).get();
  if (ts.empty) { console.error('no flat'); process.exit(1); }
  const mediaId = ts.docs[0].id;
  console.log('mediaId', mediaId, DRY_RUN ? 'dry-run' : '');

  let cbCount = 0;
  const cbSnap = await db.collection('customBlocks').where('mediaId', '==', mediaId).get();
  for (const doc of cbSnap.docs) {
    const data = doc.data();
    const updates = {};
    const log = [];
    if (typeof data.html === 'string') {
      const r = patchHtml(data.html);
      if (r.changes.length) { updates.html = r.html; log.push(r.changes.join(', ')); }
    }
    if (typeof data.css === 'string') {
      const r = patchCss(data.css);
      if (r.changed) { updates.css = r.css; log.push('css'); }
    }
    if (Object.keys(updates).length) {
      cbCount++;
      console.log('[customBlock]', doc.id, data.name || '', log.join('; '));
      if (!DRY_RUN) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await doc.ref.update(updates);
      }
    }
  }

  let pgCount = 0;
  const pgSnap = await db.collection('pages').where('mediaId', '==', mediaId).get();
  for (const doc of pgSnap.docs) {
    const data = doc.data();
    const updates = {};
    const log = [];
    if (Array.isArray(data.blocks)) {
      const r = patchBlocks(data.blocks);
      if (r.changes.length) { updates.blocks = r.blocks; log.push(...r.changes); }
    }
    if (typeof data.customCss === 'string') {
      const r = patchCss(data.customCss);
      if (r.changed) { updates.customCss = r.css; log.push('customCss'); }
    }
    const lr = patchPageCssLinks(data.cssLinks);
    if (lr.changed) { updates.cssLinks = lr.links; log.push('drop fa css'); }
    if (Object.keys(updates).length) {
      pgCount++;
      console.log('[page]', doc.id, 'slug=' + data.slug, log.join('; '));
      if (!DRY_RUN) {
        updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
        await doc.ref.update(updates);
      }
    }
  }
  console.log('Done customBlocks=' + cbCount + ' pages=' + pgCount);
}

main().catch((e) => { console.error(e); process.exit(1); });
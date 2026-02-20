const admin = require('firebase-admin');
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'pixseo-1eeef',
    storageBucket: 'pixseo-1eeef.firebasestorage.app',
  });
}
const db = admin.firestore();
const MEDIA_ID = 'vLXNATzVNoJc9dIGggPi';
const SITE_URL = 'https://flat.pixseo-preview.cloud';

function extractLinks(html) {
  const links = [];
  const hrefRegex = /href=["']([^"']+)["']/g;
  let match;
  while ((match = hrefRegex.exec(html)) !== null) {
    links.push(match[1]);
  }
  return links;
}

function extractAllLinksFromBlocks(blocks) {
  const links = [];
  for (const block of blocks) {
    if (block.type === 'html' && block.config?.html) {
      links.push(...extractLinks(block.config.html));
    }
    if (block.type === 'row' && block.config?.columns) {
      for (const col of block.config.columns) {
        if (col.html) {
          links.push(...extractLinks(col.html));
        }
      }
    }
  }
  return links;
}

async function checkUrl(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, { 
      method: 'HEAD', 
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);
    return { url, status: res.status, ok: res.ok };
  } catch (e) {
    return { url, status: 'ERROR', ok: false, error: e.message };
  }
}

function resolveUrl(link, pageSlug) {
  if (link.startsWith('http://') || link.startsWith('https://')) return link;
  if (link.startsWith('tel:') || link.startsWith('mailto:') || link.startsWith('#') || link.startsWith('javascript:')) return null;
  if (link.startsWith('/')) return SITE_URL + link;
  return SITE_URL + '/ja/' + pageSlug + '/' + link;
}

async function run() {
  // Get all pages
  const snap = await db.collection('pages').where('mediaId', '==', MEDIA_ID).get();
  
  // Get custom blocks (header/footer)
  const cbSnap = await db.collection('customBlocks').where('mediaId', '==', MEDIA_ID).get();
  const customBlocks = {};
  cbSnap.forEach(doc => { customBlocks[doc.id] = doc.data(); });

  const allLinks = new Map(); // url -> [source pages]
  
  snap.forEach(doc => {
    const d = doc.data();
    const blocks = d.blocks || [];
    const pageLinks = extractAllLinksFromBlocks(blocks);
    
    for (const link of pageLinks) {
      const resolved = resolveUrl(link, d.slug);
      if (!resolved) continue;
      
      if (!allLinks.has(resolved)) {
        allLinks.set(resolved, { original: link, pages: [] });
      }
      allLinks.get(resolved).pages.push(d.slug);
    }
  });

  // Also check custom block links
  for (const [cbId, cb] of Object.entries(customBlocks)) {
    if (cb.html) {
      const links = extractLinks(cb.html);
      for (const link of links) {
        const resolved = resolveUrl(link, '');
        if (!resolved) continue;
        if (!allLinks.has(resolved)) {
          allLinks.set(resolved, { original: link, pages: [] });
        }
        allLinks.get(resolved).pages.push(`[customBlock:${cb.name || cbId}]`);
      }
    }
  }

  console.log(`\n=== LINK CHECK (${allLinks.size} unique links) ===\n`);

  // Group by domain
  const internalLinks = [];
  const externalLinks = [];
  
  for (const [url, info] of allLinks) {
    if (url.includes('pixseo-preview.cloud') || url.includes('the-ayumi.jp')) {
      internalLinks.push({ url, ...info });
    } else {
      externalLinks.push({ url, ...info });
    }
  }

  // Check internal links
  console.log('--- INTERNAL LINKS ---');
  for (const link of internalLinks) {
    const result = await checkUrl(link.url);
    const status = result.ok ? 'OK' : `BROKEN(${result.status})`;
    if (!result.ok) {
      console.log(`  ${status} ${link.original}`);
      console.log(`    Resolved: ${link.url}`);
      console.log(`    Used in: ${link.pages.join(', ')}`);
    }
  }
  
  const brokenInternal = internalLinks.filter(async l => !(await checkUrl(l.url)).ok);
  
  // List all internal links for reference
  console.log(`\n  Total internal links checked: ${internalLinks.length}`);

  // Check external links
  console.log('\n--- EXTERNAL LINKS ---');
  for (const link of externalLinks) {
    const result = await checkUrl(link.url);
    const status = result.ok ? 'OK' : `BROKEN(${result.status})`;
    if (!result.ok) {
      console.log(`  ${status} ${link.original}`);
      console.log(`    Resolved: ${link.url}`);
      console.log(`    Used in: ${link.pages.join(', ')}`);
    }
  }
  console.log(`\n  Total external links checked: ${externalLinks.length}`);

  // List all links pointing to the-ayumi.jp (should be changed to pixseo-preview)
  console.log('\n--- LINKS TO OLD DOMAIN (the-ayumi.jp) ---');
  for (const [url, info] of allLinks) {
    if (url.includes('the-ayumi.jp')) {
      console.log(`  ${info.original}`);
      console.log(`    Used in: ${info.pages.join(', ')}`);
    }
  }

  // List relative links that might be broken
  console.log('\n--- SUSPICIOUS RELATIVE LINKS ---');
  for (const [url, info] of allLinks) {
    if (info.original.endsWith('.html') || 
        (!info.original.startsWith('http') && !info.original.startsWith('/') && !info.original.startsWith('tel:') && !info.original.startsWith('mailto:') && !info.original.startsWith('#'))) {
      console.log(`  ${info.original}`);
      console.log(`    Used in: ${info.pages.join(', ')}`);
    }
  }
}

run().catch(console.error);

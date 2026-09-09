export const ARTICLE_CONTENT_STYLES = `    .article-content {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
    }
    .article-content p {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
      margin-bottom: 1.5em !important;
    }
    .article-content h2 {
      font-size: 1.375em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 2em !important;
      margin-bottom: 1em !important;
      font-weight: 700 !important;
      padding-bottom: 0.5em !important;
      color: #111827 !important;
      position: relative !important;
      border-bottom: none !important;
    }
    .article-content h2::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 6px !important;
      background-color: var(--primary-color, #3b82f6) !important;
      border-radius: 3px !important;
    }
    .article-content h3 {
      font-size: 1.25em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 1.8em !important;
      margin-bottom: 0.8em !important;
      font-weight: 600 !important;
      padding-bottom: 0.5em !important;
      padding-left: 0 !important;
      position: relative !important;
      border-bottom: none !important;
      border-left: none !important;
    }
    .article-content h3::after {
      content: '' !important;
      position: absolute !important;
      bottom: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 3px !important;
      background-color: var(--primary-color, #3b82f6) !important;
      border-radius: 1.5px !important;
    }
    .article-content h4 {
      font-size: 1.125em !important;
      line-height: 1.6 !important;
      letter-spacing: 0.02em !important;
      margin-top: 1.5em !important;
      margin-bottom: 0.6em !important;
      font-weight: 600 !important;
      padding-bottom: 0.25em !important;
      border-bottom: 2px solid var(--primary-color, #3b82f6) !important;
    }
    .article-content ul,
    .article-content ol {
      line-height: 2.0 !important;
      letter-spacing: 0.02em !important;
      counter-reset: list-counter !important;
      list-style: none !important;
      padding-left: 0 !important;
    }
    .article-content ol {
      counter-reset: list-counter !important;
    }
    .article-content li {
      margin-bottom: 0.75em !important;
      padding: 0.75em 1em !important;
      background: transparent !important;
      border: 2px solid var(--border-color, #e5e7eb) !important;
      border-radius: 8px !important;
      position: relative !important;
      counter-increment: list-counter !important;
      font-size: 0.9em !important;
    }
    .article-content ol > li::before {
      content: "No. " counter(list-counter) !important;
      display: inline-block !important;
      margin-right: 0.5em !important;
      font-weight: 700 !important;
      color: var(--primary-color, #3b82f6) !important;
      font-size: 0.875em !important;
    }
    .article-content ul > li::before {
      content: "" !important;
    }
    .article-content table {
      width: 100% !important;
      border-collapse: separate !important;
      border-spacing: 0 !important;
      margin: 2em 0 !important;
      font-size: 0.875em !important;
      border-radius: 8px !important;
      overflow: hidden !important;
      border: 1px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table thead {
      background-color: var(--block-background-color, #f9fafb) !important;
    }
    .article-content table th {
      padding: 0.75em 1em !important;
      text-align: left !important;
      font-weight: 600 !important;
      border-bottom: 2px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table thead tr:first-child th:first-child {
      border-top-left-radius: 7px !important;
    }
    .article-content table thead tr:first-child th:last-child {
      border-top-right-radius: 7px !important;
    }
    .article-content table td {
      padding: 0.75em 1em !important;
      border-bottom: 1px solid var(--border-color, #e5e7eb) !important;
    }
    .article-content table tbody tr:last-child td {
      border-bottom: none !important;
    }
    .article-content table tbody tr:last-child td:first-child {
      border-bottom-left-radius: 7px !important;
    }
    .article-content table tbody tr:last-child td:last-child {
      border-bottom-right-radius: 7px !important;
    }
    .article-content table tbody tr:hover {
      background-color: var(--block-background-color, #f9fafb) !important;
    }
    .article-content {
      word-break: break-word !important;
      overflow-wrap: break-word !important;
    }
    .article-content a {
      word-break: break-all !important;
      overflow-wrap: break-word !important;
    }
    /* 目次カード（TableOfContents）のスタイルを記事本文 CSS から保護する
       .article-content 内に描画されたときに h2/img/ul/li の装飾が漏れないようにリセット。
       ※ テーマ側 (.theme-furatto-default article .article-content h2) との特異度比較で
          勝てるようクラス重ね書き (.toc-card.toc-card) でスコアを底上げしている */
    .article-content .toc-card.toc-card,
    .article-content .toc-card.toc-card * {
      word-break: normal !important;
      overflow-wrap: normal !important;
    }
    .article-content .toc-card.toc-card h2 {
      font-size: 1.125rem !important;
      line-height: 1.75rem !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-top: none !important;
      border-right: none !important;
      border-bottom: none !important;
      border-left: none !important;
      color: inherit !important;
      position: static !important;
      letter-spacing: normal !important;
      white-space: nowrap !important;
    }
    .article-content .toc-card.toc-card h2::before,
    .article-content .toc-card.toc-card h2::after {
      display: none !important;
      content: none !important;
      background: none !important;
      border: none !important;
      width: 0 !important;
      height: 0 !important;
    }
    .article-content .toc-card.toc-card img {
      margin: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
    }
    .article-content .toc-card.toc-card ul,
    .article-content .toc-card.toc-card ol {
      margin: 0 !important;
      padding: 0 !important;
      list-style: none !important;
      counter-reset: none !important;
    }
    /* リスト項目の枠線・カウンタ装飾を打ち消し */
    .article-content .toc-card.toc-card li,
    .article-content .toc-inline li {
      border: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin-bottom: 0 !important;
      background: transparent !important;
      counter-increment: none !important;
    }
    /* Tailwind の levelStyles (text-base / text-sm) を固定ピクセル値で適用し、
       .article-content li の font-size: 0.9em が目次に漏れないようにする */
    .article-content .toc-card.toc-card li.text-base,
    .article-content .toc-card.toc-card li.text-base * {
      font-size: 1rem !important;
      line-height: 1.375rem !important;
    }
    .article-content .toc-card.toc-card li.text-sm,
    .article-content .toc-card.toc-card li.text-sm * {
      font-size: 0.875rem !important;
      line-height: 1.25rem !important;
    }
    .article-content .toc-card.toc-card li.text-xs,
    .article-content .toc-card.toc-card li.text-xs * {
      font-size: 0.75rem !important;
      line-height: 1rem !important;
    }
    .article-content .toc-card.toc-card li::before,
    .article-content .toc-card.toc-card li::after,
    .article-content .toc-inline li::before {
      display: none !important;
      content: none !important;
    }
    /* H2 レベル項目の区切り線だけは TableOfContents 側で付けている border-t を残す */
    .article-content .toc-card.toc-card li.border-t {
      border-top: 1px solid #e5e7eb !important;
      padding-top: 0.375rem !important;
      margin-top: 0.375rem !important;
    }
    @media (max-width: 767px) {
      .article-content {
        font-size: 0.875rem !important;
        line-height: 1.75 !important;
      }
      .article-content p {
        line-height: 1.75 !important;
        margin-bottom: 1em !important;
      }
      .article-content h2 {
        font-size: 1.15em !important;
        margin-top: 1.5em !important;
        margin-bottom: 0.75em !important;
        padding-bottom: 0.35em !important;
      }
      .article-content h2::after {
        height: 4px !important;
      }
      .article-content h3 {
        font-size: 1.05em !important;
        margin-top: 1.25em !important;
        margin-bottom: 0.6em !important;
        padding-bottom: 0.35em !important;
      }
      .article-content h3::after {
        height: 2px !important;
      }
      .article-content h4 {
        font-size: 1em !important;
        margin-top: 1.1em !important;
        margin-bottom: 0.5em !important;
      }
      .article-content ul,
      .article-content ol {
        line-height: 1.75 !important;
      }
      .article-content li {
        margin-bottom: 0.5em !important;
        padding: 0.5em 0.75em !important;
        font-size: 0.875em !important;
      }
      .article-content table {
        margin: 1.25em 0 !important;
        font-size: 0.8125em !important;
      }
      .article-content table th,
      .article-content table td {
        padding: 0.5em 0.75em !important;
      }
    }
    /* BlogCard専用スタイルリセット */
    .article-content .blogcard-wrapper {
      display: block !important;
      margin: 16px 0 !important;
      padding: 0 !important;
      border: none !important;
      background: transparent !important;
      position: relative !important;
    }
    .article-content .blogcard-label {
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      background: #3b82f6 !important;
      color: #fff !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      padding: 4px 12px !important;
      margin: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      line-height: 1.4 !important;
    }
    .article-content .blogcard-label-icon {
      width: 14px !important;
      height: 14px !important;
      margin: 0 !important;
      padding: 0 !important;
    }
    .article-content .blogcard-link {
      display: flex !important;
      flex-direction: row !important;
      align-items: stretch !important;
      text-decoration: none !important;
      color: inherit !important;
      border: 1px solid #e5e7eb !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      min-height: 0 !important;
    }
    .article-content .blogcard-link:hover {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
    }
    .article-content .blogcard-thumbnail {
      width: min(240px, 42vw) !important;
      min-width: 0 !important;
      max-width: min(240px, 42vw) !important;
      aspect-ratio: 4 / 3 !important;
      height: auto !important;
      min-height: 0 !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-radius: 0 !important;
      position: relative !important;
      flex-shrink: 0 !important;
      background: #f3f4f6 !important;
      align-self: center !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-thumbnail > span,
    .article-content .blogcard-thumbnail > div {
      margin: 0 !important;
      padding: 0 !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }
    .article-content .blogcard-thumbnail img {
      margin: 0 !important;
      margin-top: 0 !important;
      margin-bottom: 0 !important;
      padding: 0 !important;
      border-radius: 0 !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
      object-fit: contain !important;
    }
    @media (max-width: 639px) {
      .article-content .blogcard-link {
        flex-direction: column !important;
        align-items: stretch !important;
      }
      .article-content .blogcard-thumbnail {
        width: 100% !important;
        max-width: none !important;
        align-self: stretch !important;
      }
      .article-content .blogcard-content {
        justify-content: flex-start !important;
      }
    }
    .article-content .blogcard-content {
      flex: 1 !important;
      min-width: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      padding: 12px 16px !important;
      gap: 8px !important;
      justify-content: center !important;
      margin: 0 !important;
      border: none !important;
    }
    .article-content .blogcard-meta {
      font-size: 11px !important;
      color: #6b7280 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      line-height: 1.4 !important;
      font-weight: normal !important;
    }
    .article-content .blogcard-meta-footer {
      display: flex !important;
      flex-direction: row !important;
      justify-content: space-between !important;
      align-items: center !important;
      gap: 8px !important;
      margin-top: auto !important;
      margin-bottom: 0 !important;
    }
    .article-content .blogcard-writer {
      flex: 1 1 auto !important;
      min-width: 0 !important;
      text-align: left !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      white-space: nowrap !important;
      color: #6b7280 !important;
    }
    .article-content .blogcard-meta::before,
    .article-content .blogcard-meta::after {
      display: none !important;
      content: none !important;
    }
    .article-content .blogcard-date {
      flex-shrink: 0 !important;
      color: #6b7280 !important;
      font-weight: 500 !important;
      text-align: right !important;
    }
    .article-content .blogcard-title {
      font-size: 15px !important;
      font-weight: 700 !important;
      color: #111827 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      border-bottom: none !important;
      line-height: 1.4 !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 2 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-title::before,
    .article-content .blogcard-title::after {
      display: none !important;
      content: none !important;
    }
    .article-content .blogcard-link:hover .blogcard-title {
      color: #f97316 !important;
    }
    .article-content .blogcard-description {
      font-size: 13px !important;
      color: #4b5563 !important;
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      line-height: 1.5 !important;
      font-weight: normal !important;
      display: -webkit-box !important;
      -webkit-line-clamp: 3 !important;
      -webkit-box-orient: vertical !important;
      overflow: hidden !important;
    }
    .article-content .blogcard-description::before,
    .article-content .blogcard-description::after {
      display: none !important;
      content: none !important;
    }
`;

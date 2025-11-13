/**
 * Query Expansion Service
 *
 * Expands user queries with semantically related terms to improve search recall.
 * Uses a curated dictionary of Japanese synonyms and related terms.
 *
 * Requirements: 4 (Resource Search)
 * Task: Search query enhancement for better semantic matching
 */

/**
 * Synonym and related terms dictionary
 * Structure: { baseKeyword: [synonyms, related terms] }
 */
const synonymDictionary = {
  // 静けさ・落ち着き関連
  '静か': ['静かな', '落ち着いた', '穏やか', '平和', '静寂', 'quiet'],
  '静かな': ['静か', '落ち着いた', '穏やか', '平和'],
  '落ち着いた': ['静か', '静かな', '穏やか', '平和'],
  '穏やか': ['静か', '落ち着いた', '平和'],

  // 活発・にぎやか関連
  'にぎやか': ['活発', '元気', '賑わい', '活気'],
  '活発': ['にぎやか', '元気', '活気'],
  '元気': ['にぎやか', '活発', '活気'],

  // アクセシビリティ関連
  'バリアフリー': ['車椅子対応', 'アクセシブル', '段差なし', '車椅子'],
  '車椅子対応': ['バリアフリー', 'アクセシブル', '車椅子'],
  '車椅子': ['車椅子対応', 'バリアフリー'],

  // 料金関連
  '無料': ['タダ', '費用なし', '0円', '低料金'],
  '低料金': ['安い', '格安', '無料', 'リーズナブル'],
  '安い': ['低料金', '格安', 'リーズナブル'],

  // 時間関連
  '平日': ['平日利用可', 'ウィークデー'],
  '休日': ['土日', '週末', '休日利用可'],
  '週末': ['土日', '休日'],

  // 理解・サポート関連
  '理解': ['理解がある', 'サポート', '支援', '配慮'],
  'サポート': ['支援', '理解がある', '配慮', 'ケア'],
  '支援': ['サポート', '理解がある', 'ケア'],

  // 場所関連
  '場所': ['施設', 'スペース', '会場', 'センター', 'ところ'],
  '施設': ['場所', 'センター', '会場', 'スペース'],
  '公園': ['場所', '屋外', 'park', '緑地'],

  // 駐車関連
  '駐車場': ['駐車場あり', 'パーキング', '車'],
  '車': ['駐車場', '駐車場あり', '車で行ける']
};

/**
 * Common Japanese particles and words to remove from queries
 */
const stopWords = new Set([
  'な', 'の', 'を', 'に', 'が', 'で', 'と', 'は', 'へ', 'から', 'まで',
  'する', 'ある', 'いる', 'です', 'ます', 'ました', 'でした'
]);

/**
 * Extract keywords from a query string
 * Removes particles and common words
 *
 * @param {string} query - User's search query
 * @returns {string[]} Extracted keywords
 */
function extractKeywords(query) {
  if (!query || typeof query !== 'string') {
    return [];
  }

  // Split by spaces and common separators
  const words = query
    .split(/[\s、。・]+/)
    .map(w => w.trim())
    .filter(w => w.length > 0);

  const keywords = [];

  for (const word of words) {
    // Remove particles
    let cleaned = word;

    // Remove trailing particles (な、の、を、etc.)
    cleaned = cleaned.replace(/[なのをにがでとはへからまで]+$/, '');

    // Skip if becomes empty or is a stop word
    if (cleaned.length === 0 || stopWords.has(cleaned)) {
      continue;
    }

    keywords.push(cleaned);
  }

  return keywords;
}

/**
 * Expand a single keyword using the synonym dictionary
 *
 * @param {string} keyword - Keyword to expand
 * @returns {string[]} Original keyword + synonyms
 */
function expandKeyword(keyword) {
  const expanded = new Set([keyword]);

  // Direct lookup
  if (synonymDictionary[keyword]) {
    synonymDictionary[keyword].forEach(syn => expanded.add(syn));
  }

  // Partial match (for compound words)
  for (const [key, synonyms] of Object.entries(synonymDictionary)) {
    if (keyword.includes(key) || key.includes(keyword)) {
      synonyms.forEach(syn => expanded.add(syn));
      expanded.add(key);
    }
  }

  return Array.from(expanded);
}

/**
 * Expand a search query with synonyms and related terms
 *
 * @param {string} query - User's original search query
 * @returns {Object} Expansion result
 * @returns {string[]} result.keywords - Extracted keywords
 * @returns {string[]} result.expandedTerms - All expanded terms
 * @returns {string} result.expandedQuery - Combined expanded query string
 */
function expandQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      keywords: [],
      expandedTerms: [],
      expandedQuery: ''
    };
  }

  // Extract keywords from query
  const keywords = extractKeywords(query);

  // Expand each keyword
  const allExpandedTerms = new Set();

  for (const keyword of keywords) {
    const expanded = expandKeyword(keyword);
    expanded.forEach(term => allExpandedTerms.add(term));
  }

  const expandedTerms = Array.from(allExpandedTerms);
  const expandedQuery = expandedTerms.join(' ');

  return {
    keywords,
    expandedTerms,
    expandedQuery
  };
}

/**
 * Get all related terms for a keyword
 * Useful for displaying suggestions to users
 *
 * @param {string} keyword - Keyword to find related terms for
 * @returns {string[]} Related terms
 */
function getRelatedTerms(keyword) {
  return expandKeyword(keyword).filter(term => term !== keyword);
}

/**
 * Add custom synonym mapping
 * Allows dynamic expansion of the dictionary
 *
 * @param {string} keyword - Base keyword
 * @param {string[]} synonyms - Related terms
 */
function addSynonyms(keyword, synonyms) {
  if (!synonymDictionary[keyword]) {
    synonymDictionary[keyword] = [];
  }

  synonyms.forEach(syn => {
    if (!synonymDictionary[keyword].includes(syn)) {
      synonymDictionary[keyword].push(syn);
    }
  });
}

module.exports = {
  expandQuery,
  extractKeywords,
  expandKeyword,
  getRelatedTerms,
  addSynonyms
};

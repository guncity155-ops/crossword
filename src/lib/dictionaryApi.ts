// 국립국어원 우리말샘 Open API (opendict)
// API 키 발급: https://opendict.korean.go.kr/service/openApiInfo
// 브라우저 직접 호출 시 CORS 문제가 생길 수 있어 allorigins 프록시를 fallback으로 사용

const KRDICT_BASE = 'https://opendict.korean.go.kr/api/search';

async function fetchXml(url: string): Promise<string> {
  // 직접 호출 시도
  try {
    const res = await fetch(url);
    if (res.ok) return await res.text();
  } catch {
    // CORS 실패 → 프록시 시도
  }

  // allorigins 프록시 fallback
  const proxied = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const res = await fetch(proxied);
  if (!res.ok) throw new Error('fetch failed');
  return await res.text();
}

function parseDefinition(xml: string): string | null {
  try {
    const doc = new DOMParser().parseFromString(xml, 'text/xml');
    // 첫 번째 item의 첫 번째 sense definition
    const def = doc.querySelector('item sense definition')?.textContent
      ?? doc.querySelector('definition')?.textContent;
    return def?.trim() ?? null;
  } catch {
    return null;
  }
}

export async function fetchDefinition(word: string, apiKey: string): Promise<string> {
  if (!apiKey.trim()) return '';
  try {
    // req_type=json 으로 JSON 응답 요청
    const url = `${KRDICT_BASE}?key=${apiKey.trim()}&q=${encodeURIComponent(word)}&req_type=json&part=word&sort=popular&num=1`;
    const text = await fetchXml(url);

    // JSON 파싱 시도
    try {
      const data = JSON.parse(text);
      const def = data?.channel?.item?.[0]?.sense?.[0]?.definition;
      if (def) return def.trim();
    } catch {
      // JSON 실패 → XML 파싱
    }

    return parseDefinition(text) ?? '';
  } catch {
    return '';
  }
}

// 단어 목록을 병렬로 조회 (rate limit 고려해 최대 3개씩 묶음)
export async function fetchDefinitions(
  words: string[],
  apiKey: string,
  onProgress?: (done: number, total: number) => void
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const CHUNK = 3;

  for (let i = 0; i < words.length; i += CHUNK) {
    const chunk = words.slice(i, i + CHUNK);
    const defs = await Promise.all(chunk.map(w => fetchDefinition(w, apiKey)));
    chunk.forEach((w, j) => {
      if (defs[j]) result[w] = defs[j];
    });
    onProgress?.(Math.min(i + CHUNK, words.length), words.length);
    if (i + CHUNK < words.length) await new Promise(r => setTimeout(r, 300));
  }

  return result;
}

import { resolveApiBase } from './api-config.js';
export async function loadPublishedProjects({ base = import.meta.env?.BASE_URL || '/', fetcher = fetch, onProgress = () => {} } = {}) {

  try {
    const configResponse = await fetcher(
      base + "api-config.json",
      { cache: "no-store", signal: AbortSignal.timeout(20000) }
    );

    if (!configResponse.ok) {
      throw new Error("API config unavailable");
    }

    const config = await configResponse.json();
    const api = resolveApiBase(config);

    const records = [];
    const seen = new Set();
    const limit = 30;
    const maxPages = 100;
    let expectedCount = null;

    for (let page = 1; page <= maxPages; page++) {
      const url = new URL(api + "/api/search");
      url.searchParams.set("page", String(page));
      url.searchParams.set("limit", String(limit));

      const response = await fetcher(url, { cache: "no-store", signal: AbortSignal.timeout(20000) });

      if (!response.ok) {
        throw new Error("Search API HTTP " + response.status);
      }

      const data = await response.json();

      if (!Array.isArray(data.records)) {
        throw new Error("Invalid search API response");
      }

      if (expectedCount === null) {
        expectedCount = Number(data.count);
        if (!Number.isSafeInteger(expectedCount) ||
            expectedCount < 0) {
          throw new Error("Invalid total record count");
        }
      }

      for (const record of data.records) {
        if (!record.id || seen.has(record.id)) continue;
        seen.add(record.id);
        records.push(record);
      }

      onProgress({ records: [...records], count: expectedCount });

      if (records.length >= expectedCount) {
        return { records, count: expectedCount };
      }

      if (data.records.length < limit) {
        throw new Error("Search pagination ended early");
      }
    }

    throw new Error("Search pagination safety limit reached");
  } catch (error) {
    console.error("Failed to load complete live catalog:", error);
    return { records: [], loadError: true };
  }
}
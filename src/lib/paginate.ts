import { endpoints } from "../endpoints.js";
import { qs } from "./qs.js";
import { getWithRetry, hx } from "./http.js";

type Query = Record<string, unknown>;

export interface PageResult<T = any> {
  items: T[];
  nextCursor?: string | null;
}

export async function fetchPage(path: string, params?: Query): Promise<any> {
  const q = qs(params);
  const full = `${path}${q}`;
  return getWithRetry(full);
}

export async function* paginate<T = any>(
  basePath: string,
  initialParams: Query = {}
): AsyncGenerator<T[], void, unknown> {
  const style = endpoints.pagination.style;
  if (style === "none") {
    const data = await fetchPage(basePath, initialParams);
    const items = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
    yield items;
    return;
  }

  if (style === "cursor") {
    let cursor: string | undefined = initialParams[endpoints.pagination.cursorParam || ""] as
      | string
      | undefined;
    let params = { ...initialParams };
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (cursor) params = { ...params, [endpoints.pagination.cursorParam!]: cursor };
      const data = await fetchPage(basePath, params);
      const items: T[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      yield items;
      cursor = data?.next_page || data?.nextPage || data?.cursor || null;
      if (!cursor) break;
    }
    return;
  }

  if (style === "page") {
    const pageParam = endpoints.pagination.pageParam || "page";
    const perParam = endpoints.pagination.perPageParam || "per_page";
    let page = (initialParams[pageParam] as number) || 1;
    const perPage = (initialParams[perParam] as number) || 50;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data = await fetchPage(basePath, { ...initialParams, [pageParam]: page, [perParam]: perPage });
      const items: T[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      if (!items.length) break;
      yield items;
      page++;
      if (items.length < perPage) break;
    }
    return;
  }

  if (style === "link") {
    let next: string | null | undefined = null;
    let first = true;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const data: any = await (first ? fetchPage(basePath, initialParams) : getWithRetry(next!));
      const items: T[] = Array.isArray(data) ? data : data?.items ?? data?.data ?? [];
      yield items;
      first = false;
      next = data?.next ?? data?.[endpoints.pagination.nextField || "next"];
      if (!next) break;
    }
    return;
  }
}

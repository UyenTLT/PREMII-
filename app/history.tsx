"use client";

import { useEffect, useState } from "react";
import { formatDateTime, translate, type Language } from "../lib/i18n";

type Entry = {
  id: number | string;
  time: string;
  actor: string;
  entity: string;
  beforeData: string | null;
  afterData: string | null;
};

export function History({ lang, entity }: { lang: Language; entity?: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [request, setRequest] = useState({ before: null as string | null });
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const t = (key: string) => translate(lang, key);

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams();
    if (entity) query.set("entity", entity);
    if (request.before) query.set("before", request.before);
    setLoading(true);
    setFailed(false);
    fetch("/api/history?" + query, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw Error(response.statusText);
        const result = await response.json();
        if (controller.signal.aborted) return;
        setEntries((previous) =>
          request.before ? [...previous, ...result.entries] : result.entries,
        );
        setCursor(result.nextCursor);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [entity, request]);

  return (
    <div className="history-list" aria-busy={loading}>
      {entries.map((entry) => (
        <details key={entry.id}>
          <summary>
            {formatDateTime(entry.time, lang)} ·{" "}
            <span className="user-content">
              {entry.actor}
              {entity ? "" : " · " + entry.entity}
            </span>
          </summary>
          <div className="history-values">
            <div>
              {t("before")}
              <pre className="user-content">{entry.beforeData ?? "—"}</pre>
            </div>
            <div>
              {t("after")}
              <pre className="user-content">{entry.afterData ?? "—"}</pre>
            </div>
          </div>
        </details>
      ))}
      {loading && <p role="status">{t("loading")}</p>}
      {!loading && !failed && !entries.length && (
        <p className="empty">{t("empty")}</p>
      )}
      {failed && (
        <div role="alert" className="error">
          {t("historyFailed")}{" "}
          <button onClick={() => setRequest({ ...request })}>
            {t("retry")}
          </button>
        </div>
      )}
      {cursor && !loading && !failed && (
        <button
          className="secondary"
          onClick={() => setRequest({ before: cursor })}
        >
          {t("olderChanges")}
        </button>
      )}
    </div>
  );
}

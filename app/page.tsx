'use client';

import { useState, useEffect, useCallback } from 'react';

interface PipelineRun {
  id: string;
  batch_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  articles_count: number;
  executive_brief: string | null;
  metrics: Record<string, unknown>;
}

interface ArticleSummary {
  id: string;
  title: string;
  url: string;
  source: string | null;
  urgency: string | null;
  relevance_score: number | null;
  category: string | null;
}

export default function Dashboard() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<'overview' | 'articles' | 'pipeline'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const [runsRes, articlesRes] = await Promise.all([
        fetch('/api/pipeline/logs?limit=5'),
        fetch('/api/articles/latest'),
      ]);
      if (runsRes.ok) {
        const data = await runsRes.json();
        if (Array.isArray(data)) setRuns(data);
      }
      if (articlesRes.ok) {
        const data = await articlesRes.json();
        if (Array.isArray(data)) setArticles(data);
      }
    } catch {
      // API not available yet - ignore
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const triggerPipeline = async () => {
    setLoading(true);
    try {
      await fetch('/api/pipeline/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      await fetchData();
    } catch {
      // Pipeline trigger failed - ignore
    }
    setLoading(false);
  };

  const urgencyBadge = (u: string | null) => {
    const colors: Record<string, string> = { red: 'bg-red-100 text-red-800', yellow: 'bg-yellow-100 text-yellow-800', green: 'bg-green-100 text-green-800' };
    return u ? `inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[u] || ''}` : '';
  };

  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-blue-900">ACRYL Intelligence Brief</h1>
        <p className="text-sm text-gray-500 mt-1">AI 경영정보 뉴스레터 대시보드</p>
      </header>

      <nav className="flex gap-4 mb-6 border-b pb-2">
        {(['overview', 'articles', 'pipeline'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-3 py-1 text-sm font-medium rounded-t ${tab === t ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-700' : 'text-gray-500'}`}>
            {t === 'overview' ? '개요' : t === 'articles' ? '기사' : '파이프라인'}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="flex gap-4">
            <button onClick={triggerPipeline} disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {loading ? '실행 중...' : '파이프라인 실행'}
            </button>
            <a href="/api/newsletter/preview" target="_blank"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200">
              뉴스레터 프리뷰
            </a>
          </div>

          {runs[0]?.executive_brief && (
            <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
              <h2 className="text-sm font-bold text-blue-900 mb-2">🎯 최신 브리프</h2>
              <p className="text-sm text-gray-700 whitespace-pre-line">{runs[0].executive_brief}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{articles.length}</div>
              <div className="text-xs text-gray-500">최신 기사</div>
            </div>
            <div className="bg-white p-4 rounded shadow-sm">
              <div className="text-2xl font-bold text-red-600">{articles.filter((a) => a.urgency === 'red').length}</div>
              <div className="text-xs text-gray-500">긴급</div>
            </div>
            <div className="bg-white p-4 rounded shadow-sm">
              <div className="text-2xl font-bold text-green-600">{runs.filter((r) => r.status === 'completed').length}</div>
              <div className="text-xs text-gray-500">최근 완료</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'articles' && (
        <div className="space-y-2">
          {articles.map((a) => (
            <div key={a.id} className="bg-white p-3 rounded shadow-sm flex justify-between items-start">
              <div>
                <a href={a.url} target="_blank" className="text-sm font-medium text-gray-900 hover:text-blue-600">{a.title}</a>
                <div className="text-xs text-gray-500 mt-1">{a.source} · {a.category} · {a.relevance_score}/10</div>
              </div>
              {a.urgency && <span className={urgencyBadge(a.urgency)}>{a.urgency}</span>}
            </div>
          ))}
          {articles.length === 0 && <p className="text-sm text-gray-500">아직 기사가 없습니다.</p>}
        </div>
      )}

      {tab === 'pipeline' && (
        <div className="space-y-2">
          {runs.map((r) => (
            <div key={r.id} className="bg-white p-3 rounded shadow-sm">
              <div className="flex justify-between">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${r.status === 'completed' ? 'bg-green-100 text-green-800' : r.status === 'failed' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                  {r.status}
                </span>
                <span className="text-xs text-gray-500">{new Date(r.started_at).toLocaleString('ko-KR')}</span>
              </div>
              <div className="text-sm text-gray-700 mt-1">{r.articles_count}건 수집</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

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
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'overview' | 'articles' | 'pipeline'>('overview');

  const fetchData = useCallback(async () => {
    try {
      const runsRes = await fetch('/api/pipeline/logs?limit=5');
      if (runsRes.ok) {
        const data = await runsRes.json();
        if (Array.isArray(data)) setRuns(data);
      }
    } catch {
      // ignore
    }
    try {
      const articlesRes = await fetch('/api/articles/latest');
      if (articlesRes.ok) {
        const data = await articlesRes.json();
        if (Array.isArray(data)) setArticles(data);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const triggerPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pipeline/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error ${res.status}`);
      } else {
        await fetchData();
      }
    } catch {
      setError('파이프라인 실행 실패');
    }
    setLoading(false);
  };

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1e3a5f', margin: 0 }}>ACRYL Intelligence Brief</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>AI 경영정보 뉴스레터 대시보드</p>
      </header>

      <nav style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        {(['overview', 'articles', 'pipeline'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '4px 12px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: tab === t ? '#eff6ff' : 'transparent',
              color: tab === t ? '#1d4ed8' : '#6b7280',
              border: 'none', borderBottom: tab === t ? '2px solid #1d4ed8' : '2px solid transparent',
            }}>
            {t === 'overview' ? '개요' : t === 'articles' ? '기사' : '파이프라인'}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button onClick={triggerPipeline} disabled={loading}
              style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? '실행 중...' : '파이프라인 실행'}
            </button>
            <a href="/api/newsletter/preview" target="_blank"
              style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', borderRadius: 6, fontSize: 14, textDecoration: 'none' }}>
              뉴스레터 프리뷰
            </a>
          </div>

          {error && (
            <div style={{ padding: 12, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 16, fontSize: 14, color: '#dc2626' }}>
              {error}
            </div>
          )}

          {runs[0]?.executive_brief && (
            <div style={{ padding: 16, background: '#eff6ff', borderLeft: '4px solid #2563eb', borderRadius: 4, marginBottom: 24 }}>
              <h2 style={{ fontSize: 14, fontWeight: 'bold', color: '#1e3a5f', margin: '0 0 8px' }}>🎯 최신 브리프</h2>
              <p style={{ fontSize: 14, color: '#374151', whiteSpace: 'pre-line', margin: 0, lineHeight: 1.6 }}>{runs[0].executive_brief}</p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#111' }}>{articles.length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>최신 기사</div>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#dc2626' }}>{articles.filter((a) => a.urgency === 'red').length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>긴급</div>
            </div>
            <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#16a34a' }}>{runs.filter((r) => r.status === 'completed').length}</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>최근 완료</div>
            </div>
          </div>

          {articles.length === 0 && runs.length === 0 && (
            <div style={{ marginTop: 24, padding: 24, textAlign: 'center', background: '#f9fafb', borderRadius: 8, color: '#6b7280', fontSize: 14 }}>
              아직 데이터가 없습니다. 파이프라인을 실행하면 기사가 수집됩니다.
            </div>
          )}
        </div>
      )}

      {tab === 'articles' && (
        <div>
          {articles.length === 0 && <p style={{ fontSize: 14, color: '#6b7280' }}>아직 기사가 없습니다.</p>}
          {articles.map((a) => (
            <div key={a.id} style={{ background: '#fff', padding: 12, borderRadius: 6, marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <a href={a.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, fontWeight: 500, color: '#111', textDecoration: 'none' }}>{a.title}</a>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{a.source} · {a.category} · {a.relevance_score}/10</div>
              </div>
              {a.urgency && (
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: a.urgency === 'red' ? '#fef2f2' : a.urgency === 'yellow' ? '#fefce8' : '#f0fdf4',
                  color: a.urgency === 'red' ? '#dc2626' : a.urgency === 'yellow' ? '#ca8a04' : '#16a34a',
                }}>{a.urgency}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'pipeline' && (
        <div>
          {runs.length === 0 && <p style={{ fontSize: 14, color: '#6b7280' }}>아직 실행 기록이 없습니다.</p>}
          {runs.map((r) => (
            <div key={r.id} style={{ background: '#fff', padding: 12, borderRadius: 6, marginBottom: 8, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                  background: r.status === 'completed' ? '#f0fdf4' : r.status === 'failed' ? '#fef2f2' : '#fefce8',
                  color: r.status === 'completed' ? '#16a34a' : r.status === 'failed' ? '#dc2626' : '#ca8a04',
                }}>{r.status}</span>
                <span style={{ fontSize: 12, color: '#6b7280' }}>{new Date(r.started_at).toLocaleString('ko-KR')}</span>
              </div>
              <div style={{ fontSize: 14, color: '#374151', marginTop: 4 }}>{r.articles_count}건 수집</div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

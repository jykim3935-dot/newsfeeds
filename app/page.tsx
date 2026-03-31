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

interface SourceItem {
  id: string;
  name: string;
  url: string;
  type: string;
  content_type: string;
  category: string;
  enabled: boolean;
}

interface KeywordItem {
  id: string;
  group_name: string;
  category: string;
  content_types: string[];
  priority: number;
  keywords: string[];
  enabled: boolean;
}

type TabType = 'overview' | 'articles' | 'pipeline' | 'sources' | 'keywords';

const TAB_LABELS: Record<TabType, string> = {
  overview: '개요',
  articles: '기사',
  pipeline: '파이프라인',
  sources: '소스 관리',
  keywords: '키워드 관리',
};

const CONTENT_TYPE_OPTIONS = ['AI/기술', '산업/시장', '정책/규제', '경영/전략', '글로벌'];
const CATEGORY_OPTIONS = ['tech', 'industry', 'policy', 'management', 'global'];

export default function Dashboard() {
  const [runs, setRuns] = useState<PipelineRun[]>([]);
  const [articles, setArticles] = useState<ArticleSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabType>('overview');

  // Sources state
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [newSource, setNewSource] = useState({ name: '', url: '', type: 'rss', content_type: 'AI/기술', category: 'tech' });

  // Keywords state
  const [keywords, setKeywords] = useState<KeywordItem[]>([]);
  const [keywordsLoading, setKeywordsLoading] = useState(false);
  const [newKeyword, setNewKeyword] = useState({ group_name: '', category: 'tech', priority: 2, keywords: '' });

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

  const fetchSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const res = await fetch('/api/sources');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setSources(data);
      }
    } catch {
      // ignore
    }
    setSourcesLoading(false);
  }, []);

  const fetchKeywords = useCallback(async () => {
    setKeywordsLoading(true);
    try {
      const res = await fetch('/api/keywords');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setKeywords(data);
      }
    } catch {
      // ignore
    }
    setKeywordsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (tab === 'sources') fetchSources();
    if (tab === 'keywords') fetchKeywords();
  }, [tab, fetchSources, fetchKeywords]);

  const triggerPipeline = async () => {
    setLoading(true);
    setError(null);
    try {
      // DB 초기화 + 파이프라인 실행 (한 번에)
      const res = await fetch('/api/reset');
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

  const sendTestEmail = async () => {
    const email = prompt('테스트 발송할 이메일 주소를 입력하세요:');
    if (!email) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/pipeline/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || `Error ${res.status}`);
      } else {
        setError(null);
        alert(`${email}로 테스트 뉴스레터를 발송했습니다.`);
      }
    } catch {
      setError('테스트 발송 실패');
    }
    setLoading(false);
  };

  const previewUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/api/newsletter/preview`
    : '/api/newsletter/preview';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(previewUrl);
      alert('링크가 복사되었습니다. 카톡/슬랙에 붙여넣기 하세요.');
    } catch {
      prompt('아래 링크를 복사하세요:', previewUrl);
    }
  };

  const shareKakao = () => {
    const text = `📊 ACRYL Intelligence Brief\n오늘의 AI 경영정보 뉴스레터\n\n${previewUrl}`;
    // 모바일: kakaotalk 앱으로 공유, PC: 카카오톡 공유 URL
    if (/Android|iPhone|iPad/i.test(navigator.userAgent)) {
      window.location.href = `kakaotalk://web/share?url=${encodeURIComponent(previewUrl)}&text=${encodeURIComponent(text)}`;
      // fallback
      setTimeout(() => {
        window.open(`https://story.kakao.com/share?url=${encodeURIComponent(previewUrl)}`, '_blank');
      }, 1000);
    } else {
      // PC에서는 링크 복사로 대체
      copyLink();
    }
  };

  // Source handlers
  const toggleSource = async (source: SourceItem) => {
    try {
      const res = await fetch(`/api/sources/${source.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !source.enabled }),
      });
      if (res.ok) {
        setSources((prev) => prev.map((s) => s.id === source.id ? { ...s, enabled: !s.enabled } : s));
      }
    } catch {
      // ignore
    }
  };

  const deleteSource = async (id: string) => {
    if (!confirm('이 소스를 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/sources/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSources((prev) => prev.filter((s) => s.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const addSource = async () => {
    if (!newSource.name || !newSource.url) return;
    try {
      const res = await fetch('/api/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newSource, enabled: true }),
      });
      if (res.ok) {
        setNewSource({ name: '', url: '', type: 'rss', content_type: 'AI/기술', category: 'tech' });
        await fetchSources();
      }
    } catch {
      // ignore
    }
  };

  // Keyword handlers
  const toggleKeyword = async (kw: KeywordItem) => {
    try {
      const res = await fetch(`/api/keywords/${kw.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !kw.enabled }),
      });
      if (res.ok) {
        setKeywords((prev) => prev.map((k) => k.id === kw.id ? { ...k, enabled: !k.enabled } : k));
      }
    } catch {
      // ignore
    }
  };

  const deleteKeyword = async (id: string) => {
    if (!confirm('이 키워드 그룹을 삭제하시겠습니까?')) return;
    try {
      const res = await fetch(`/api/keywords/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setKeywords((prev) => prev.filter((k) => k.id !== id));
      }
    } catch {
      // ignore
    }
  };

  const addKeyword = async () => {
    if (!newKeyword.group_name || !newKeyword.keywords) return;
    try {
      const keywordsArray = newKeyword.keywords.split(',').map((k) => k.trim()).filter(Boolean);
      const res = await fetch('/api/keywords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_name: newKeyword.group_name,
          category: newKeyword.category,
          priority: newKeyword.priority,
          keywords: keywordsArray,
          enabled: true,
        }),
      });
      if (res.ok) {
        setNewKeyword({ group_name: '', category: 'tech', priority: 2, keywords: '' });
        await fetchKeywords();
      }
    } catch {
      // ignore
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: '6px 10px', fontSize: 13, border: '1px solid #d1d5db', borderRadius: 4,
    outline: 'none', fontFamily: 'inherit',
  };

  const smallBtnStyle = (color: string, bg: string): React.CSSProperties => ({
    padding: '4px 10px', fontSize: 12, fontWeight: 500, cursor: 'pointer',
    background: bg, color, border: 'none', borderRadius: 4,
  });

  return (
    <main style={{ maxWidth: 800, margin: '0 auto', padding: '32px 16px', fontFamily: '-apple-system, Arial, sans-serif' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 24, fontWeight: 'bold', color: '#1e3a5f', margin: 0 }}>ACRYL Intelligence Brief</h1>
        <p style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>AI 경영정보 뉴스레터 대시보드</p>
      </header>

      <nav style={{ display: 'flex', gap: 16, marginBottom: 24, borderBottom: '1px solid #e5e7eb', paddingBottom: 8 }}>
        {(['overview', 'articles', 'pipeline', 'sources', 'keywords'] as TabType[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            style={{
              padding: '4px 12px', fontSize: 14, fontWeight: 500, cursor: 'pointer',
              background: tab === t ? '#eff6ff' : 'transparent',
              color: tab === t ? '#1d4ed8' : '#6b7280',
              border: 'none', borderBottom: tab === t ? '2px solid #1d4ed8' : '2px solid transparent',
            }}>
            {TAB_LABELS[t]}
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
            <button onClick={sendTestEmail} disabled={loading}
              style={{ padding: '8px 16px', background: '#059669', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              📧 테스트 발송
            </button>
            <button onClick={copyLink}
              style={{ padding: '8px 16px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' }}>
              🔗 링크 복사
            </button>
            <button onClick={shareKakao}
              style={{ padding: '8px 16px', background: '#FEE500', color: '#3C1E1E', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontWeight: 600 }}>
              💬 카톡 공유
            </button>
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

      {tab === 'sources' && (
        <div>
          {/* Add source form */}
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', margin: '0 0 12px' }}>새 소스 추가</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>이름</label>
                <input style={{ ...inputStyle, width: 120 }} value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} placeholder="소스 이름" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>URL</label>
                <input style={{ ...inputStyle, width: 200 }} value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} placeholder="https://..." />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>타입</label>
                <select style={{ ...inputStyle }} value={newSource.type} onChange={(e) => setNewSource({ ...newSource, type: e.target.value })}>
                  <option value="rss">rss</option>
                  <option value="api">api</option>
                  <option value="websearch">websearch</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>콘텐츠 유형</label>
                <select style={{ ...inputStyle }} value={newSource.content_type} onChange={(e) => setNewSource({ ...newSource, content_type: e.target.value })}>
                  {CONTENT_TYPE_OPTIONS.map((ct) => <option key={ct} value={ct}>{ct}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>카테고리</label>
                <select style={{ ...inputStyle }} value={newSource.category} onChange={(e) => setNewSource({ ...newSource, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button onClick={addSource} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                추가
              </button>
            </div>
          </div>

          {/* Sources list */}
          {sourcesLoading && <p style={{ fontSize: 14, color: '#6b7280' }}>로딩 중...</p>}
          {!sourcesLoading && sources.length === 0 && <p style={{ fontSize: 14, color: '#6b7280' }}>등록된 소스가 없습니다.</p>}
          {sources.map((s) => (
            <div key={s.id} style={{
              background: '#fff', padding: 12, borderRadius: 6, marginBottom: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: s.enabled ? 1 : 0.55,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</div>
                <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, display: 'flex', gap: 8 }}>
                  <span style={{ padding: '1px 6px', background: '#f3f4f6', borderRadius: 3 }}>{s.type}</span>
                  <span style={{ padding: '1px 6px', background: '#f3f4f6', borderRadius: 3 }}>{s.content_type}</span>
                  <span style={{ padding: '1px 6px', background: '#f3f4f6', borderRadius: 3 }}>{s.category}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                <button onClick={() => toggleSource(s)}
                  style={smallBtnStyle(s.enabled ? '#ca8a04' : '#16a34a', s.enabled ? '#fefce8' : '#f0fdf4')}>
                  {s.enabled ? '비활성화' : '활성화'}
                </button>
                <button onClick={() => deleteSource(s.id)}
                  style={smallBtnStyle('#dc2626', '#fef2f2')}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'keywords' && (
        <div>
          {/* Add keyword form */}
          <div style={{ background: '#fff', padding: 16, borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#1e3a5f', margin: '0 0 12px' }}>새 키워드 그룹 추가</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>그룹명</label>
                <input style={{ ...inputStyle, width: 140 }} value={newKeyword.group_name} onChange={(e) => setNewKeyword({ ...newKeyword, group_name: e.target.value })} placeholder="그룹 이름" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>카테고리</label>
                <select style={{ ...inputStyle }} value={newKeyword.category} onChange={(e) => setNewKeyword({ ...newKeyword, category: e.target.value })}>
                  {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>우선순위</label>
                <select style={{ ...inputStyle }} value={newKeyword.priority} onChange={(e) => setNewKeyword({ ...newKeyword, priority: Number(e.target.value) })}>
                  <option value={1}>1 (높음)</option>
                  <option value={2}>2 (보통)</option>
                  <option value={3}>3 (낮음)</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label style={{ fontSize: 11, color: '#6b7280' }}>키워드 (쉼표 구분)</label>
                <input style={{ ...inputStyle, width: 220 }} value={newKeyword.keywords} onChange={(e) => setNewKeyword({ ...newKeyword, keywords: e.target.value })} placeholder="AI, 생성형AI, LLM" />
              </div>
              <button onClick={addKeyword} style={{ padding: '6px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 4 }}>
                추가
              </button>
            </div>
          </div>

          {/* Keywords list */}
          {keywordsLoading && <p style={{ fontSize: 14, color: '#6b7280' }}>로딩 중...</p>}
          {!keywordsLoading && keywords.length === 0 && <p style={{ fontSize: 14, color: '#6b7280' }}>등록된 키워드 그룹이 없습니다.</p>}
          {keywords.map((kw) => (
            <div key={kw.id} style={{
              background: '#fff', padding: 12, borderRadius: 6, marginBottom: 8,
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              opacity: kw.enabled ? 1 : 0.55,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#111' }}>{kw.group_name}</span>
                  <span style={{ fontSize: 11, padding: '1px 6px', background: '#eff6ff', color: '#1d4ed8', borderRadius: 3 }}>{kw.category}</span>
                  <span style={{
                    fontSize: 11, padding: '1px 6px', borderRadius: 3,
                    background: kw.priority === 1 ? '#fef2f2' : kw.priority === 2 ? '#fefce8' : '#f3f4f6',
                    color: kw.priority === 1 ? '#dc2626' : kw.priority === 2 ? '#ca8a04' : '#6b7280',
                  }}>P{kw.priority}</span>
                </div>
                <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {kw.keywords.map((k, i) => (
                    <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: '#f3f4f6', color: '#374151', borderRadius: 10 }}>{k}</span>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 12, flexShrink: 0 }}>
                <button onClick={() => toggleKeyword(kw)}
                  style={smallBtnStyle(kw.enabled ? '#ca8a04' : '#16a34a', kw.enabled ? '#fefce8' : '#f0fdf4')}>
                  {kw.enabled ? '비활성화' : '활성화'}
                </button>
                <button onClick={() => deleteKeyword(kw.id)}
                  style={smallBtnStyle('#dc2626', '#fef2f2')}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

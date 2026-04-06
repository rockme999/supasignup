/**
 * Reusable chart and metric components for dashboard SSR pages.
 */
import type { FC } from 'hono/jsx';
import type { DailyData } from './shared';

export const ProgressBar: FC<{ label: string; value: number; max: number; color?: string }> = ({ label, value, max, color }) => {
  const percent = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  const barColor = color || '#2563eb';
  return (
    <div class="progress-bar-outer">
      <span class="progress-bar-name">{label}</span>
      <div class="progress-bar" style="flex:1">
        <div class="progress-bar-fill" style={`width:${Math.max(percent, 2)}%;background:${barColor}`}>
          {percent >= 15 && <span class="progress-bar-label">{percent}%</span>}
        </div>
      </div>
      <span class="progress-bar-value">{value} ({percent}%)</span>
    </div>
  );
};

export const LineChart: FC<{ data: DailyData[]; width?: number; height?: number }> = ({ data, width = 700, height = 200 }) => {
  if (data.length === 0) {
    return <div class="empty-state" style="padding:24px"><p>데이터가 없습니다.</p></div>;
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Aggregate by day
  const dayMap = new Map<string, { signup: number; login: number }>();
  for (const d of data) {
    if (!dayMap.has(d.day)) dayMap.set(d.day, { signup: 0, login: 0 });
    const entry = dayMap.get(d.day)!;
    if (d.action === 'signup') entry.signup += d.cnt;
    else if (d.action === 'login') entry.login += d.cnt;
  }

  const days = Array.from(dayMap.keys()).sort();
  const maxVal = Math.max(1, ...days.map(d => {
    const e = dayMap.get(d)!;
    return Math.max(e.signup, e.login);
  }));

  const xScale = (i: number) => padding.left + (days.length > 1 ? (i / (days.length - 1)) * chartW : chartW / 2);
  const yScale = (v: number) => padding.top + chartH - (v / maxVal) * chartH;

  const signupPoints = days.map((d, i) => `${xScale(i)},${yScale(dayMap.get(d)!.signup)}`).join(' ');
  const loginPoints = days.map((d, i) => `${xScale(i)},${yScale(dayMap.get(d)!.login)}`).join(' ');

  // Y-axis labels (5 ticks)
  const yTicks = [0, 1, 2, 3, 4].map(i => Math.round((maxVal / 4) * i));

  // X-axis labels (show every ~5th day)
  const xStep = Math.max(1, Math.floor(days.length / 6));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style="width:100%;max-width:700px;height:auto">
      {/* Grid lines */}
      {yTicks.map(v => (
        <line x1={padding.left} y1={yScale(v)} x2={width - padding.right} y2={yScale(v)} stroke="#e5e7eb" stroke-width="1" />
      ))}
      {/* Y-axis labels */}
      {yTicks.map(v => (
        <text x={padding.left - 8} y={yScale(v) + 4} text-anchor="end" font-size="11" fill="#94a3b8">{v}</text>
      ))}
      {/* X-axis labels */}
      {days.map((d, i) => i % xStep === 0 ? (
        <text x={xScale(i)} y={height - 8} text-anchor="middle" font-size="10" fill="#94a3b8">{d.slice(5)}</text>
      ) : null)}
      {/* Lines */}
      <polyline points={signupPoints} fill="none" stroke="#2563eb" stroke-width="2" />
      <polyline points={loginPoints} fill="none" stroke="#22c55e" stroke-width="2" />
      {/* Dots */}
      {days.map((d, i) => (
        <circle cx={xScale(i)} cy={yScale(dayMap.get(d)!.signup)} r="3" fill="#2563eb" />
      ))}
      {days.map((d, i) => (
        <circle cx={xScale(i)} cy={yScale(dayMap.get(d)!.login)} r="3" fill="#22c55e" />
      ))}
      {/* Legend */}
      <rect x={width - 160} y={4} width="10" height="10" fill="#2563eb" rx="2" />
      <text x={width - 146} y={13} font-size="11" fill="#475569">가입</text>
      <rect x={width - 100} y={4} width="10" height="10" fill="#22c55e" rx="2" />
      <text x={width - 86} y={13} font-size="11" fill="#475569">로그인</text>
    </svg>
  );
};

export const PieChart: FC<{ data: { label: string; value: number; color: string }[]; size?: number }> = ({ data, size = 120 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) {
    return (
      <div style="display:flex;align-items:center;justify-content:center;height:80px;color:#94a3b8;font-size:13px">
        데이터 없음
      </div>
    );
  }

  // conic-gradient 문자열 생성
  let cumPercent = 0;
  const stops = data.map(d => {
    const pct = (d.value / total) * 100;
    const from = cumPercent;
    cumPercent += pct;
    return `${d.color} ${from.toFixed(1)}% ${cumPercent.toFixed(1)}%`;
  });
  const gradient = `conic-gradient(${stops.join(', ')})`;

  return (
    <div style="display:flex;align-items:center;gap:20px;flex-wrap:wrap">
      <div style={`width:${size}px;height:${size}px;border-radius:50%;background:${gradient};flex-shrink:0`}></div>
      <div style="flex:1;min-width:120px">
        {data.map(d => {
          const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
          return (
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
              <div style={`width:10px;height:10px;border-radius:2px;background:${d.color};flex-shrink:0`}></div>
              <span style="font-size:12px;color:#475569;flex:1">{d.label}</span>
              <span style="font-size:12px;font-weight:600;color:#1e293b">{d.value.toLocaleString()}</span>
              <span style="font-size:11px;color:#94a3b8;min-width:34px;text-align:right">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HeatmapChart: FC<{ data: number[][]; dayNames: string[]; peak?: { label: string } }> = ({ data, dayNames, peak }) => {
  const maxVal = Math.max(1, ...data.flat());

  function cellColor(val: number): string {
    if (val === 0) return '#f8fafc';
    const ratio = val / maxVal;
    if (ratio < 0.33) return '#bfdbfe';
    if (ratio < 0.66) return '#3b82f6';
    return '#1d4ed8';
  }

  return (
    <div>
      {peak && (
        <div style="margin-bottom:10px;font-size:13px;color:#64748b">
          피크 시간대: <strong style="color:#1d4ed8">{peak.label}</strong>
          <span style="margin-left:8px;font-size:12px;color:#94a3b8">(KST 기준)</span>
        </div>
      )}
      <div style="overflow-x:auto">
        <div style="min-width:600px">
          {/* 시간 헤더 */}
          <div style="display:grid;grid-template-columns:28px repeat(24, 1fr);gap:2px;margin-bottom:2px">
            <div></div>
            {Array.from({ length: 24 }, (_, h) => (
              <div style="font-size:9px;color:#94a3b8;text-align:center">{h}</div>
            ))}
          </div>
          {/* 요일 행 */}
          {data.map((row, dow) => (
            <div style="display:grid;grid-template-columns:28px repeat(24, 1fr);gap:2px;margin-bottom:2px">
              <div style="font-size:11px;color:#64748b;display:flex;align-items:center;justify-content:center;font-weight:600">
                {dayNames[dow]}
              </div>
              {row.map((val, h) => (
                <div
                  style={`background:${cellColor(val)};border-radius:3px;height:18px`}
                  title={`${dayNames[dow]}요일 ${h}시: ${val}건`}
                ></div>
              ))}
            </div>
          ))}
          {/* 범례 */}
          <div style="display:flex;align-items:center;gap:6px;margin-top:10px;font-size:11px;color:#94a3b8">
            <span>적음</span>
            <div style="width:14px;height:10px;background:#bfdbfe;border-radius:2px"></div>
            <div style="width:14px;height:10px;background:#3b82f6;border-radius:2px"></div>
            <div style="width:14px;height:10px;background:#1d4ed8;border-radius:2px"></div>
            <span>많음</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export const MetricCard: FC<{ label: string; value: string | number; sub?: string; color?: string }> = ({ label, value, sub, color }) => (
  <div style="background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;padding:16px;text-align:center">
    <div style="font-size:11px;color:#64748b;text-transform:uppercase;font-weight:600;letter-spacing:0.05em;margin-bottom:6px">{label}</div>
    <div style={`font-size:26px;font-weight:700;color:${color || '#1e293b'}`}>{value}</div>
    {sub && <div style="font-size:12px;color:#94a3b8;margin-top:4px">{sub}</div>}
  </div>
);

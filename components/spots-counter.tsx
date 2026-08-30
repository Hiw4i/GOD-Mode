const DEADLINE = new Date("2026-09-03T00:00:00+03:00").getTime();
const TOTAL = 1000;
const REMAINING = Math.max(0, Math.ceil((DEADLINE - new Date().getTime()) / 86_400_000));

export function SpotsCounter() {
  const progress = ((TOTAL - REMAINING) / TOTAL) * 100;

  return (
    <>
      <div className="spots-counter">
        <span className="spots-remaining">{REMAINING}</span>
        <span className="spots-label">/1000 spots left</span>
      </div>
      <div className="spots-bar" aria-hidden="true">
        <div className="spots-bar-fill" style={{ width: `${progress}%` }} />
      </div>
    </>
  );
}

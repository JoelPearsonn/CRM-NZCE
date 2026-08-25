export default function Loading() {
  return (
    <div className="desk-pending" data-testid="desk-pending" aria-busy="true" aria-live="polite">
      <div className="desk-pending-line desk-pending-kicker" />
      <div className="desk-pending-line desk-pending-title" />
      <div className="desk-pending-line desk-pending-copy" />
      <div className="desk-pending-cards">
        <div className="card desk-pending-card" />
        <div className="card desk-pending-card" />
        <div className="card desk-pending-card" />
      </div>
      <div className="card desk-pending-sheet" />
    </div>
  );
}

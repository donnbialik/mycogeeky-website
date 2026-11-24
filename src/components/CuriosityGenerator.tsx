import { useState } from 'react';
import activities from '../data/curiosityActivities.json';

export default function CuriosityGenerator() {
  const [index, setIndex] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const activity = activities[index];
  return <div className="curiosity-generator">
    <h3>{activity.title}</h3>
    <p className="curiosity-prompt">{activity.prompt}</p>
    {showInsight && <p className="curiosity-insight"><strong>The science behind it:</strong> {activity.insight}</p>}
    <div className="curiosity-controls">
      <button type="button" className="button primary" onClick={() => setShowInsight(value => !value)} aria-expanded={showInsight}>{showInsight ? 'Hide the science' : 'Reveal the science'}</button>
      <button type="button" className="button outline" onClick={() => {setIndex(i => (i + 1) % activities.length); setShowInsight(false);}}>Another mystery</button>
    </div>
    <p className="curiosity-disclaimer">No grades. No scores. Just a new way to notice.</p>
  </div>;
}

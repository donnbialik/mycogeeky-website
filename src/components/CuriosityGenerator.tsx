import { useState } from 'react';

const activities = [
  { title: 'The Alien Naturalist', prompt: 'Describe a mushroom as though you have never seen one before. Avoid the words mushroom, cap, stem, and gills.', insight: 'Careful observation starts before we reach for familiar labels.' },
  { title: 'The Beautifully Wrong Hypothesis', prompt: 'Invent a possible explanation for a mushroom’s shape. What observation could show that your explanation is wrong?', insight: 'A scientific explanation becomes useful when we can test it.' },
  { title: 'The Color Thief', prompt: 'Look closely at a mushroom and find three colors a photograph might miss. What could change the way those colors appear?', insight: 'Light, cameras, and perception all affect how we record color.' },
  { title: 'Twenty Questions, Zero Answers', prompt: 'Find a fungus and write five questions about it without answering any of them. Which question would you investigate first?', insight: 'Better questions often lead to better investigations.' },
  { title: 'The One-Square-Meter Universe', prompt: 'Choose one small patch of ground. How many different signs of fungal life or decomposition can you notice?', insight: 'Scale and attention change what we discover.' }
];

export default function CuriosityGenerator() {
  const [index, setIndex] = useState(0);
  const [showInsight, setShowInsight] = useState(false);
  const activity = activities[index];
  return <div className="curiosity-generator">
    <p className="eyebrow">THE CURIOSITY GENERATOR · A FIELD EXPERIMENT</p>
    <h3>{activity.title}</h3>
    <p className="curiosity-prompt">{activity.prompt}</p>
    {showInsight && <p className="curiosity-insight"><strong>The science behind it:</strong> {activity.insight}</p>}
    <div className="curiosity-controls">
      <button type="button" className={`button primary ${showInsight ? "" : "mv-discovery-invite"}`} onClick={() => setShowInsight(value => !value)} aria-expanded={showInsight}>{showInsight ? 'Hide the science' : <>Reveal the science <span className="mv-discovery-indicator" aria-hidden="true">→</span></>}</button>
      <button type="button" className="button outline" onClick={() => {setIndex(i => (i + 1) % activities.length); setShowInsight(false);}}>Another mystery</button>
    </div>
    <p className="curiosity-disclaimer">No grades. No scores. Just a new way to notice.</p>
  </div>;
}

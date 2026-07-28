import { useState } from 'react';
import ProjectList from '../components/ProjectList.jsx';

export default function Explore() {
  const [mode, setMode] = useState('public');

  const tabs = (
    <div className="tabs98" style={{ marginBottom: 12 }}>
      <div className={'tab98' + (mode === 'public' ? ' active' : '')} onClick={() => setMode('public')}>
        <i className="fa-solid fa-earth-americas icon-inline" />Keşfet
      </div>
      <div className={'tab98' + (mode === 'following' ? ' active' : '')} onClick={() => setMode('following')}>
        <i className="fa-solid fa-user-group icon-inline" />Takip Ettiklerim
      </div>
    </div>
  );

  return <ProjectList mode={mode} tabs={tabs} />;
}

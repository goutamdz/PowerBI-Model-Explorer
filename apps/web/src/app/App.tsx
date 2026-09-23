import { useEffect, useState } from 'react';
import ModelWorkspace from './ModelWorkspace';
import { CompareModels } from '../features/comparison/CompareModels';

type Page = 'visualizer' | 'compare';

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    window.location.hash === '#compare' ? 'compare' : 'visualizer',
  );

  useEffect(() => {
    function onHash() {
      setPage(window.location.hash === '#compare' ? 'compare' : 'visualizer');
    }
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  if (page === 'compare') {
    return <CompareModels onBack={() => { window.location.hash = ''; }} />;
  }

  return <ModelWorkspace onNavigateCompare={() => { window.location.hash = '#compare'; }} />;
}

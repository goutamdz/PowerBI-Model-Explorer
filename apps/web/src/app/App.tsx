import { useEffect, useState } from 'react';
import ModelWorkspace from './ModelWorkspace';
import { CompareModels } from '../features/comparison/CompareModels';

type Page = 'visualizer' | 'compare';

function pageFromHash(): Page {
  return window.location.hash === '#compare' ? 'compare' : 'visualizer';
}

export default function App() {
  const [page, setPage] = useState<Page>(pageFromHash);
  const [workspaceKey, setWorkspaceKey] = useState(0);

  useEffect(() => {
    function handleHashChange() {
      setPage(pageFromHash());
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  function openVisualizer() {
    window.location.hash = '';
  }

  function openComparison() {
    window.location.hash = '#compare';
  }

  if (page === 'compare') {
    return <CompareModels onBack={openVisualizer} />;
  }

  return (
    <ModelWorkspace
      key={workspaceKey}
      onNavigateHome={() => setWorkspaceKey((key) => key + 1)}
      onNavigateCompare={openComparison}
    />
  );
}

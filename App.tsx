import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AppShell } from './components/layout/AppShell';
import { TrendDiscovery } from './pages/TrendDiscovery';
import { PipelineMonitor } from './pages/PipelineMonitor';
import { ArticleEditor } from './pages/ArticleEditor';
import { Settings } from './pages/Settings';
import { SourceConfig } from './pages/SourceConfig';
import { ContentLibrary } from './pages/ContentLibrary';

const App: React.FC = () => {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            fontSize: '13px',
            fontWeight: 500,
            maxWidth: '400px',
          },
        }}
      />
      <HashRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<TrendDiscovery />} />
            <Route path="pipeline" element={<PipelineMonitor />} />
            <Route path="editor" element={<ArticleEditor />} />
            <Route path="settings" element={<Settings />} />
            <Route path="sources" element={<SourceConfig />} />
            <Route path="library" element={<ContentLibrary />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </>
  );
};

export default App;
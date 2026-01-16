import { useState } from 'react';
import { Layout } from '@/app/components/Layout';
import { Dashboard } from '@/app/components/Dashboard';
import { EndpointsList } from '@/app/components/EndpointsList';
import { EndpointDetail } from '@/app/components/EndpointDetail';
import { RequestLogs } from '@/app/components/RequestLogs';
import { ImportExport } from '@/app/components/ImportExport';
import { ApiPlayground } from '@/app/components/ApiPlayground';

type Tab = 'dashboard' | 'endpoints' | 'logs' | 'import-export' | 'playground' | 'settings';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedEndpointId, setSelectedEndpointId] = useState<string | null>(null);

  const handleSelectEndpoint = (endpointId: string) => {
    setSelectedEndpointId(endpointId);
  };

  const handleBackToList = () => {
    setSelectedEndpointId(null);
  };

  const renderContent = () => {
    if (activeTab === 'dashboard') {
      return <Dashboard onNavigate={(tab) => setActiveTab(tab as Tab)} />;
    }

    if (activeTab === 'endpoints') {
      if (selectedEndpointId) {
        return (
          <EndpointDetail
            endpointId={selectedEndpointId}
            onBack={handleBackToList}
          />
        );
      }
      return <EndpointsList onSelectEndpoint={handleSelectEndpoint} />;
    }

    if (activeTab === 'logs') {
      return <RequestLogs />;
    }

    if (activeTab === 'import-export') {
      return <ImportExport />;
    }

    if (activeTab === 'playground') {
      return <ApiPlayground />;
    }

    return null;
  };

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={(tab) => {
        setActiveTab(tab);
        setSelectedEndpointId(null);
      }}
    >
      {renderContent()}
    </Layout>
  );
}
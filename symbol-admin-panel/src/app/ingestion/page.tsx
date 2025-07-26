'use client';

import React, { useState } from 'react';
import { Button, Card, CardBody, Divider } from '@nextui-org/react';
import { useIngestedSymbols, useSetSymbols, useRemoveSymbol } from '../../hooks/useSymbols';
import { IngestedSymbol, SymbolUpdate } from '../../lib/types';
import IngestedSymbolsTable from '../../components/IngestedSymbolsTable';
import AddSymbolModal from '../../components/AddSymbolModal';
import BulkUploadModal from '../../components/BulkUploadModal';
import toast from 'react-hot-toast';
import { Plus, Upload, DatabaseZap } from 'lucide-react';
import withAuth from '@/components/withAuth';

function IngestionPage() {
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setBulkUploadModalOpen] = useState(false);

  const { data: ingestedSymbols, isLoading: isIngestedLoading } = useIngestedSymbols();
  const setSymbolsMutation = useSetSymbols();
  const removeSymbolMutation = useRemoveSymbol();

  const handleRemoveSymbol = (symbol: IngestedSymbol) => {
    toast.promise(
      removeSymbolMutation.mutateAsync(symbol),
      {
        loading: `Removing ${symbol.symbol}...`,
        success: `${symbol.symbol} removed successfully!`,
        error: `Error removing ${symbol.symbol}`,
      }
    );
  };

  const handleSetSymbols = (symbols: IngestedSymbol[]) => {
    toast.promise(
      setSymbolsMutation.mutateAsync(symbols),
      {
        loading: 'Updating ingested symbols...',
        success: 'Ingested symbols updated successfully!',
        error: 'Error updating ingested symbols',
      }
    );
  };
  
  const handleBulkUpload = (symbols: SymbolUpdate[]) => {
    const currentSymbols = ingestedSymbols || [];
    const newSymbols = [...currentSymbols, ...symbols];
    const uniqueSymbolsMap = new Map(newSymbols.map(item => [`${item.symbol}-${item.exchange}`, item]));
    const uniqueSymbols = Array.from(uniqueSymbolsMap.values());
    handleSetSymbols(uniqueSymbols);
    toast.success(`${symbols.length} symbols processed for bulk upload!`);
  };

  const handleAddSymbol = (symbol: IngestedSymbol) => {
    const currentSymbols = ingestedSymbols || [];
    const newSymbols = [...currentSymbols, symbol];
    const uniqueSymbolsMap = new Map(newSymbols.map(item => [`${item.symbol}-${item.exchange}`, item]));
    const uniqueSymbols = Array.from(uniqueSymbolsMap.values());
    handleSetSymbols(uniqueSymbols);
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight mb-6">Ingestion Management</h1>
      <Card className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 shadow-lg">
        <CardBody className="p-6 space-y-4">
          <div className="flex flex-wrap gap-4 justify-between items-center">
              <div>
                  <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
                      <DatabaseZap className="text-blue-400"/>
                      Ingested Symbols
                  </h2>
                  <p className="text-slate-400 text-sm mt-1">Symbols currently being ingested by the system.</p>
              </div>
              <div className="flex gap-4">
                  <Button color="primary" variant="ghost" onPress={() => setAddModalOpen(true)} startContent={<Plus size={16} />}>
                      Add Manually
                  </Button>
                  <Button color="primary" variant="solid" onPress={() => setBulkUploadModalOpen(true)} startContent={<Upload size={16} />}>
                      Bulk Upload
                  </Button>
              </div>
          </div>
          <Divider className="my-2 bg-slate-700"/>
          <IngestedSymbolsTable
            symbols={ingestedSymbols || []}
            isLoading={isIngestedLoading}
            onRemoveSymbol={handleRemoveSymbol}
          />
        </CardBody>
      </Card>

      <AddSymbolModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddSymbol}
      />
      <BulkUploadModal
        isOpen={isBulkUploadModalOpen}
        onClose={() => setBulkUploadModalOpen(false)}
        onUpload={handleBulkUpload}
      />
    </div>
  );
}

export default withAuth(IngestionPage);

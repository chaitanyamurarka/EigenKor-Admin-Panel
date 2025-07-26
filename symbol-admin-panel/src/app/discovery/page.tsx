'use client';

import React, { useState, useMemo } from 'react';
import { Input, Select, SelectItem, Card, CardBody } from '@nextui-org/react';
import { useSearchSymbols, useAddSymbol } from '../../hooks/useSymbols';
import { IngestedSymbol } from '../../lib/types';
import SymbolTable from '../../components/SymbolTable';
import toast from 'react-hot-toast';
import { useDebounce } from 'use-debounce';
import { Search } from 'lucide-react';
import withAuth from '@/components/withAuth';

function DiscoveryPage() {
  const [searchString, setSearchString] = useState('');
  const [debouncedSearchString] = useDebounce(searchString, 500);
  const [exchange, setExchange] = useState<string>('');
  const [securityType, setSecurityType] = useState<string>('');

  const searchEnabled = useMemo(() => debouncedSearchString.length > 2, [debouncedSearchString]);

  const { data: symbols, isLoading: isSearchLoading } = useSearchSymbols(
    { search_string: debouncedSearchString, exchange, security_type: securityType },
    searchEnabled
  );

  const addSymbolMutation = useAddSymbol();

  const handleAddSymbol = (symbol: IngestedSymbol) => {
    toast.promise(
      addSymbolMutation.mutateAsync(symbol),
      {
        loading: `Adding ${symbol.symbol}...`,
        success: `${symbol.symbol} added successfully!`,
        error: `Error adding ${symbol.symbol}`,
      }
    );
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-white tracking-tight mb-6">Symbol Discovery</h1>
      <Card className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/80 shadow-lg">
        <CardBody className="p-6 space-y-6">
          <div>
              <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
                  <Search className="text-blue-400" />
                  Find New Symbols
              </h2>
              <p className="text-slate-400 text-sm mt-1">Search by name, description, exchange, or type.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              isClearable
              aria-label="Search Symbol"
              placeholder="Search by symbol or description (3+ chars)..."
              value={searchString}
              onValueChange={setSearchString}
              className="md:col-span-2"
              classNames={{
                inputWrapper: [
                    "bg-slate-900/50",
                    "border",
                    "border-slate-700",
                    "group-data-[focus=true]:border-blue-500",
                    "group-data-[focus=true]:ring-2",
                    "group-data-[focus=true]:ring-blue-500/20",
                    "shadow-inner",
                    "hover:bg-slate-800",
                    "transition-all"
                ],
                input: "text-slate-200",
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Select
                  aria-label="Exchange"
                  placeholder="Exchange"
                  selectedKeys={exchange ? [exchange] : []}
                  onChange={(e) => setExchange(e.target.value)}
              >
                  {[{ key: "", value: "All Exchanges" }, { key: "NASDAQ", value: "NASDAQ" }, { key: "NYSE", value: "NYSE" }, { key: "CME", value: "CME" }].map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                          {option.value}
                      </SelectItem>
                  ))}
              </Select>
              <Select
                  aria-label="Security Type"
                  placeholder="Type"
                  selectedKeys={securityType ? [securityType] : []}
                  onChange={(e) => setSecurityType(e.target.value)}
              >
                  {[{ key: "", value: "All Types" }, { key: "STOCK", value: "Stock" }, { key: "FUTURES", value: "Futures" }].map((option) => (
                      <SelectItem key={option.key} value={option.key}>
                          {option.value}
                      </SelectItem>
                  ))}
              </Select>
            </div>
          </div>
          <SymbolTable
            symbols={symbols || []}
            onAddSymbol={handleAddSymbol}
            isLoading={isSearchLoading}
          />
        </CardBody>
      </Card>
    </div>
  );
}

export default withAuth(DiscoveryPage);

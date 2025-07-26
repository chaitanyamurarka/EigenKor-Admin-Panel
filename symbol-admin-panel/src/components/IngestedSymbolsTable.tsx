"use client";

import React from 'react';
import { Button, Tooltip, Spinner } from '@nextui-org/react';
import { Trash2 } from 'lucide-react';
import { IngestedSymbol } from '../lib/types';

interface IngestedSymbolsTableProps {
    symbols: IngestedSymbol[];
    isLoading: boolean;
    onRemoveSymbol: (symbol: IngestedSymbol) => void;
}

const securityTypeColors: Record<string, string> = {
    STOCK: 'bg-green-900/50 text-green-300 border border-green-700',
    FUTURES: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  };
  
const getSecurityTypeColor = (type?: string) => {
    if (!type) return 'bg-slate-700 text-slate-300';
    return securityTypeColors[type.toUpperCase()] || 'bg-slate-700 text-slate-300';
};

const IngestedSymbolsTable: React.FC<IngestedSymbolsTableProps> = ({ symbols, isLoading, onRemoveSymbol }) => {

    const handleRemoveSymbol = (symbolToRemove: IngestedSymbol) => {
        onRemoveSymbol(symbolToRemove);
    };

    return (
        <div className="overflow-x-auto">
            {/* The 'min-w-full' class has been removed below */}
            <table className="text-sm">
                <thead className="bg-slate-800">
                    <tr>
                        <th scope="col" className="text-left font-medium text-slate-400 px-6 py-3 uppercase">
                            Symbol
                        </th>
                        <th scope="col" className="text-left font-medium text-slate-400 px-6 py-3 uppercase">
                            Description
                        </th>
                        <th scope="col" className="text-left font-medium text-slate-400 px-6 py-3 uppercase">
                            Exchange
                        </th>
                        <th scope="col" className="text-left font-medium text-slate-400 px-6 py-3 uppercase">
                            Type
                        </th>
                        <th scope="col" className="text-right font-medium text-slate-400 px-6 py-3 uppercase">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {isLoading && (
                        <tr>
                            <td colSpan={5} className="text-center p-8">
                                <Spinner label="Loading Symbols..." color="primary"/>
                            </td>
                        </tr>
                    )}
                    {!isLoading && (!symbols || symbols.length === 0) && (
                        <tr>
                            <td colSpan={5} className="text-center p-8 text-slate-500">
                                No symbols are currently being ingested.
                            </td>
                        </tr>
                    )}
                    {!isLoading && symbols && symbols.map((item) => (
                        <tr key={`${item.symbol}-${item.exchange}`} className="border-b border-slate-700 hover:bg-slate-700/50">
                            <td className="px-6 py-3 font-semibold text-slate-200">
                                {item.symbol}
                            </td>
                            <td className="px-6 py-3 text-slate-400">{item.description}</td>
                            <td className="px-6 py-3 text-slate-300">
                                {item.exchange}
                            </td>
                            <td className="px-6 py-3">
                                <span className={`px-2.5 py-1 text-xs rounded-full ${getSecurityTypeColor(item.securityType)}`}>
                                {item.securityType || 'N/A'}
                                </span>
                            </td>
                            <td className="px-6 py-3 text-right">
                                <Tooltip content="Remove symbol" color="danger">
                                    <Button
                                        isIconOnly
                                        color="danger"
                                        variant="light"
                                        onPress={() => handleRemoveSymbol(item)}
                                        aria-label="Remove"
                                    >
                                        <Trash2 size={18} />
                                    </Button>
                                </Tooltip>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default IngestedSymbolsTable;
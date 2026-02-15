import React, { useState, useEffect } from 'react';
import { Plus, Trash2, AlertTriangle, Sparkles } from 'lucide-react';
import { Button } from './ui/Button';
import { SplitGroup } from '../types';
import { validateGroups } from '../utils/range';

interface GroupBuilderProps {
  groups: SplitGroup[];
  setGroups: React.Dispatch<React.SetStateAction<SplitGroup[]>>;
  totalPages: number;
  selectedPages: Set<number>;
  onClearSelection: () => void;
  allowOverlaps: boolean;
  setAllowOverlaps: (val: boolean) => void;
  onAutoGroup: () => void;
  isAnalyzing?: boolean;
}

export const GroupBuilder: React.FC<GroupBuilderProps> = ({ 
  groups, 
  setGroups, 
  totalPages,
  selectedPages,
  onClearSelection,
  allowOverlaps,
  setAllowOverlaps,
  onAutoGroup,
  isAnalyzing = false
}) => {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!allowOverlaps) {
      const validation = validateGroups(groups, totalPages);
      if (!validation.valid && validation.error) {
        setError(validation.error);
      } else {
        setError(null);
      }
    } else {
      setError(null);
    }
  }, [groups, totalPages, allowOverlaps]);

  const addGroup = () => {
    setGroups([...groups, { 
      id: crypto.randomUUID(), 
      name: `Part ${groups.length + 1}`, 
      range: '' 
    }]);
  };

  const removeGroup = (id: string) => {
    setGroups(groups.filter(g => g.id !== id));
  };

  const updateGroup = (id: string, field: keyof SplitGroup, value: string) => {
    setGroups(groups.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const assignSelectionToGroup = (id: string) => {
    if (selectedPages.size === 0) return;
    
    // Fix: Explicitly cast to number[] to handle potential type inference issues with Array.from on Set
    const sorted: number[] = (Array.from(selectedPages) as number[]).sort((a, b) => a - b);
    
    // Convert generic selection to range string (e.g. "1, 3-5")
    let rangeStr = '';
    let rangeStart = sorted[0];
    let prev = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== prev + 1) {
        rangeStr += rangeStart === prev ? `${rangeStart}, ` : `${rangeStart}-${prev}, `;
        rangeStart = sorted[i];
      }
      prev = sorted[i];
    }
    rangeStr += rangeStart === prev ? `${rangeStart}` : `${rangeStart}-${prev}`;

    setGroups(groups.map(g => g.id === id ? { ...g, range: rangeStr } : g));
    onClearSelection();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h3 className="text-lg font-medium text-slate-800">Custom Groups</h3>
        <div className="flex gap-2">
           <Button 
            onClick={onAutoGroup} 
            size="sm" 
            variant="secondary"
            className="gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
            disabled={isAnalyzing}
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {isAnalyzing ? 'Analyzing...' : 'AI Auto-Split'}
          </Button>
          <Button onClick={addGroup} size="sm" className="gap-2">
            <Plus className="w-4 h-4" /> Add Group
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
            <div className="flex-1 w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-500 mb-1">Group Name</label>
              <input
                type="text"
                value={group.name}
                onChange={(e) => updateGroup(group.id, 'name', e.target.value)}
                className="w-full px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Chapter 1"
              />
            </div>
            <div className="flex-[2] w-full sm:w-auto">
              <label className="block text-xs font-medium text-slate-500 mb-1">Pages (e.g. 1-5, 8)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={group.range}
                  onChange={(e) => updateGroup(group.id, 'range', e.target.value)}
                  className="flex-1 px-3 py-2 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1-5, 8-10"
                />
                <Button 
                  type="button" 
                  variant="secondary" 
                  size="sm"
                  onClick={() => assignSelectionToGroup(group.id)}
                  disabled={selectedPages.size === 0}
                  title="Assign currently selected pages from preview"
                >
                  Assign Selected
                </Button>
              </div>
            </div>
            <button
              onClick={() => removeGroup(group.id)}
              className="p-2 text-slate-400 hover:text-red-600 transition-colors mt-5"
              aria-label="Remove group"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          No groups created. Click "Add Group" or try "AI Auto-Split" to get started.
        </div>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <input
          type="checkbox"
          id="allowOverlaps"
          checked={allowOverlaps}
          onChange={(e) => setAllowOverlaps(e.target.checked)}
          className="rounded text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="allowOverlaps" className="text-sm text-slate-700">Allow pages to appear in multiple groups</label>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
};
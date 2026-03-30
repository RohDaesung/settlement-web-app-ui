'use client';

import { useState, useEffect } from 'react';
import {
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Folder,
  Edit2,
  Trash2,
} from 'lucide-react';
import { Vendor } from '@/lib/types';

interface FolderTreeProps {
  vendors: Vendor[];
  selectedVendorId?: string;
  selectedStyleId?: string;
  selectedRoundId?: string;
  onSelectVendor: (vendorId: string) => void;
  onSelectStyle: (vendorId: string, styleId: string) => void;
  onSelectRound: (vendorId: string, styleId: string, roundId: string) => void;
  searchQuery: string;
  onEditVendor: (vendorId: string, currentName: string) => void;
  onEditStyle: (styleId: string, currentName: string) => void;
  onEditRound: (roundId: string, currentName: string) => void;
  onDeleteVendor: (vendorId: string, vendorName?: string) => void;
  onDeleteStyle: (vendorId: string, styleId: string, styleName?: string) => void;
  onDeleteRound: (
    vendorId: string,
    styleId: string,
    roundId: string,
    roundName?: string
  ) => void;
}

export function FolderTree({
  vendors,
  selectedVendorId,
  selectedStyleId,
  selectedRoundId,
  onSelectVendor,
  onSelectStyle,
  onSelectRound,
  searchQuery,
  onEditVendor,
  onEditStyle,
  onEditRound,
  onDeleteVendor,
  onDeleteStyle,
  onDeleteRound,
}: FolderTreeProps) {
  const [expandedVendors, setExpandedVendors] = useState<Set<string>>(() => {
    const initial = new Set<string>(['vendor-01']);
    if (selectedVendorId) initial.add(selectedVendorId);
    return initial;
  });

  const [expandedStyles, setExpandedStyles] = useState<Set<string>>(() => {
    const initial = new Set<string>(['style-0130']);
    if (selectedStyleId) initial.add(selectedStyleId);
    return initial;
  });

  useEffect(() => {
    if (selectedVendorId && !expandedVendors.has(selectedVendorId)) {
      setExpandedVendors((prev) => new Set([...prev, selectedVendorId]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVendorId]);

  useEffect(() => {
    if (selectedStyleId && !expandedStyles.has(selectedStyleId)) {
      setExpandedStyles((prev) => new Set([...prev, selectedStyleId]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStyleId]);

  const toggleVendor = (vendorId: string) => {
    setExpandedVendors((prev) => {
      const next = new Set(prev);
      if (next.has(vendorId)) next.delete(vendorId);
      else next.add(vendorId);
      return next;
    });
  };

  const toggleStyle = (styleId: string) => {
    setExpandedStyles((prev) => {
      const next = new Set(prev);
      if (next.has(styleId)) next.delete(styleId);
      else next.add(styleId);
      return next;
    });
  };

  const filterMatches = (text: string) => {
    if (!searchQuery) return true;
    return text.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="w-full">
      {vendors.map((vendor) => (
        <div key={vendor.id} className="border-b border-border">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectVendor(vendor.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectVendor(vendor.id);
              }
            }}
            className={`w-full flex items-center gap-2 px-2 py-2 text-sm hover:bg-accent hover:text-accent-foreground rounded transition-colors group cursor-pointer ${
              selectedVendorId === vendor.id ? 'bg-accent text-accent-foreground' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleVendor(vendor.id);
              }}
              className="p-0 hover:bg-secondary rounded flex-shrink-0"
              aria-label={expandedVendors.has(vendor.id) ? '접기' : '펼치기'}
            >
              {expandedVendors.has(vendor.id) ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>

            <Folder className="w-4 h-4 flex-shrink-0" />

            <span className="truncate font-medium flex-1 text-left">
              {vendor.code} {vendor.name}
            </span>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditVendor(vendor.id, vendor.name);
                }}
                className="p-1 hover:bg-secondary rounded flex-shrink-0"
                title="거래처 이름 수정"
                aria-label="거래처 이름 수정"
              >
                <Edit2 className="w-3 h-3" />
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteVendor(vendor.id, vendor.name);
                }}
                className="p-1 hover:bg-red-100 text-red-600 rounded flex-shrink-0"
                title="거래처 삭제"
                aria-label="거래처 삭제"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          {expandedVendors.has(vendor.id) && (
            <div className="pl-4 bg-muted/20">
              {vendor.styles
                .filter(
                  (style) => filterMatches(style.code) || filterMatches(style.name)
                )
                .map((style) => (
                  <div key={style.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectStyle(vendor.id, style.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onSelectStyle(vendor.id, style.id);
                        }
                      }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-accent hover:text-accent-foreground rounded transition-colors group cursor-pointer ${
                        selectedStyleId === style.id && selectedVendorId === vendor.id
                          ? 'bg-accent text-accent-foreground'
                          : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStyle(style.id);
                        }}
                        className="p-0 hover:bg-secondary rounded flex-shrink-0"
                        aria-label={expandedStyles.has(style.id) ? '접기' : '펼치기'}
                      >
                        {expandedStyles.has(style.id) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <FolderOpen className="w-4 h-4 flex-shrink-0" />

                      <span className="truncate flex-1 text-left">
                        {style.code} {style.name}
                      </span>

                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditStyle(style.id, style.name);
                          }}
                          className="p-0.5 hover:bg-secondary rounded flex-shrink-0"
                          title="스타일 이름 수정"
                          aria-label="스타일 이름 수정"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteStyle(vendor.id, style.id, style.name);
                          }}
                          className="p-0.5 hover:bg-red-100 text-red-600 rounded flex-shrink-0"
                          title="스타일 삭제"
                          aria-label="스타일 삭제"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {expandedStyles.has(style.id) && (
                      <div className="pl-4 border-l border-border/30">
                        {style.rounds.map((round) => (
                          <div
                            key={round.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => onSelectRound(vendor.id, style.id, round.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelectRound(vendor.id, style.id, round.id);
                              }
                            }}
                            className={`w-full flex items-center gap-2 px-2 py-1 text-xs rounded transition-colors hover:bg-accent hover:text-accent-foreground group cursor-pointer ${
                              selectedRoundId === round.id
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <Folder className="w-3 h-3 flex-shrink-0" />

                            <span className="truncate flex-1 text-left">
                              {round.name}
                            </span>

                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onEditRound(round.id, round.name);
                                }}
                                className="p-0.5 hover:bg-secondary rounded flex-shrink-0"
                                title="차수 이름 수정"
                                aria-label="차수 이름 수정"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDeleteRound(vendor.id, style.id, round.id, round.name);
                                }}
                                className="p-0.5 hover:bg-red-100 text-red-600 rounded flex-shrink-0"
                                title="차수 삭제"
                                aria-label="차수 삭제"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
'use client';

import { useState } from 'react';
import { ChevronDown, Filter, TrendingUp, Clock, Heart } from 'lucide-react';

interface PostFiltersProps {
  onFilterChange: (filter: string) => void;
  onSortChange: (sort: string) => void;
}

export function PostFilters({ onFilterChange, onSortChange }: PostFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [activeSort, setActiveSort] = useState('recent');

  const sortOptions = [
    { value: 'recent', label: 'Most Recent', icon: Clock },
    { value: 'popular', label: 'Most Popular', icon: TrendingUp },
    { value: 'liked', label: 'Most Liked', icon: Heart },
  ];

  const handleSortChange = (sort: string) => {
    setActiveSort(sort);
    onSortChange(sort);
  };

  return (
    <div className="bg-white rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {sortOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                onClick={() => handleSortChange(option.value)}
                className={`flex items-center space-x-2 px-3 py-1 rounded-md transition-colors ${
                  activeSort === option.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
        >
          <Filter className="h-4 w-4" />
          <span className="text-sm">Filters</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              showFilters ? 'rotate-180' : ''
            }`}
          />
        </button>
      </div>

      {showFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Post Type
              </label>
              <select
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Posts</option>
                <option value="pinned">Pinned Only</option>
                <option value="with-media">With Media</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Range
              </label>
              <select
                onChange={(e) => onFilterChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Time</option>
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
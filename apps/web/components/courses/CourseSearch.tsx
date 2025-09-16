'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useDebounce } from 'use-debounce';
import { useCourses, CourseFilters } from '../../hooks/useCourses';
import { CourseCard } from './CourseCard';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/Select';
import { Badge } from '../ui/Badge';
import { Search, X, Filter, Clock, Tag, BookOpen } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ErrorBoundary, CourseListSkeleton, ErrorMessage, OfflineIndicator } from './CourseLoadingStates';

interface CourseSearchProps {
  communitySlug: string;
}

const difficulties = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'] as const;
const popularSearches = ['JavaScript', 'React', 'Python', 'Leadership', 'Productivity'];

// Simple highlighting component
const HighlightedText: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
  if (!highlight.trim()) return <span>{text}</span>;

  const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
          <mark key={index} className="bg-yellow-200 px-1 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
};

export function CourseSearch({ communitySlug }: CourseSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch] = useDebounce(searchTerm, 300);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('');
  const [minDuration, setMinDuration] = useState<number | ''>('');
  const [maxDuration, setMaxDuration] = useState<number | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [inputRef, setInputRef] = useState<HTMLInputElement | null>(null);

  const filters: CourseFilters = useMemo(() => ({
    search: debouncedSearch,
    difficulty: selectedDifficulty as any,
    minDuration: minDuration === '' ? undefined : minDuration,
    maxDuration: maxDuration === '' ? undefined : maxDuration,
    tags: selectedTags.length > 0 ? selectedTags : undefined,
    page: 1,
    limit: 12
  }), [debouncedSearch, selectedDifficulty, minDuration, maxDuration, selectedTags]);

  const { data: coursesData, isLoading, error, refetch } = useCourses(communitySlug, filters);
  const isOffline = typeof window !== 'undefined' ? !navigator.onLine : false;

  const courses = coursesData?.courses || [];
  const hasResults = courses.length > 0;
  const isSearching = debouncedSearch || Object.values(filters).some(v => v && (Array.isArray(v) ? v.length > 0 : true));

  const suggestions = useMemo(() => {
    if (!debouncedSearch) return [];
    return popularSearches.filter(tag => tag.toLowerCase().includes(debouncedSearch.toLowerCase()));
  }, [debouncedSearch]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // Trigger search on enter or button click
  }, []);

  const addTag = useCallback((tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag]);
    }
    setSearchTerm('');
  }, [selectedTags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setSelectedTags(prev => prev.filter(tag => tag !== tagToRemove));
  }, []);

  const clearFilters = useCallback(() => {
    setSelectedDifficulty('');
    setMinDuration('');
    setMaxDuration('');
    setSelectedTags([]);
  }, []);

  if (error) {
    return (
      <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
        <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
        <ErrorMessage title="Failed to load courses" message={error.message} onRetry={refetch} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary fallback={<ErrorMessage onRetry={refetch} />}>
      <OfflineIndicator isOffline={isOffline} onRetry={refetch} />
      <div className="space-y-6">
        {/* Search Bar */}
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <Input
                  ref={setInputRef}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search courses by title or description..."
                  className="flex-1 pr-10"
                />
                <Button type="submit" variant="outline" size="sm">
                  Search
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1"
                >
                  <Filter className="h-4 w-4" />
                  {showFilters ? 'Hide' : 'Filters'}
                </Button>
              </div>
            </form>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg">
                <ul className="py-1">
                  {suggestions.slice(0, 5).map((suggestion) => (
                    <li
                      key={suggestion}
                      onClick={() => addTag(suggestion)}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-gray-100"
                    >
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>

      {/* Filters */}
      {showFilters && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
                <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                  <SelectTrigger>
                    <SelectValue placeholder="All levels" />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map(diff => (
                      <SelectItem key={diff} value={diff}>{diff}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Min Duration</label>
                <Input
                  type="number"
                  value={minDuration}
                  onChange={(e) => setMinDuration(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="0 min"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Duration</label>
                <Input
                  type="number"
                  value={maxDuration}
                  onChange={(e) => setMaxDuration(e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="∞ min"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && searchTerm.trim()) {
                      addTag(searchTerm.trim());
                    }
                  }}
                  placeholder="Add tag (e.g., JavaScript)"
                />
              </div>
            </div>

            {selectedTags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {selectedTags.map(tag => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0"
                      onClick={() => removeTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}

            {(selectedDifficulty || minDuration || maxDuration || selectedTags.length > 0) && (
              <Button variant="outline" onClick={clearFilters} size="sm">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Popular Searches */}
      {!isSearching && (
        <Card>
          <CardContent className="p-4">
            <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
              <BookOpen className="h-5 w-5 text-primary-500" />
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularSearches.map(tag => (
                <Button
                  key={tag}
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tag)}
                  className="capitalize"
                >
                  {tag}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      <div>
        {isLoading ? (
          <CourseListSkeleton />
        ) : hasResults ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                communitySlug={communitySlug}
              />
            ))}
          </div>
        ) : isSearching ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No courses found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search terms or filters. You might find what you're looking for with a different query.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {popularSearches.slice(0, 3).map(tag => (
                  <Button
                    key={tag}
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(tag)}
                  >
                    Try "{tag}"
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Discover Courses</h3>
              <p className="text-gray-500">Start searching or browse popular topics to find courses that interest you.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  </ErrorBoundary>
  );
}
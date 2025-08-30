import { Tag } from 'lucide-react';

interface TagCloudProps {
  tags: { name: string; count: number }[];
  selectedTags: string[];
  onTagClick: (tag: string) => void;
}

export function TagCloud({ tags, selectedTags, onTagClick }: TagCloudProps) {
  if (tags.length === 0) return null;

  // Sort by count and take top 20
  const sortedTags = tags
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return (
    <div className="bg-white rounded-lg p-4">
      <h3 className="font-semibold flex items-center mb-3">
        <Tag className="h-5 w-5 mr-2" />
        Popular Tags
      </h3>

      <div className="flex flex-wrap gap-2">
        {sortedTags.map((tag) => (
          <button
            key={tag.name}
            onClick={() => onTagClick(tag.name)}
            className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-colors ${
              selectedTags.includes(tag.name)
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            #{tag.name}
            <span className="ml-1 text-xs opacity-60">({tag.count})</span>
          </button>
        ))}
      </div>
    </div>
  );
}
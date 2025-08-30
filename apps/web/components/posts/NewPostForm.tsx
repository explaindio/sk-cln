'use client';

import { useState } from 'react';
import { useCreatePost } from 'hooks/usePosts';
import { RichTextEditor } from 'components/editor/RichTextEditor';
import { Button } from 'components/ui/Button';
import { Input } from 'components/ui/Input';
import { Card, CardContent } from 'components/ui/Card';
import { X, Plus } from 'lucide-react';

interface NewPostFormProps {
  communityId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function NewPostForm({
  communityId,
  onSuccess,
  onCancel
}: NewPostFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  const createPost = useCreatePost();

  const handleSubmit = async () => {
    if (!content.trim()) return;

    await createPost.mutateAsync({
      communityId,
      title: title.trim() || undefined,
      content,
      tags,
    });

    onSuccess?.();
    setTitle('');
    setContent('');
    setTags([]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          <Input
            placeholder="Post title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <RichTextEditor
            content={content}
            onChange={setContent}
            placeholder="Share your thoughts..."
          />

          <div>
            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add tags..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleAddTag}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            {onCancel && (
              <Button
                variant="outline"
                onClick={onCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              isLoading={createPost.isPending}
              disabled={!content.trim()}
            >
              Post
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
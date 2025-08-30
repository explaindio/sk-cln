import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from '../posts/PostCard';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPost = {
  id: '1',
  title: 'Test Post',
  content: 'This is test content',
  author: {
    id: 'user1',
    username: 'testuser',
    avatar: '/avatar.jpg'
  },
  createdAt: '2024-01-01T00:00:00Z',
  likeCount: 5,
  commentCount: 3,
  userLiked: false
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

// Mock the hooks
jest.mock('@/hooks/usePosts', () => ({
  useLikePost: () => ({
    mutateAsync: jest.fn()
  }),
  useUnlikePost: () => ({
    mutateAsync: jest.fn()
  })
}));

// Mock the RichTextEditor component to avoid TipTap issues
jest.mock('@/components/editor/RichTextEditor', () => ({
  RichTextEditor: ({ content }: { content: string }) => (
    <div data-testid="rich-text-editor">{content}</div>
  )
}));

describe('PostCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders post content correctly', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(mockPost.title)).toBeInTheDocument();
    expect(screen.getByText(mockPost.author.username)).toBeInTheDocument();
  });

  it('displays correct like and comment counts', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows liked state correctly', () => {
    const likedPost = { ...mockPost, userLiked: true };

    render(
      <PostCard post={likedPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    const heartIcon = screen.getByRole('button', { name: /like/i }).querySelector('svg');
    expect(heartIcon).toHaveClass('fill-current');
  });

  it('renders author avatar correctly', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    const avatar = screen.getByAltText(mockPost.author.username);
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', expect.stringContaining('/avatar.jpg'));
  });

  it('renders fallback avatar when no avatar provided', () => {
    const postWithoutAvatar = {
      ...mockPost,
      author: { ...mockPost.author, avatar: undefined }
    };

    render(
      <PostCard post={postWithoutAvatar} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    const fallbackAvatar = document.querySelector('.bg-gray-300');
    expect(fallbackAvatar).toBeInTheDocument();
  });

  it('formats date correctly', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText(/ago/i)).toBeInTheDocument();
  });

  it('renders tags when provided', () => {
    const postWithTags = {
      ...mockPost,
      tags: ['javascript', 'react']
    };

    render(
      <PostCard post={postWithTags} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('#javascript')).toBeInTheDocument();
    expect(screen.getByText('#react')).toBeInTheDocument();
  });

  it('renders pinned badge when post is pinned', () => {
    const pinnedPost = {
      ...mockPost,
      isPinned: true
    };

    render(
      <PostCard post={pinnedPost} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('hides actions when showActions is false', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" showActions={false} />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('button', { name: /like/i })).not.toBeInTheDocument();
  });

  it('shows owner menu when isOwner is true', () => {
    render(
      <PostCard post={mockPost} communitySlug="test-community" isOwner={true} />,
      { wrapper: createWrapper() }
    );

    const menuButton = screen.getByRole('button', { name: /more/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('renders post without title', () => {
    const postWithoutTitle = { ...mockPost, title: undefined };

    render(
      <PostCard post={postWithoutTitle} communitySlug="test-community" />,
      { wrapper: createWrapper() }
    );

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CommunityCompetition } from './CommunityCompetition';

// Mock the api module
jest.mock('@/lib/api', () => ({
  api: {
    get: jest.fn(),
  },
}));

// Mock the Card components
jest.mock('@/components/ui/Card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: { children: React.ReactNode }) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: { children: React.ReactNode }) => <div data-testid="card-title">{children}</div>,
  CardContent: ({ children }: { children: React.ReactNode }) => <div data-testid="card-content">{children}</div>,
}));

const queryClient = new QueryClient();

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('CommunityCompetition', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when there are no competitions', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({ data: [] });

    const { container } = renderWithClient(<CommunityCompetition />);
    
    await waitFor(() => {
      expect(container.firstChild).toBeNull();
    });
  });

  it('renders correctly when there are competitions', async () => {
    const { api } = require('@/lib/api');
    api.get.mockResolvedValue({ 
      data: [
        { id: '1', name: 'Competition 1' },
        { id: '2', name: 'Competition 2' }
      ] 
    });

    renderWithClient(<CommunityCompetition />);
    
    await waitFor(() => {
      expect(screen.getByText('Competition 1')).toBeInTheDocument();
      expect(screen.getByText('Competition 2')).toBeInTheDocument();
    });
  });
});